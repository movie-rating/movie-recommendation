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
  status: 'to_watch' | 'watched' | 'not_interested' | 'watchlist',
  rating?: string,
  reason?: string
) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:10',message:'saveFeedbackAction called',data:{recommendationId,status,hasRating:!!rating},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
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

  let feedbackId: string

  if (existing) {
    feedbackId = existing.id
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
    const { data: newFeedback, error } = await supabase.from('movie_feedback')
      .insert({
        recommendation_id: recommendationId,
        session_id: sessionId,
        status,
        rating,
        reason
        // Note: genes_extracted will be updated separately if genes are extracted
      })
      .select('id')
      .single()
    
    if (error) {
      console.error('Error inserting feedback:', error)
      return { success: false, error: error.message }
    }
    
    feedbackId = newFeedback!.id
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:62',message:'Feedback saved',data:{feedbackId,status,willExtractGenes:status==='watched'&&!!rating},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  // Extract taste genes asynchronously (don't block the UI)
  if (status === 'watched' && rating) {
    // Fire and forget - extract genes in background
    (async () => {
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

          // Mark feedback as processed for genes (only if successful)
          await supabase
            .from('movie_feedback')
            .update({ genes_extracted: true })
            .eq('id', feedbackId)
        }
      } catch (error) {
        console.error('Error extracting taste genes:', error)
        // Don't mark as processed if extraction failed - allow retry later
      }
    })()
  }

  revalidatePath('/recommendations')
  return { success: true }
}

export async function removeFeedbackAction(recommendationId: string) {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()
  
  const { error } = await supabase
    .from('movie_feedback')
    .delete()
    .eq('recommendation_id', recommendationId)
    .eq('session_id', sessionId)

  if (error) {
    console.error('Error removing feedback:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/recommendations')
  return { success: true }
}

export async function clearUnwatchedRecommendationsAction() {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()

  // Get all recommendations for this session
  const { data: allRecs } = await supabase
    .from('recommendations')
    .select('id')
    .eq('session_id', sessionId)

  // Get recommendation IDs that have feedback
  const { data: feedbackRecs } = await supabase
    .from('movie_feedback')
    .select('recommendation_id')
    .eq('session_id', sessionId)

  // Build set of IDs to keep
  const feedbackIds = new Set(feedbackRecs?.map(f => f.recommendation_id) || [])
  const recsToDelete = allRecs?.filter(r => !feedbackIds.has(r.id)).map(r => r.id) || []

  // Delete unwatched recommendations
  if (recsToDelete.length > 0) {
    const { error } = await supabase
      .from('recommendations')
      .delete()
      .in('id', recsToDelete)

    if (error) {
      console.error('Error clearing unwatched:', error)
      return { success: false, error: 'Failed to clear old recommendations' }
    }
  }

  revalidatePath('/recommendations')
  return { success: true }
}

export async function updateGenesFromRecentFeedbackAction() {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false }

  const supabase = await createClient()

  // Get feedback that hasn't been processed for genes yet
  const { data: unprocessedFeedback } = await supabase
    .from('movie_feedback')
    .select(`
      *,
      recommendations (movie_title)
    `)
    .eq('session_id', sessionId)
    .eq('status', 'watched')
    .or('genes_extracted.is.null,genes_extracted.eq.false')

  if (!unprocessedFeedback || unprocessedFeedback.length === 0) {
    return { success: true }
  }

  // Fetch existing genes once (not inside loop for performance)
  const { data: existingGenes } = await supabase
    .from('taste_genes')
    .select('gene_name, strength, description, is_negative')
    .eq('session_id', sessionId)

  // Extract genes from each unprocessed feedback
  for (const feedback of unprocessedFeedback) {
    if (!feedback.rating) continue

    // Null check for recommendation data
    if (!feedback.recommendations?.movie_title) {
      console.error('Missing movie title for feedback:', feedback.id)
      continue
    }

    try {
      const extraction = await extractTasteGenes(
        feedback.recommendations.movie_title,
        feedback.rating,
        feedback.reason || '',
        existingGenes || []
      )

      for (const gene of extraction.genes) {
        await upsertTasteGene(supabase, sessionId, {
          ...gene,
          source_movie_title: feedback.recommendations.movie_title,
          source_rating: feedback.rating
        })
      }

      await updateTasteProfile(supabase, sessionId, extraction.profile_update)

      // Only mark as processed if extraction succeeded
      await supabase
        .from('movie_feedback')
        .update({ genes_extracted: true })
        .eq('id', feedback.id)
    } catch (error) {
      console.error('Error updating genes from feedback:', error)
      // Don't mark as processed on failure - allow retry later
    }
  }

  revalidatePath('/recommendations')
  return { success: true }
}

export async function generateMoreRecommendationsAction(userGuidance?: string) {
  // Step 1: Update genes from recent feedback
  await updateGenesFromRecentFeedbackAction()
  
  // Step 2: Clear unwatched recommendations
  const clearResult = await clearUnwatchedRecommendationsAction()
  if (!clearResult.success) {
    return clearResult
  }
  
  // Step 3: Generate new recommendations with updated genes
  return generateNewRecommendations({
    minRatingsRequired: THRESHOLDS.MIN_RATINGS_FOR_MORE,
    userGuidance
  })
}

