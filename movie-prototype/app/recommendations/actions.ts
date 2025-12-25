'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionId } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { THRESHOLDS } from '@/lib/constants'
import { generateNewRecommendations } from '@/lib/recommendations-service'

export async function saveFeedbackAction(
  recommendationId: string,
  status: 'to_watch' | 'watched' | 'not_interested' | 'watchlist',
  rating?: string,
  reason?: string
) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations/actions.ts:14',message:'saveFeedbackAction START',data:{recommendationId,status,rating,reason},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()
  
  // Save feedback to movie_feedback table (for tracking)
  const { data: existing } = await supabase
    .from('movie_feedback')
    .select('id')
    .eq('recommendation_id', recommendationId)
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    await supabase
      .from('movie_feedback')
      .update({ status, rating, reason, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('movie_feedback')
      .insert({
        recommendation_id: recommendationId,
        session_id: sessionId,
        status,
        rating,
        reason
      })
  }
  
  // Add to user_movies for future recommendations based on status:
  const { data: rec } = await supabase
    .from('recommendations')
    .select('movie_title')
    .eq('id', recommendationId)
    .single()

  if (rec) {
    // WATCHED with rating → Add to user_movies with that rating
    if (status === 'watched' && rating) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations/actions.ts:saveFeedback_beforeInsert',message:'About to insert WATCHED to user_movies',data:{movieTitle:rec.movie_title,sentiment:rating,reason:reason||''},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const { error: insertError } = await supabase.from('user_movies').insert({
        session_id: sessionId,
        movie_title: rec.movie_title,
        sentiment: rating, // 'loved', 'liked', 'meh', or 'hated'
        reason: reason || ''
      })
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations/actions.ts:saveFeedback_afterInsert',message:'Insert result for WATCHED',data:{movieTitle:rec.movie_title,error:insertError?.message||null,success:!insertError},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    }
    
    // WATCHLIST → Add to user_movies with 'watchlist' sentiment
    if (status === 'watchlist') {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations/actions.ts:62',message:'Adding WATCHLIST to user_movies',data:{movieTitle:rec.movie_title,sentiment:'watchlist'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      await supabase.from('user_movies').insert({
        session_id: sessionId,
        movie_title: rec.movie_title,
        sentiment: 'watchlist',
        reason: ''
      })
    }
    
    // NOT INTERESTED → Add to user_movies with 'hated' to avoid similar
    if (status === 'not_interested') {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations/actions.ts:72',message:'Adding NOT_INTERESTED to user_movies',data:{movieTitle:rec.movie_title,sentiment:'hated',reason:reason||'Not interested'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      await supabase.from('user_movies').insert({
        session_id: sessionId,
        movie_title: rec.movie_title,
        sentiment: 'hated',
        reason: reason || 'Not interested'
      })
    }
  }

  revalidatePath('/recommendations')
  return { success: true }
}

export async function removeFeedbackAction(recommendationId: string) {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()
  
  const { error } = await supabase
    .from('movie_feedback')
    .delete()
    .eq('recommendation_id', recommendationId)
    .eq('session_id', sessionId)

  if (error) {
    console.error('Error removing feedback:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/recommendations')
  return { success: true }
}

export async function clearUnwatchedRecommendationsAction() {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()

  // Get all recommendations for this session
  const { data: allRecs } = await supabase
    .from('recommendations')
    .select('id')
    .eq('session_id', sessionId)

  // Get recommendation IDs that have feedback
  const { data: feedbackRecs } = await supabase
    .from('movie_feedback')
    .select('recommendation_id')
    .eq('session_id', sessionId)

  // Build set of IDs to keep
  const feedbackIds = new Set(feedbackRecs?.map(f => f.recommendation_id) || [])
  const recsToDelete = allRecs?.filter(r => !feedbackIds.has(r.id)).map(r => r.id) || []

  // Delete unwatched recommendations
  if (recsToDelete.length > 0) {
    const { error } = await supabase
      .from('recommendations')
      .delete()
      .in('id', recsToDelete)

    if (error) {
      console.error('Error clearing unwatched:', error)
      return { success: false, error: 'Failed to clear old recommendations' }
    }
  }

  revalidatePath('/recommendations')
  return { success: true }
}

export async function generateMoreRecommendationsAction(userGuidance?: string) {
  // Don't clear old recommendations - keep them for duplicate prevention
  // The exclusion list in generateNewRecommendations will prevent re-recommendations
  return generateNewRecommendations({
    minRatingsRequired: THRESHOLDS.MIN_RATINGS_FOR_MORE,
    userGuidance
  })
}

export async function addWatchedMovieAction(
  title: string,
  sentiment: 'loved' | 'liked' | 'meh' | 'hated',
  reason: string,
  tmdbMovieId?: number,
  tmdbTvId?: number,
  mediaType?: 'movie' | 'tv'
) {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations/actions.ts:addWatchedMovie_beforeInsert',message:'About to add watched movie',data:{title,sentiment,tmdbMovieId,tmdbTvId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  // Insert into user_movies table
  const { error } = await supabase
    .from('user_movies')
    .insert({
      session_id: sessionId,
      movie_title: title,
      sentiment,
      reason,
      tmdb_movie_id: tmdbMovieId || null,
      tmdb_tv_id: tmdbTvId || null,
      media_type: mediaType || null
    })

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations/actions.ts:addWatchedMovie_afterInsert',message:'Insert result',data:{title,error:error?.message||null,success:!error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  if (error) {
    console.error('Error adding watched movie:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/recommendations')
  return { success: true }
}

export async function recalculateEarlierMatchesAction() {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()

  try {
    // Get current user taste profile
    const { getUserMovies } = await import('@/lib/db-helpers')
    const userMovies = await getUserMovies(supabase, sessionId)

    if (userMovies.length === 0) {
      return { success: false, error: 'No taste profile found. Add some movies first.' }
    }

    // Get the max batch_id to identify earlier recommendations
    const { data: maxBatch } = await supabase
      .from('recommendations')
      .select('batch_id')
      .eq('session_id', sessionId)
      .order('batch_id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const maxBatchId = maxBatch?.batch_id || 1

    // Fetch earlier recommendations (batch_id < max)
    const { data: earlierRecs, error: fetchError } = await supabase
      .from('recommendations')
      .select('id, movie_title, reasoning, match_explanation')
      .eq('session_id', sessionId)
      .lt('batch_id', maxBatchId)

    if (fetchError) {
      console.error('Error fetching recommendations:', fetchError)
      return { success: false, error: 'Failed to fetch recommendations' }
    }

    if (!earlierRecs || earlierRecs.length === 0) {
      return { success: false, error: 'No earlier recommendations to recalculate' }
    }

    // Call batch scoring function
    const { rescoreRecommendations } = await import('@/lib/gemini')
    const scoreMap = await rescoreRecommendations(earlierRecs, userMovies)

    // Update all recommendations with new scores
    const updatePromises = Array.from(scoreMap.entries()).map(([id, score]) =>
      supabase
        .from('recommendations')
        .update({ match_confidence: score })
        .eq('id', id)
    )

    const results = await Promise.all(updatePromises)
    
    // Check for any errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Some updates failed:', errors)
      return { 
        success: false, 
        error: `Failed to update ${errors.length} of ${scoreMap.size} recommendations` 
      }
    }

    revalidatePath('/recommendations')
    return { 
      success: true, 
      updated: scoreMap.size,
      message: `Updated ${scoreMap.size} match score${scoreMap.size === 1 ? '' : 's'} based on your current taste profile` 
    }
  } catch (error) {
    console.error('Error recalculating matches:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to recalculate match scores' 
    }
  }
}

