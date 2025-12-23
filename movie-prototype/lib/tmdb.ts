const TMDB_KEY = process.env.TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'

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
