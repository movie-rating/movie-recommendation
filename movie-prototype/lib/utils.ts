import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Duplicate filtering utility (used in multiple places)
export function filterDuplicateTitles<T extends { title?: string; movie_title?: string }>(
  items: T[],
  existingTitles: string[]
): T[] {
  const existingLower = existingTitles.map(t => t.toLowerCase())
  return items.filter(item => {
    const title = (item.title || item.movie_title || '').toLowerCase()
    return !existingLower.includes(title)
  })
}

// TMDB enrichment helper
export async function enrichWithTMDB(
  recommendations: Array<{ title: string; year?: number; reasoning?: string; confidence?: string }>,
  sessionId: string
) {
  const { searchMedia } = await import('./tmdb')
  
  const enriched = await Promise.all(
    recommendations.map(async (rec) => {
      const tmdb = await searchMedia(rec.title, rec.year)
      const mediaType = tmdb?.media_type || 'movie'
      
      return {
        session_id: sessionId,
        media_type: mediaType,
        tmdb_movie_id: mediaType === 'movie' ? tmdb?.id : null,
        tmdb_tv_id: mediaType === 'tv' ? tmdb?.id : null,
        movie_title: rec.title,
        reasoning: rec.reasoning,
        poster_path: tmdb?.poster_path,
        number_of_seasons: tmdb?.number_of_seasons,
        number_of_episodes: tmdb?.number_of_episodes,
        is_experimental: rec.confidence === 'experimental',
        title_lower: rec.title.toLowerCase()
      }
    })
  )
  
  return enriched
}
