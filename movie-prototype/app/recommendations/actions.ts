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
      await supabase.from('user_movies').insert({
        session_id: sessionId,
        movie_title: rec.movie_title,
        sentiment: rating, // 'loved', 'liked', 'meh', or 'hated'
        reason: reason || ''
      })
    }
    
    // WATCHLIST → Add to user_movies with 'watchlist' sentiment
    if (status === 'watchlist') {
      await supabase.from('user_movies').insert({
        session_id: sessionId,
        movie_title: rec.movie_title,
        sentiment: 'watchlist',
        reason: ''
      })
    }
    
    // NOT INTERESTED → Add to user_movies with 'hated' to avoid similar
    if (status === 'not_interested') {
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
  // Step 1: Clear unwatched recommendations
  const clearResult = await clearUnwatchedRecommendationsAction()
  if (!clearResult.success) return clearResult
  
  // Step 2: Generate new recommendations (no gene update needed)
  return generateNewRecommendations({
    minRatingsRequired: THRESHOLDS.MIN_RATINGS_FOR_MORE,
    userGuidance
  })
}

