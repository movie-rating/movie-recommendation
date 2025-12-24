'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionId } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { generateNewRecommendations } from '@/lib/recommendations-service'
import { THRESHOLDS } from '@/lib/constants'

export async function updateGeneAction(
  geneId: string,
  updates: { strength?: number; is_dealbreaker?: boolean }
) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gene-actions.ts:8',message:'updateGeneAction called',data:{geneId,updates},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()
  
  const { error } = await supabase
    .from('taste_genes')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', geneId)
    .eq('session_id', sessionId)

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gene-actions.ts:26',message:'Gene update result',data:{success:!error,error:error?.message,errorDetails:error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H5'})}).catch(()=>{});
  // #endregion

  if (error) {
    console.error('Error updating gene:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/recommendations')
  return { success: true }
}

export async function deleteGeneAction(geneId: string) {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()
  
  const { error } = await supabase
    .from('taste_genes')
    .delete()
    .eq('id', geneId)
    .eq('session_id', sessionId)

  if (error) {
    console.error('Error deleting gene:', error)
    return { success: false, error: error.message }
  }

  // Update profile total count
  const { data: allGenes } = await supabase
    .from('taste_genes')
    .select('id')
    .eq('session_id', sessionId)

  await supabase
    .from('taste_profiles')
    .update({ 
      total_genes: allGenes?.length || 0,
      updated_at: new Date().toISOString()
    })
    .eq('session_id', sessionId)

  revalidatePath('/recommendations')
  return { success: true }
}

export async function regenerateWithGenesAction(userGuidance?: string) {
  return generateNewRecommendations({
    minGenesRequired: THRESHOLDS.MIN_GENES_FOR_REGENERATE,
    userGuidance
  })
}

