'use server'
import { createClient } from './supabase/server'
import { getSessionId } from './session'
import { generateDiverseRecommendationsWithRetry } from './gemini'
import { enrichWithTMDB, filterDuplicateTitles } from './utils'
import { revalidatePath } from 'next/cache'
import { THRESHOLDS } from './constants'
import { 
  getUserMovies, 
  getTasteGenes, 
  getWatchedMoviesWithFeedback, 
  getTasteProfile 
} from './db-helpers'

type GenerateRecommendationsOptions = {
  minRatingsRequired?: number
  minGenesRequired?: number
  requireTasteGenes?: boolean
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

  // Fetch all required data using repository functions in parallel
  const dbStart = Date.now()
  const [userMovies, feedbackData, tasteGenes, profile] = await Promise.all([
    getUserMovies(supabase, sessionId),
    getWatchedMoviesWithFeedback(supabase, sessionId),
    getTasteGenes(supabase, sessionId),
    getTasteProfile(supabase, sessionId)
  ])
  console.log(`[Perf] DB: ${Date.now() - dbStart}ms`)

  // Validate requirements
  if (options.minRatingsRequired) {
    const ratedCount = feedbackData.filter(f => f.status === 'watched' && f.rating).length
    if (ratedCount < options.minRatingsRequired) {
      return { 
        success: false, 
        error: `Need at least ${options.minRatingsRequired} rated movies` 
      }
    }
  }

  if (options.minGenesRequired && tasteGenes.length < options.minGenesRequired) {
    return { 
      success: false, 
      error: 'Need more feedback to regenerate' 
    }
  }

  // Build list of titles to avoid
  const watchedMovieTitles = feedbackData.map(f => f.recommendations?.movie_title).filter(Boolean)
  const existingMovieTitles = [
    ...userMovies.map(m => m.movie_title),
    ...watchedMovieTitles
  ]

  try {
    // Generate both types in parallel using same base exclusion list
    const llmStart = Date.now()
    const [safeRecs, expRecs] = await Promise.all([
      generateDiverseRecommendationsWithRetry(
        userMovies,
        tasteGenes,
        profile?.profile_summary || 'Emerging taste profile',
        existingMovieTitles,
        'safe',
        options.userGuidance
      ),
      generateDiverseRecommendationsWithRetry(
        userMovies,
        tasteGenes,
        profile?.profile_summary || 'Emerging taste profile',
        existingMovieTitles,
        'experimental',
        options.userGuidance
      )
    ])
    const llmTotal = Date.now() - llmStart
    console.log(`[Perf] LLM Total: ${llmTotal}ms (${safeRecs.length} safe, ${expRecs.length} exp)`)

    // Enrich both in parallel
    const tmdbStart = Date.now()
    const [enrichedSafe, enrichedExp] = await Promise.all([
      enrichWithTMDB(safeRecs, sessionId, tasteGenes, false),
      enrichWithTMDB(expRecs, sessionId, tasteGenes, true)
    ])
    console.log(`[Perf] TMDB: ${Date.now() - tmdbStart}ms`)
    
    // Combine (any overlaps between safe/exp will be filtered in next step)
    const enrichedAll = [...enrichedSafe, ...enrichedExp]

    // Final duplicate check (filters overlaps + existing titles)
    const enriched = filterDuplicateTitles(enrichedAll, existingMovieTitles)

    // Remove temporary title_lower field
    const toInsert = enriched.map(({ title_lower, ...rest }) => rest)

    // Store recommendations if we have any
    if (toInsert.length === 0) {
      return { 
        success: false, 
        error: 'No new unique recommendations generated. All were duplicates.' 
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-service.ts:before-insert',message:'About to insert recs',data:{count:toInsert.length,firstRec:toInsert[0]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
    const { error } = await supabase.from('recommendations').insert(toInsert)
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-service.ts:insert-result',message:'Insert complete',data:{success:!error,error:error?.message,errorDetails:error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
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
