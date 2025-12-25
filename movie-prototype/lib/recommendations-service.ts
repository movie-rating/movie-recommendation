'use server'
import { createClient } from './supabase/server'
import { getSessionId } from './session'
import { generateRecommendationsFromMovies } from './gemini'
import { enrichWithTMDB, filterDuplicateTitles } from './utils'
import { revalidatePath } from 'next/cache'
import { THRESHOLDS } from './constants'
import { 
  getUserMovies, 
  getWatchedMoviesWithFeedback
} from './db-helpers'

type GenerateRecommendationsOptions = {
  minRatingsRequired?: number
  userGuidance?: string
}

/**
 * Shared logic for generating new recommendations based on user's taste profile
 * Used by both "Load More" and "Regenerate with Genes" features
 */
export async function generateNewRecommendations(
  options: GenerateRecommendationsOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now()
  
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()

  // Fetch required data
  const dbStart = Date.now()
  const [userMovies, feedbackData] = await Promise.all([
    getUserMovies(supabase, sessionId),
    getWatchedMoviesWithFeedback(supabase, sessionId)
  ])
  console.log(`[Perf] DB: ${Date.now() - dbStart}ms`)

  // Validate minimum ratings if required
  if (options.minRatingsRequired) {
    const ratedCount = feedbackData.filter(f => 
      f.status === 'watched' && f.rating
    ).length
    if (ratedCount < options.minRatingsRequired) {
      return { 
        success: false, 
        error: `Need at least ${options.minRatingsRequired} rated movies` 
      }
    }
  }

  // Build exclusion list: All movies from user_movies + any movie_feedback
  const feedbackMovieTitles = feedbackData
    .map(f => f.recommendations?.movie_title)
    .filter(Boolean)
  const existingMovieTitles = [
    ...userMovies.map(m => m.movie_title),
    ...feedbackMovieTitles
  ]

  try {
    // Generate recommendations from user's movie history
    const llmStart = Date.now()
    const { safe, experimental } = await generateRecommendationsFromMovies(
      userMovies,
      existingMovieTitles,
      options.userGuidance
    )
    console.log(`[Perf] LLM: ${Date.now() - llmStart}ms (${safe.length} safe, ${experimental.length} exp)`)

    // Enrich both types in parallel
    const tmdbStart = Date.now()
    const [enrichedSafe, enrichedExp] = await Promise.all([
      enrichWithTMDB(safe, sessionId, [], false),
      enrichWithTMDB(experimental, sessionId, [], true)
    ])
    console.log(`[Perf] TMDB: ${Date.now() - tmdbStart}ms`)
    
    const enrichedAll = [...enrichedSafe, ...enrichedExp]

    // Final duplicate check
    const enriched = filterDuplicateTitles(enrichedAll, existingMovieTitles)
    const toInsert = enriched.map(({ title_lower, ...rest }) => rest)

    if (toInsert.length === 0) {
      return { 
        success: false, 
        error: 'No new unique recommendations generated. All were duplicates.' 
      }
    }

    const { error } = await supabase.from('recommendations').insert(toInsert)
    
    if (error) {
      console.error('Error storing recommendations:', error)
      return { success: false, error: 'Failed to store recommendations' }
    }

    const totalTime = Date.now() - startTime
    console.log(`[Perf] Total: ${totalTime}ms | Inserted: ${toInsert.length} recommendations`)

    revalidatePath('/recommendations')
    return { success: true }
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate recommendations' 
    }
  }
}
