'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionId, clearSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { THRESHOLDS } from '@/lib/constants'
import { generateNewRecommendations } from '@/lib/recommendations-service'
import { saveUserPlatforms } from '@/lib/db-helpers'

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
  // Basic validation
  if (!title || title.length > 200) {
    return { success: false, error: 'Invalid movie title' };
  }
  if (!['loved', 'liked', 'meh', 'hated'].includes(sentiment)) {
    return { success: false, error: 'Invalid rating' };
  }
  if (reason && reason.length > 500) {
    return { success: false, error: 'Reason too long (max 500 characters)' };
  }

  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()
  
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

export async function updateUserPlatformsAction(platforms: string[]) {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  try {
    const supabase = await createClient()
    const result = await saveUserPlatforms(supabase, sessionId, platforms)
    
    if (!result.success) {
      return { success: false, error: result.error }
    }

    revalidatePath('/recommendations')
    return { success: true }
  } catch (error) {
    console.error('Error updating platforms:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update platforms' 
    }
  }
}

export async function startOverAction() {
  // Clear the session cookie to start fresh
  await clearSession()
  redirect('/onboarding')
}

