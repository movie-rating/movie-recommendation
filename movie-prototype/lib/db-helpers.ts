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

/**
 * Get list of streaming platforms user has access to
 */
export async function getUserPlatforms(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('user_streaming_platforms')
    .select('platform_name')
    .eq('session_id', sessionId)
  
  return data?.map(p => p.platform_name) || []
}

/**
 * Save user's streaming platform preferences
 * Replaces all existing platforms with new list
 */
export async function saveUserPlatforms(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  platforms: string[]
): Promise<{ success: boolean; error?: string }> {
  // Delete existing
  const { error: deleteError } = await supabase
    .from('user_streaming_platforms')
    .delete()
    .eq('session_id', sessionId)
  
  if (deleteError) {
    console.error('Error deleting platforms:', deleteError)
    return { success: false, error: deleteError.message }
  }
  
  // Insert new if any
  if (platforms.length > 0) {
    const { error: insertError } = await supabase
      .from('user_streaming_platforms')
      .insert(
        platforms.map(p => ({ 
          session_id: sessionId, 
          platform_name: p 
        }))
      )
    
    if (insertError) {
      console.error('Error inserting platforms:', insertError)
      return { success: false, error: insertError.message }
    }
  }
  
  return { success: true }
}

