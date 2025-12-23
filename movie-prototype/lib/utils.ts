import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Duplicate filtering utility
export function filterDuplicateTitles<T extends { title?: string; movie_title?: string }>(
  items: T[],
  existingTitles: string[]
): T[] {
  const existingLower = existingTitles.map(t => t.toLowerCase())
  const seen = new Set<string>()
  
  return items.filter(item => {
    const title = (item.title || item.movie_title || '').toLowerCase()
    
    // Check against existing titles
    if (existingLower.includes(title)) return false
    
    // Check against items we've already seen in this batch
    if (seen.has(title)) return false
    
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
    confidence?: string;
    ai_confidence?: number 
  }>,
  sessionId: string,
  tasteGenes: Array<{ 
    gene_name: string; 
    strength: number; 
    is_negative: boolean; 
    is_dealbreaker: boolean; 
    description: string 
  }> = [],
  isExperimental: boolean = false
) {
  const { searchMedia } = await import('./tmdb')
  const { calculateFinalMatchScore } = await import('./confidence-calculator')
  
  const enriched = await Promise.all(
    recommendations.map(async (rec) => {
      const tmdb = await searchMedia(rec.title, rec.year)
      const mediaType = tmdb?.media_type || 'movie'
      
      // Calculate final match confidence
      const matchConfidence = calculateFinalMatchScore(
        rec.ai_confidence || 75,
        rec.reasoning || '',
        tasteGenes,
        isExperimental || rec.confidence === 'experimental'
      )
      
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
        is_experimental: isExperimental || rec.confidence === 'experimental',
        match_confidence: matchConfidence,
        title_lower: rec.title.toLowerCase()
      }
    })
  )
  
  return enriched
}
