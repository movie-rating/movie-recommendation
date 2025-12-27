import './env'
import type { TMDBMovieDetails, TMDBTVDetails, MediaType } from './types'
import pLimit from 'p-limit'

const TMDB_KEY = process.env.TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'

// Limit concurrent TMDB requests to avoid rate limiting
const CONCURRENCY_LIMIT = 5
const limit = pLimit(CONCURRENCY_LIMIT)

type TMDBDetailsResult = {
  id: string
  details: TMDBMovieDetails | TMDBTVDetails | null
  error?: string
}

/**
 * Batch fetch TMDB details for multiple items with concurrency control
 * Limits parallel requests to avoid rate limiting from TMDB API
 */
export async function batchFetchTMDBDetails(
  items: Array<{
    id: string
    tmdbId: number | null | undefined
    mediaType: MediaType
  }>
): Promise<Map<string, TMDBMovieDetails | TMDBTVDetails | null>> {
  if (!TMDB_KEY) {
    console.error('[TMDB] API key not configured')
    return new Map(items.map(item => [item.id, null]))
  }

  const results = await Promise.allSettled(
    items.map(item =>
      limit(async (): Promise<TMDBDetailsResult> => {
        if (!item.tmdbId) {
          return { id: item.id, details: null }
        }

        try {
          const endpoint = item.mediaType === 'tv' ? 'tv' : 'movie'
          const res = await fetch(
            `${BASE}/${endpoint}/${item.tmdbId}?append_to_response=credits`,
            {
              headers: { Authorization: `Bearer ${TMDB_KEY}` },
              next: { revalidate: 3600 }
            }
          )

          if (!res.ok) {
            return { id: item.id, details: null, error: `HTTP ${res.status}` }
          }

          const data = await res.json()
          return { id: item.id, details: data }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return { id: item.id, details: null, error: message }
        }
      })
    )
  )

  const detailsMap = new Map<string, TMDBMovieDetails | TMDBTVDetails | null>()

  results.forEach((result, index) => {
    const itemId = items[index].id
    if (result.status === 'fulfilled') {
      detailsMap.set(itemId, result.value.details)
    } else {
      detailsMap.set(itemId, null)
    }
  })

  return detailsMap
}

/**
 * Search TMDB by title to get poster (for user movies without TMDB ID)
 */
export async function batchSearchForPosters(
  items: Array<{ id: string; title: string; mediaType?: MediaType }>
): Promise<Map<string, { poster_path: string | null; tmdb_id: number | null }>> {
  if (!TMDB_KEY) {
    return new Map(items.map(item => [item.id, { poster_path: null, tmdb_id: null }]))
  }

  const results = await Promise.allSettled(
    items.map(item =>
      limit(async () => {
        try {
          const params = new URLSearchParams({ query: item.title })
          const res = await fetch(`${BASE}/search/multi?${params}`, {
            headers: {
              'Authorization': `Bearer ${TMDB_KEY}`,
              'Content-Type': 'application/json'
            },
            next: { revalidate: 3600 }
          })

          if (!res.ok) {
            return { id: item.id, poster_path: null, tmdb_id: null }
          }

          const data = await res.json()
          const match = data.results?.find(
            (r: { media_type: string }) => r.media_type === 'movie' || r.media_type === 'tv'
          )

          return {
            id: item.id,
            poster_path: match?.poster_path || null,
            tmdb_id: match?.id || null
          }
        } catch {
          return { id: item.id, poster_path: null, tmdb_id: null }
        }
      })
    )
  )

  const posterMap = new Map<string, { poster_path: string | null; tmdb_id: number | null }>()

  results.forEach((result, index) => {
    const itemId = items[index].id
    if (result.status === 'fulfilled') {
      posterMap.set(itemId, {
        poster_path: result.value.poster_path,
        tmdb_id: result.value.tmdb_id
      })
    } else {
      posterMap.set(itemId, { poster_path: null, tmdb_id: null })
    }
  })

  return posterMap
}

export async function searchMedia(title: string, year?: number, mediaType?: 'movie' | 'tv') {
  if (!TMDB_KEY) {
    console.error('TMDB_API_KEY is not set in environment variables')
    return null
  }

  // If media type is specified, search that type
  if (mediaType) {
    const params = new URLSearchParams({
      query: title,
      ...(year && { [mediaType === 'movie' ? 'year' : 'first_air_date_year']: year.toString() })
    })
    
    const endpoint = mediaType === 'movie' ? 'search/movie' : 'search/tv'
    const res = await fetch(`${BASE}/${endpoint}?${params}`, {
      headers: {
        'Authorization': `Bearer ${TMDB_KEY}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 86400 }
    })
    
    if (!res.ok) {
      console.error(`TMDB API error for "${title}":`, res.status)
      return null
    }
    
    const data = await res.json()
    const result = data.results?.[0]
    return result ? { ...result, media_type: mediaType } : null
  }

  // Search both movies and TV shows, return best match
  const params = new URLSearchParams({ query: title })
  
  const res = await fetch(`${BASE}/search/multi?${params}`, {
    headers: {
      'Authorization': `Bearer ${TMDB_KEY}`,
      'Content-Type': 'application/json'
    },
    next: { revalidate: 86400 }
  })
  
  if (!res.ok) {
    console.error(`TMDB API error for "${title}":`, res.status)
    return null
  }
  
  const data = await res.json()
  // Filter to only movies and TV shows, return first match
  const result = data.results?.find((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
  return result || null
}

export function getPosterUrl(path: string | null) {
  if (!path) {
    // Return a data URL as fallback instead of external placeholder
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="750"%3E%3Crect width="500" height="750" fill="%231a1a1a"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="24" fill="%23666"%3ENo Poster%3C/text%3E%3C/svg%3E'
  }
  return `https://image.tmdb.org/t/p/w500${path}`
}
