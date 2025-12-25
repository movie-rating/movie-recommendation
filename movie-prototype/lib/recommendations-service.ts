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
 * Shared logic for generating new recommendations based on user's movie ratings
 * Used by both "Load More" and "Regenerate" features
 */
export async function generateNewRecommendations(
  options: GenerateRecommendationsOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now()
  
  const sessionId = await getSessionId()
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-service.ts:27',message:'generateNewRecommendations START',data:{sessionId,options},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()

  // Fetch required data (including ALL existing recommendations to prevent duplicates)
  const dbStart = Date.now()
  const [userMovies, feedbackData, existingRecs] = await Promise.all([
    getUserMovies(supabase, sessionId),
    getWatchedMoviesWithFeedback(supabase, sessionId),
    supabase.from('recommendations').select('movie_title').eq('session_id', sessionId)
  ])
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-service.ts:38',message:'DB data fetched',data:{userMoviesCount:userMovies.length,feedbackCount:feedbackData.length,existingRecsCount:existingRecs.data?.length||0,userMoviesSample:userMovies.slice(0,2),feedbackSample:feedbackData.slice(0,2)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-service.ts:61',message:'Exclusion list built',data:{totalExclusions:existingMovieTitles.length,fromUserMovies:userMovies.length,fromFeedback:feedbackMovieTitles.length,fromExistingRecs:allExistingRecs.length,exclusionSample:existingMovieTitles.slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion

  try {
    // Generate recommendations from user's movie history
    const llmStart = Date.now()
    const { safe, experimental } = await generateRecommendationsFromMovies(
      userMovies,
      existingMovieTitles,
      options.userGuidance
    )
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-service.ts:87',message:'LLM generated recommendations',data:{safeCount:safe.length,experimentalCount:experimental.length,totalFromLLM:safe.length+experimental.length,safeSample:safe.slice(0,5),expSample:experimental.slice(0,3)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion
    console.log(`[Perf] LLM: ${Date.now() - llmStart}ms (${safe.length} safe, ${experimental.length} exp)`)

    // Enrich both types in parallel
    const tmdbStart = Date.now()
    const [enrichedSafe, enrichedExp] = await Promise.all([
      enrichWithTMDB(safe, sessionId, [], false),
      enrichWithTMDB(experimental, sessionId, [], true)
    ])
    console.log(`[Perf] TMDB: ${Date.now() - tmdbStart}ms`)
    
    const enrichedAll = [...enrichedSafe, ...enrichedExp]
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-service.ts:96',message:'After TMDB enrichment',data:{beforeEnrich:safe.length+experimental.length,afterEnrich:enrichedAll.length,dropped:safe.length+experimental.length-enrichedAll.length,enrichedSample:enrichedAll.slice(0,5).map(e=>e.movie_title)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H7'})}).catch(()=>{});
    // #endregion

    // Final duplicate check
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-service.ts:83-pre',message:'Before duplicate filtering',data:{enrichedCount:enrichedAll.length,enrichedTitles:enrichedAll.map(e=>e.movie_title),existingCount:existingMovieTitles.length,existingSample:existingMovieTitles.slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H8'})}).catch(()=>{});
    // #endregion
    const enriched = filterDuplicateTitles(enrichedAll, existingMovieTitles)
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-service.ts:83-post',message:'After duplicate filtering',data:{beforeFilter:enrichedAll.length,afterFilter:enriched.length,filtered:enrichedAll.length-enriched.length,enrichedSample:enriched.slice(0,3).map(e=>e.movie_title)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    const toInsert = enriched.map(({ title_lower, ...rest }) => rest)

    if (toInsert.length === 0) {
      return { 
        success: false, 
        error: 'No new unique recommendations generated. All were duplicates.' 
      }
    }

    const { error } = await supabase.from('recommendations').insert(toInsert)
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations-service.ts:93',message:'DB insert result',data:{insertCount:toInsert.length,error:error?.message||null,titlesSample:toInsert.slice(0,3).map(t=>t.movie_title)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
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

