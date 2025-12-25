'use server'
import { getOrCreateSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { generateRecommendationsFromMovies } from '@/lib/gemini'
import { enrichWithTMDB, filterDuplicateTitles } from '@/lib/utils'
import { getPosterUrl } from '@/lib/tmdb'

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
  }>
) {
  try {
    const sessionId = await getOrCreateSession()
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding/actions.ts:11',message:'submitMoviesAction START',data:{sessionId,movieCount:movies.length,moviesSample:movies.slice(0,2)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const supabase = await createClient()

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

    // 2. Get existing recommendations to avoid duplicates
    const { data: existingRecs } = await supabase
      .from('recommendations')
      .select('movie_title')
      .eq('session_id', sessionId)

    const existingTitles = [
      ...(existingRecs?.map(r => r.movie_title) || []),
      ...movies.map(m => m.title)
    ]

    // 3. Generate recommendations directly from movies
    const { safe, experimental } = await generateRecommendationsFromMovies(
      movies.map(m => ({
        movie_title: m.title,
        sentiment: m.sentiment,
        reason: m.reason
      })),
      existingTitles
    )

    // 4. Enrich with TMDB data
    const [enrichedSafe, enrichedExp] = await Promise.all([
      enrichWithTMDB(safe, sessionId, [], false),
      enrichWithTMDB(experimental, sessionId, [], true)
    ])

    const enrichedAll = [...enrichedSafe, ...enrichedExp]

    // 5. Filter duplicates and prepare for insert
    const enriched = filterDuplicateTitles(enrichedAll, existingTitles)
    const toInsert = enriched.map(({ title_lower, ...rest }) => rest)

    // 6. Store recommendations
    if (toInsert.length > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding/actions.ts:58',message:'Onboarding recommendations stored',data:{count:toInsert.length,titlesSample:toInsert.slice(0,3).map(t=>t.movie_title)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      await supabase.from('recommendations').insert(toInsert)
    }

    return { success: true }
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

