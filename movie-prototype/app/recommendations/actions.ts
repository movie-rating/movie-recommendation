'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionId } from '@/lib/session'
import { extractTasteGenes } from '@/lib/gemini'
import { upsertTasteGene, updateTasteProfile } from '@/lib/db-helpers'
import { revalidatePath } from 'next/cache'
import { THRESHOLDS } from '@/lib/constants'
import { generateNewRecommendations } from '@/lib/recommendations-service'

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

  // Extract taste genes if user watched (reasoning is helpful but not required)
  if (status === 'watched' && rating) {
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

        // Extract new genes (will work even with empty reasoning)
        const extraction = await extractTasteGenes(
          rec.movie_title,
          rating,
          reason || '',
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
  return generateNewRecommendations({
    minRatingsRequired: THRESHOLDS.MIN_RATINGS_FOR_MORE
  })
}

