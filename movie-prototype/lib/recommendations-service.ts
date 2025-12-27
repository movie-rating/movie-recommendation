'use server'
import { createClient } from './supabase/server'
import { getSessionId } from './session'
import { generateRecommendationsFromMovies } from './gemini'
import { enrichWithTMDB, filterDuplicateTitles } from './utils'
import { revalidatePath } from 'next/cache'
import {
  getUserMovies,
  getWatchedMoviesWithFeedback,
  getUserPlatforms
} from './db-helpers'
import { type Result, ok, err, logError } from './errors'

type GenerateRecommendationsOptions = {
  minRatingsRequired?: number
  userGuidance?: string
}

/**
 * Shared logic for generating new recommendations based on user's movie ratings
 * Used by both "Load More" and "Regenerate" features
 */
export async function generateNewRecommendations(
  options: GenerateRecommendationsOptions = {}
): Promise<Result> {
  // Timing helpers
  const timings: Record<string, number> = {}
  const mark = (label: string) => {
    timings[label] = Date.now()
  }
  const measure = (label: string, startLabel: string) => {
    const duration = Date.now() - timings[startLabel]
    console.log(`[Perf] ${label}: ${duration}ms`)
    return duration
  }

  mark('total')

  const sessionId = await getSessionId()
  if (!sessionId) {
    return err('No session found. Please refresh the page.', 'AUTH_ERROR')
  }

  const supabase = await createClient()

  // Fetch required data (including ALL existing recommendations to prevent duplicates)
  mark('dbFetch')
  const [userMovies, feedbackData, existingRecs, userPlatforms] = await Promise.all([
    getUserMovies(supabase, sessionId),
    getWatchedMoviesWithFeedback(supabase, sessionId),
    supabase.from('recommendations').select('movie_title').eq('session_id', sessionId),
    getUserPlatforms(supabase, sessionId)
  ])
  const dbFetchTime = measure('DB Fetch', 'dbFetch')

  // Validate minimum ratings if required
  if (options.minRatingsRequired) {
    // Count rated movies from BOTH sources:
    // 1. Feedback on recommendations (movie_feedback table)
    const feedbackRatedCount = feedbackData.filter(f =>
      f.status === 'watched' && f.rating
    ).length

    // 2. User's own movies (user_movies table - from onboarding/Already Watched)
    // Filter out 'watchlist' sentiment as those haven't been watched/rated yet
    const userMoviesRatedCount = userMovies.filter(m =>
      m.sentiment !== 'watchlist'
    ).length

    const totalRatedCount = feedbackRatedCount + userMoviesRatedCount

    if (totalRatedCount < options.minRatingsRequired) {
      return err(
        `Rate at least ${options.minRatingsRequired} movies to get more recommendations`,
        'VALIDATION_ERROR'
      )
    }
  }

  // Build exclusion list: All movies from user_movies + any movie_feedback + ALL existing recommendations
  const feedbackMovieTitles = feedbackData
    .map(f => f.recommendations?.movie_title)
    .filter(Boolean)
  const allExistingRecs = existingRecs.data?.map(r => r.movie_title) || []
  const existingMovieTitles = [
    ...userMovies.map(m => m.movie_title),
    ...feedbackMovieTitles,
    ...allExistingRecs
  ]
  
  console.log(`[Context] User movies: ${userMovies.length}, Exclusions: ${existingMovieTitles.length}`)

  try {
    // Generate recommendations from user's movie history
    mark('llm')
    const { safe, experimental } = await generateRecommendationsFromMovies(
      userMovies,
      existingMovieTitles,
      options.userGuidance,
      userPlatforms
    )
    const llmTime = measure('Gemini LLM', 'llm')

    // Enrich both types in parallel
    mark('tmdb')
    const [enrichedSafe, enrichedExp] = await Promise.all([
      enrichWithTMDB(safe, sessionId, [], false),
      enrichWithTMDB(experimental, sessionId, [], true)
    ])
    const tmdbTime = measure('TMDB Enrichment', 'tmdb')
    
    const enrichedAll = [...enrichedSafe, ...enrichedExp]

    // Final duplicate check
    mark('filter')
    const enriched = filterDuplicateTitles(enrichedAll, existingMovieTitles)
    const filterTime = measure('Duplicate Filter', 'filter')
    
    // Get the current max batch_id for this session to generate the next batch
    mark('batchId')
    const { data: maxBatch } = await supabase
      .from('recommendations')
      .select('batch_id')
      .eq('session_id', sessionId)
      .order('batch_id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextBatchId = (maxBatch?.batch_id || 0) + 1
    measure('Get Batch ID', 'batchId')

    // Assign batch_id to all new recommendations (exclude title_lower used for dedup)
    const toInsert = enriched.map(({ title_lower: _titleLower, ...rest }) => ({
      ...rest,
      batch_id: nextBatchId
    }))

    if (toInsert.length === 0) {
      const totalTime = measure('TOTAL', 'total')
      console.log('\n=== PERFORMANCE BREAKDOWN ===')
      console.log(`No recommendations generated (all duplicates)`)
      console.log(`TOTAL: ${totalTime}ms\n`)

      return err(
        'No new unique recommendations found. Try adjusting your preferences.',
        'VALIDATION_ERROR'
      )
    }

    mark('insert')
    const { error: dbError } = await supabase.from('recommendations').insert(toInsert)
    const insertTime = measure('DB Insert', 'insert')

    if (dbError) {
      logError('generateNewRecommendations', dbError.message, { code: 'DATABASE_ERROR', cause: dbError })
      return err('Failed to save recommendations. Please try again.', 'DATABASE_ERROR')
    }

    const totalTime = measure('TOTAL', 'total')

    // Performance breakdown summary
    console.log('\n=== PERFORMANCE BREAKDOWN ===')
    console.log(`DB Fetch:         ${dbFetchTime.toString().padStart(6)}ms (${((dbFetchTime/totalTime)*100).toFixed(1)}%)`)
    console.log(`Gemini LLM:       ${llmTime.toString().padStart(6)}ms (${((llmTime/totalTime)*100).toFixed(1)}%)`)
    console.log(`TMDB Enrichment:  ${tmdbTime.toString().padStart(6)}ms (${((tmdbTime/totalTime)*100).toFixed(1)}%)`)
    console.log(`Duplicate Filter: ${filterTime.toString().padStart(6)}ms (${((filterTime/totalTime)*100).toFixed(1)}%)`)
    console.log(`DB Insert:        ${insertTime.toString().padStart(6)}ms (${((insertTime/totalTime)*100).toFixed(1)}%)`)
    console.log(`TOTAL:            ${totalTime.toString().padStart(6)}ms`)
    console.log(`Inserted:         ${toInsert.length} recommendations\n`)

    revalidatePath('/recommendations')
    return ok(undefined, `Generated ${toInsert.length} new recommendations`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate recommendations'
    logError('generateNewRecommendations', message, { code: 'API_ERROR', cause: error })
    return err(message, 'API_ERROR')
  }
}

