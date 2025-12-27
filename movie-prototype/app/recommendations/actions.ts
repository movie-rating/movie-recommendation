'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionId, clearSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { THRESHOLDS } from '@/lib/constants'
import { generateNewRecommendations } from '@/lib/recommendations-service'
import { saveUserPlatforms } from '@/lib/db-helpers'
import { type Result, ok, err, logError } from '@/lib/errors'

export async function saveFeedbackAction(
  recommendationId: string,
  status: 'to_watch' | 'watched' | 'not_interested' | 'watchlist',
  rating?: string,
  reason?: string
): Promise<Result> {
  const sessionId = await getSessionId()
  if (!sessionId) return err('No session found', 'AUTH_ERROR')

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
  return ok()
}

export async function removeFeedbackAction(recommendationId: string): Promise<Result> {
  const sessionId = await getSessionId()
  if (!sessionId) return err('No session found', 'AUTH_ERROR')

  const supabase = await createClient()
  
  const { error } = await supabase
    .from('movie_feedback')
    .delete()
    .eq('recommendation_id', recommendationId)
    .eq('session_id', sessionId)

  if (error) {
    logError('removeFeedbackAction', error.message, { code: 'DATABASE_ERROR', cause: error })
    return err('Failed to remove feedback', 'DATABASE_ERROR')
  }

  revalidatePath('/recommendations')
  return ok()
}

export async function clearUnwatchedRecommendationsAction(): Promise<Result> {
  const sessionId = await getSessionId()
  if (!sessionId) return err('No session found', 'AUTH_ERROR')

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
      logError('clearUnwatchedRecommendationsAction', error.message, { code: 'DATABASE_ERROR', cause: error })
      return err('Failed to clear old recommendations', 'DATABASE_ERROR')
    }
  }

  revalidatePath('/recommendations')
  return ok()
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
): Promise<Result> {
  // Basic validation
  if (!title || title.length > 200) {
    return err('Invalid movie title', 'VALIDATION_ERROR')
  }
  if (!['loved', 'liked', 'meh', 'hated'].includes(sentiment)) {
    return err('Invalid rating', 'VALIDATION_ERROR')
  }
  if (reason && reason.length > 500) {
    return err('Reason too long (max 500 characters)', 'VALIDATION_ERROR')
  }

  const sessionId = await getSessionId()
  if (!sessionId) return err('No session found', 'AUTH_ERROR')

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
    logError('addWatchedMovieAction', error.message, { code: 'DATABASE_ERROR', cause: error })
    return err('Failed to add movie', 'DATABASE_ERROR')
  }

  revalidatePath('/recommendations')
  return ok()
}

export async function recalculateEarlierMatchesAction(): Promise<Result<{ updated: number }>> {
  const sessionId = await getSessionId()
  if (!sessionId) return err('No session found', 'AUTH_ERROR')

  const supabase = await createClient()

  try {
    // Get current user taste profile
    const { getUserMovies } = await import('@/lib/db-helpers')
    const userMovies = await getUserMovies(supabase, sessionId)

    if (userMovies.length === 0) {
      return err('No taste profile found. Add some movies first.', 'VALIDATION_ERROR')
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
      logError('recalculateEarlierMatchesAction', fetchError.message, { code: 'DATABASE_ERROR', cause: fetchError })
      return err('Failed to fetch recommendations', 'DATABASE_ERROR')
    }

    if (!earlierRecs || earlierRecs.length === 0) {
      return err('No earlier recommendations to recalculate', 'NOT_FOUND')
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
      logError('recalculateEarlierMatchesAction', `${errors.length} updates failed`, { code: 'DATABASE_ERROR' })
      return err(`Failed to update ${errors.length} of ${scoreMap.size} recommendations`, 'DATABASE_ERROR')
    }

    revalidatePath('/recommendations')
    return ok(
      { updated: scoreMap.size },
      `Updated ${scoreMap.size} match score${scoreMap.size === 1 ? '' : 's'} based on your current taste profile`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to recalculate match scores'
    logError('recalculateEarlierMatchesAction', message, { code: 'API_ERROR', cause: error })
    return err(message, 'API_ERROR')
  }
}

export async function updateUserPlatformsAction(platforms: string[]): Promise<Result> {
  const sessionId = await getSessionId()
  if (!sessionId) return err('No session found', 'AUTH_ERROR')

  try {
    const supabase = await createClient()
    const result = await saveUserPlatforms(supabase, sessionId, platforms)

    if (!result.success) {
      return err(result.error || 'Failed to update platforms', 'DATABASE_ERROR')
    }

    revalidatePath('/recommendations')
    return ok()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update platforms'
    logError('updateUserPlatformsAction', message, { code: 'DATABASE_ERROR', cause: error })
    return err(message, 'DATABASE_ERROR')
  }
}

export async function startOverAction() {
  // Clear the session cookie to start fresh
  await clearSession()
  redirect('/onboarding')
}

