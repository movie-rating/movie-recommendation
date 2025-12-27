'use server'
import { getOrCreateSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { generateRecommendationsFromMovies } from '@/lib/gemini'
import { enrichWithTMDB, filterDuplicateTitles } from '@/lib/utils'
import { getPosterUrl } from '@/lib/tmdb'
import { saveUserPlatforms } from '@/lib/db-helpers'

export interface SearchResult {
  id: number
  title: string
  year: string
  mediaType: 'movie' | 'tv'
  posterUrl: string
}

export async function searchMediaAction(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) {
    return []
  }

  const TMDB_KEY = process.env.TMDB_API_KEY
  if (!TMDB_KEY) {
    console.error('TMDB_API_KEY is not set in environment variables')
    return []
  }

  try {
    const params = new URLSearchParams({ query })
    const res = await fetch(`https://api.themoviedb.org/3/search/multi?${params}`, {
      headers: {
        'Authorization': `Bearer ${TMDB_KEY}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!res.ok) {
      console.error(`TMDB API error for "${query}":`, res.status)
      return []
    }

    const data = await res.json()
    
    // Filter to only movies and TV shows, take top 10
    const results = (data.results || [])
      .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 10)
      .map((r: any) => ({
        id: r.id,
        title: r.media_type === 'movie' ? r.title : r.name,
        year: r.media_type === 'movie' 
          ? r.release_date?.split('-')[0] || 'Unknown'
          : r.first_air_date?.split('-')[0] || 'Unknown',
        mediaType: r.media_type as 'movie' | 'tv',
        posterUrl: getPosterUrl(r.poster_path)
      }))

    return results
  } catch (error) {
    console.error('Error searching media:', error)
    return []
  }
}

export async function submitMoviesAction(
  movies: Array<{ 
    title: string
    sentiment: string
    reason: string
    tmdbMovieId?: number
    tmdbTvId?: number
    mediaType?: 'movie' | 'tv'
  }>,
  platforms?: string[]
) {
  try {
    // Basic validation
    if (!Array.isArray(movies) || movies.length < 3 || movies.length > 10) {
      return { success: false, error: 'Please add 3-10 movies' };
    }

    for (const movie of movies) {
      // Trim whitespace and validate
      const trimmedTitle = movie.title?.trim() || '';
      const trimmedReason = movie.reason?.trim() || '';

      if (!trimmedTitle || trimmedTitle.length > 200) {
        return { success: false, error: 'Please enter a valid movie title' };
      }
      if (!['loved', 'liked', 'meh', 'hated'].includes(movie.sentiment)) {
        return { success: false, error: 'Invalid rating' };
      }
      if (!trimmedReason) {
        return { success: false, error: 'Please provide a reason for your rating' };
      }
      if (trimmedReason.length > 500) {
        return { success: false, error: 'Reason too long (max 500 characters)' };
      }

      // Update the movie object with trimmed values
      movie.title = trimmedTitle;
      movie.reason = trimmedReason;
    }

    const sessionId = await getOrCreateSession()
    const supabase = await createClient()

    // Track warnings to surface to user
    let platformWarning: string | null = null

    // 1. Store user movies
    const { error: insertError } = await supabase
      .from('user_movies')
      .insert(
        movies.map(m => ({
          session_id: sessionId,
          movie_title: m.title,
          sentiment: m.sentiment,
          reason: m.reason,
          tmdb_movie_id: m.tmdbMovieId || null,
          tmdb_tv_id: m.tmdbTvId || null,
          media_type: m.mediaType || null
        }))
      )

    if (insertError) throw insertError

    // 2. Save platforms if provided - track failures to warn user
    if (platforms && platforms.length > 0) {
      try {
        const result = await saveUserPlatforms(supabase, sessionId, platforms)
        if (!result.success) {
          console.error('Failed to save platforms:', result.error)
          platformWarning = 'Your streaming platform preferences could not be saved. Recommendations will not be filtered by platform.'
        }
      } catch (error) {
        console.error('Error saving platforms:', error)
        platformWarning = 'Your streaming platform preferences could not be saved. Recommendations will not be filtered by platform.'
      }
    }

    // 3. Get existing recommendations to avoid duplicates
    const { data: existingRecs } = await supabase
      .from('recommendations')
      .select('movie_title')
      .eq('session_id', sessionId)

    const existingTitles = [
      ...(existingRecs?.map(r => r.movie_title) || []),
      ...movies.map(m => m.title)
    ]

    // 4. Generate recommendations directly from movies with platform constraint
    const { safe, experimental } = await generateRecommendationsFromMovies(
      movies.map(m => ({
        movie_title: m.title,
        sentiment: m.sentiment,
        reason: m.reason
      })),
      existingTitles,
      undefined,
      platforms
    )

    // 5. Enrich with TMDB data
    const [enrichedSafe, enrichedExp] = await Promise.all([
      enrichWithTMDB(safe, sessionId, [], false),
      enrichWithTMDB(experimental, sessionId, [], true)
    ])

    const enrichedAll = [...enrichedSafe, ...enrichedExp]

    // 6. Filter duplicates and prepare for insert
    const enriched = filterDuplicateTitles(enrichedAll, existingTitles)
    const toInsert = enriched.map(({ title_lower, ...rest }) => rest)

    // 7. Store recommendations - fail if none were successfully enriched
    if (toInsert.length === 0) {
      return {
        success: false,
        error: 'Unable to generate recommendations. Please try again.'
      }
    }

    const { error: insertError2 } = await supabase.from('recommendations').insert(toInsert)
    if (insertError2) {
      console.error('Error storing recommendations:', insertError2)
      return {
        success: false,
        error: 'Failed to save recommendations. Please try again.'
      }
    }

    return { success: true, warning: platformWarning }
  } catch (error) {
    console.error('Error generating recommendations:', error)
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to generate recommendations'
    
    if (error instanceof Error) {
      if (error.message.includes('API') || error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to AI service. Please check your API keys and try again.'
      } else if (error.message.includes('parse') || error.message.includes('JSON')) {
        errorMessage = 'Received invalid response from AI. Please try again.'
      } else if (error.message.includes('TMDB')) {
        errorMessage = 'Unable to fetch movie posters. Recommendations generated but images may be missing.'
      } else {
        errorMessage = error.message
      }
    }
    
    return { 
      success: false, 
      error: errorMessage
    }
  }
}

