import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Duplicate filtering utility
// Filters out items whose title matches existing titles or duplicates within the batch
export function filterDuplicateTitles<T>(
  items: T[],
  existingTitles: string[],
  getTitle: (item: T) => string = (item) => {
    const anyItem = item as { title?: string; movie_title?: string }
    return anyItem.title || anyItem.movie_title || ''
  }
): T[] {
  const existingLower = existingTitles.map(t => t.toLowerCase())
  const seen = new Set<string>()

  return items.filter(item => {
    const title = getTitle(item).toLowerCase()

    // Check against existing titles
    if (existingLower.includes(title)) {
      return false
    }

    // Check against items we've already seen in this batch
    if (seen.has(title)) {
      return false
    }

    seen.add(title)
    return true
  })
}

// TMDB enrichment helper
export async function enrichWithTMDB(
  recommendations: Array<{ 
    title: string; 
    year?: number; 
    reasoning?: string;
    match_explanation?: string;
    confidence?: string;
    ai_confidence?: number;
    available_on?: string
  }>,
  sessionId: string,
  _tasteGenes: any[] = [], // Kept for backwards compatibility, not used
  isExperimental: boolean = false
) {
  const { searchMedia } = await import('./tmdb')
  
  const enriched = await Promise.all(
    recommendations.map(async (rec) => {
      const tmdb = await searchMedia(rec.title, rec.year)
      const mediaType = tmdb?.media_type || 'movie'
      
      // Use AI confidence directly (no gene matching needed)
      const matchConfidence = rec.ai_confidence || 75
      
      return {
        session_id: sessionId,
        media_type: mediaType,
        tmdb_movie_id: mediaType === 'movie' ? tmdb?.id : null,
        tmdb_tv_id: mediaType === 'tv' ? tmdb?.id : null,
        movie_title: rec.title,
        reasoning: rec.reasoning,
        match_explanation: rec.match_explanation,
        available_on: rec.available_on,
        poster_path: tmdb?.poster_path,
        number_of_seasons: tmdb?.number_of_seasons,
        number_of_episodes: tmdb?.number_of_episodes,
        is_experimental: isExperimental || rec.confidence === 'experimental',
        match_confidence: matchConfidence,
        title_lower: rec.title.toLowerCase()
      }
    })
  )
  
  return enriched
}
