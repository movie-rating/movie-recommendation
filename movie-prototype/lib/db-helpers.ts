import { createClient } from './supabase/server'

/**
 * Database repository functions to reduce query duplication
 */

export async function getUserMovies(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
) {
  const { data } = await supabase
    .from('user_movies')
    .select('*')
    .eq('session_id', sessionId)
  
  return data || []
}

export async function getExistingRecommendations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
) {
  const { data } = await supabase
    .from('recommendations')
    .select('movie_title')
    .eq('session_id', sessionId)
  
  return data || []
}

export async function getWatchedMoviesWithFeedback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
) {
  const { data } = await supabase
    .from('movie_feedback')
    .select(`
      *,
      recommendations (movie_title)
    `)
    .eq('session_id', sessionId)
    .or('status.eq.watched,status.eq.not_interested,status.eq.watchlist')
  
  return data || []
}

