'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionId } from '@/lib/session'
import { extractTasteGenes, generateDiverseRecommendations } from '@/lib/gemini'
import { enrichWithTMDB, filterDuplicateTitles } from '@/lib/utils'
import { upsertTasteGene, updateTasteProfile } from '@/lib/db-helpers'
import { revalidatePath } from 'next/cache'
import { THRESHOLDS } from '@/lib/constants'

export async function saveFeedbackAction(
  recommendationId: string,
  status: 'to_watch' | 'watched' | 'not_interested',
  rating?: string,
  reason?: string
) {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()
  
  // Check if feedback already exists
  const { data: existing } = await supabase
    .from('movie_feedback')
    .select('id')
    .eq('recommendation_id', recommendationId)
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('movie_feedback')
      .update({ status, rating, reason, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    
    if (error) {
      console.error('Error updating feedback:', error)
      return { success: false, error: error.message }
    }
  } else {
    // Insert new
    const { error } = await supabase.from('movie_feedback').insert({
      recommendation_id: recommendationId,
      session_id: sessionId,
      status,
      rating,
      reason
    })
    
    if (error) {
      console.error('Error inserting feedback:', error)
      return { success: false, error: error.message }
    }
  }

  // Extract taste genes if user watched and provided reasoning
  if (status === 'watched' && rating && reason) {
    try {
      // Get movie title
      const { data: rec } = await supabase
        .from('recommendations')
        .select('movie_title')
        .eq('id', recommendationId)
        .single()

      if (rec) {
        // Get existing genes
        const { data: existingGenes } = await supabase
          .from('taste_genes')
          .select('gene_name, strength, description, is_negative')
          .eq('session_id', sessionId)

        // Extract new genes
        const extraction = await extractTasteGenes(
          rec.movie_title,
          rating,
          reason,
          existingGenes || []
        )

        // Store or update genes using helper
        for (const gene of extraction.genes) {
          await upsertTasteGene(supabase, sessionId, {
            ...gene,
            source_movie_title: rec.movie_title,
            source_rating: rating
          })
        }

        // Update profile summary using helper
        await updateTasteProfile(supabase, sessionId, extraction.profile_update)
      }
    } catch (error) {
      console.error('Error extracting taste genes:', error)
      // Don't fail the whole operation if gene extraction fails
    }
  }

  revalidatePath('/recommendations')
  return { success: true }
}

export async function generateMoreRecommendationsAction() {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()

  // Get original movies from user input
  const { data: userMovies } = await supabase
    .from('user_movies')
    .select('*')
    .eq('session_id', sessionId)

  // Get ALL existing recommendations (to avoid duplicates)
  const { data: existingRecs } = await supabase
    .from('recommendations')
    .select('movie_title')
    .eq('session_id', sessionId)

  // Get all feedback (watched movies with ratings and not interested)
  const { data: feedbackData } = await supabase
    .from('movie_feedback')
    .select(`
      *,
      recommendations (movie_title)
    `)
    .eq('session_id', sessionId)
    .or('status.eq.watched,status.eq.not_interested')

  // Count only watched+rated movies for the threshold
  const ratedCount = feedbackData?.filter(f => f.status === 'watched' && f.rating).length || 0
  
  if (ratedCount < THRESHOLDS.MIN_RATINGS_FOR_MORE) {
    return { success: false, error: `Need at least ${THRESHOLDS.MIN_RATINGS_FOR_MORE} rated movies` }
  }

  // Get list of movie titles to avoid - ONLY watched/rated/dismissed, not unwatched queue
  const watchedMovieTitles = feedbackData?.map(f => f.recommendations.movie_title) || []
  const existingMovieTitles = [
    ...(userMovies?.map(m => m.movie_title) || []),
    ...watchedMovieTitles  // Only movies with feedback, not all recommendations
  ]

  // Get taste genes
  const { data: tasteGenes } = await supabase
    .from('taste_genes')
    .select('*')
    .eq('session_id', sessionId)
    .order('confidence_score', { ascending: false })

  const { data: profile } = await supabase
    .from('taste_profiles')
    .select('profile_summary')
    .eq('session_id', sessionId)
    .single()

  try {
    // Generate safe recommendations (10 movies)
    const safeRecs = await generateDiverseRecommendations(
      userMovies || [],
      tasteGenes || [],
      profile?.profile_summary || 'Emerging taste profile',
      existingMovieTitles,
      'safe'
    )

    // Generate experimental recommendations (5 movies)
    const expRecs = await generateDiverseRecommendations(
      userMovies || [],
      tasteGenes || [],
      profile?.profile_summary || 'Emerging taste profile',
      existingMovieTitles,
      'experimental'
    )

    // Combine and enrich
    const allRecs = [...safeRecs, ...expRecs]
    const enrichedAll = await enrichWithTMDB(allRecs, sessionId)

    // Final duplicate check before inserting
    const enriched = filterDuplicateTitles(enrichedAll, existingMovieTitles)

    // Remove temporary title_lower field
    const toInsert = enriched.map(({ title_lower, ...rest }) => rest)

    // Store new recommendations (only unique ones)
    if (toInsert.length === 0) {
      return { success: false, error: 'No new unique recommendations generated. All were duplicates.' }
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

