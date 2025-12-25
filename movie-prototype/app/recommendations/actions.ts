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
      fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommendations/actions.ts:52',message:'Adding WATCHED to user_movies',data:{movieTitle:rec.movie_title,sentiment:rating,reason:reason||''},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      await supabase.from('user_movies').insert({
        session_id: sessionId,
        movie_title: rec.movie_title,
        sentiment: rating, // 'loved', 'liked', 'meh', or 'hated'
        reason: reason || ''
      })
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

