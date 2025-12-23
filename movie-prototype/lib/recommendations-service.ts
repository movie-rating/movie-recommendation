'use server'
import { createClient } from './supabase/server'
import { getSessionId } from './session'
import { generateDiverseRecommendations } from './gemini'
import { enrichWithTMDB, filterDuplicateTitles } from './utils'
import { revalidatePath } from 'next/cache'
import { THRESHOLDS } from './constants'
import { 
  getUserMovies, 
  getTasteGenes, 
  getWatchedMoviesWithFeedback, 
  getTasteProfile 
} from './db-helpers'

type GenerateRecommendationsOptions = {
  minRatingsRequired?: number
  minGenesRequired?: number
  requireTasteGenes?: boolean
}

/**
 * Shared logic for generating new recommendations based on user's taste profile
 * Used by both "Load More" and "Regenerate with Genes" features
 */
export async function generateNewRecommendations(
  options: GenerateRecommendationsOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()

  // Fetch all required data using repository functions
  const userMovies = await getUserMovies(supabase, sessionId)
  const feedbackData = await getWatchedMoviesWithFeedback(supabase, sessionId)
  const tasteGenes = await getTasteGenes(supabase, sessionId)
  const profile = await getTasteProfile(supabase, sessionId)

  // Validate requirements
  if (options.minRatingsRequired) {
    const ratedCount = feedbackData.filter(f => f.status === 'watched' && f.rating).length
    if (ratedCount < options.minRatingsRequired) {
      return { 
        success: false, 
        error: `Need at least ${options.minRatingsRequired} rated movies` 
      }
    }
  }

  if (options.minGenesRequired && tasteGenes.length < options.minGenesRequired) {
    return { 
      success: false, 
      error: 'Need more feedback to regenerate' 
    }
  }

  // Build list of titles to avoid
  const watchedMovieTitles = feedbackData.map(f => f.recommendations?.movie_title).filter(Boolean)
  const existingMovieTitles = [
    ...userMovies.map(m => m.movie_title),
    ...watchedMovieTitles
  ]

  try {
    // Generate safe recommendations first
    const safeRecs = await generateDiverseRecommendations(
      userMovies,
      tasteGenes,
      profile?.profile_summary || 'Emerging taste profile',
      existingMovieTitles,
      'safe'
    )

    // Enrich safe recs
    const enrichedSafe = await enrichWithTMDB(safeRecs, sessionId, tasteGenes, false)
    
    // Add safe rec titles to exclusion list for experimental batch
    const safeTitles = enrichedSafe.map(r => r.movie_title)
    const extendedExclusions = [...existingMovieTitles, ...safeTitles]

    // Generate experimental recommendations (now aware of safe recs)
    const expRecs = await generateDiverseRecommendations(
      userMovies,
      tasteGenes,
      profile?.profile_summary || 'Emerging taste profile',
      extendedExclusions,
      'experimental'
    )
    
    // Enrich experimental recs
    const enrichedExp = await enrichWithTMDB(expRecs, sessionId, tasteGenes, true)
    
    // Combine (no internal duplicates now)
    const enrichedAll = [...enrichedSafe, ...enrichedExp]

    // Final duplicate check
    const enriched = filterDuplicateTitles(enrichedAll, existingMovieTitles)

    // Remove temporary title_lower field
    const toInsert = enriched.map(({ title_lower, ...rest }) => rest)

    // Store recommendations if we have any
    if (toInsert.length === 0) {
      return { 
        success: false, 
        error: 'No new unique recommendations generated. All were duplicates.' 
      }
    }

    const { error } = await supabase.from('recommendations').insert(toInsert)
    
    if (error) {
      console.error('Error storing recommendations:', error)
      return { success: false, error: 'Failed to store recommendations' }
    }

    revalidatePath('/recommendations')
    return { success: true }
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate recommendations' 
    }
  }
}
