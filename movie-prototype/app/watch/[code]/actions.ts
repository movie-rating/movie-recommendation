'use server'

import { createClient } from '@/lib/supabase/server'

export interface QuickMovie {
  title: string
  sentiment: 'loved' | 'liked' | 'meh' | 'hated'
  reason: string
  tmdbMovieId?: number
  tmdbTvId?: number
  mediaType?: 'movie' | 'tv'
}

export async function saveGuestMoviesAction(
  sessionId: string,
  movies: QuickMovie[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate
    if (!Array.isArray(movies) || movies.length < 3) {
      return { success: false, error: 'Please rate at least 3 movies' }
    }

    for (const movie of movies) {
      const trimmedTitle = movie.title?.trim() || ''
      const trimmedReason = movie.reason?.trim() || ''

      if (!trimmedTitle) {
        return { success: false, error: 'Please enter a movie title' }
      }
      if (!['loved', 'liked', 'meh', 'hated'].includes(movie.sentiment)) {
        return { success: false, error: 'Invalid rating' }
      }
      if (!trimmedReason) {
        return { success: false, error: 'Please provide a reason for your rating' }
      }
    }

    const supabase = await createClient()

    // Store user movies
    const { error: insertError } = await supabase
      .from('user_movies')
      .insert(
        movies.map(m => ({
          session_id: sessionId,
          movie_title: m.title.trim(),
          sentiment: m.sentiment,
          reason: m.reason.trim(),
          tmdb_movie_id: m.tmdbMovieId || null,
          tmdb_tv_id: m.tmdbTvId || null,
          media_type: m.mediaType || null
        }))
      )

    if (insertError) {
      console.error('Error saving guest movies:', insertError)
      return { success: false, error: 'Failed to save your preferences' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in saveGuestMoviesAction:', error)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
