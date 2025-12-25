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
  const filtered: string[] = []
  const passed: string[] = []
  
  // #region agent log
  const firstThreeItemTitles = items.slice(0,3).map(i=>i.title||i.movie_title||'');
  const checkForDupes = firstThreeItemTitles.map(title => ({
    original: title,
    lower: title.toLowerCase(),
    inExisting: existingTitles.includes(title),
    inExistingLower: existingLower.includes(title.toLowerCase())
  }));
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils.ts:filter-input',message:'Filter input',data:{itemsCount:items.length,itemTitles:items.map(i=>i.title||i.movie_title),existingCount:existingTitles.length,checkForDupes:checkForDupes,existingAllTitles:existingTitles},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H8'})}).catch(()=>{});
  // #endregion
  
  const result = items.filter(item => {
    const title = (item.title || item.movie_title || '').toLowerCase()
    
    // Check against existing titles
    if (existingLower.includes(title)) {
      // #region agent log
      filtered.push(title)
      // #endregion
      return false
    }
    
    // Check against items we've already seen in this batch
    if (seen.has(title)) {
      // #region agent log
      filtered.push(title)
      // #endregion
      return false
    }
    
    seen.add(title)
    passed.push(title)
    return true
  })
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils.ts:filter-output',message:'Filter output',data:{filteredCount:filtered.length,filteredTitles:filtered,passedCount:passed.length,passedTitles:passed},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H8'})}).catch(()=>{});
  // #endregion
  
  return result
}

// TMDB enrichment helper
export async function enrichWithTMDB(
  recommendations: Array<{ 
    title: string; 
    year?: number; 
    reasoning?: string;
    match_explanation?: string;
    confidence?: string;
    ai_confidence?: number 
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
