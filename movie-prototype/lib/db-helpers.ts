import { createClient } from './supabase/server'
import type { TasteGene, UserMovie } from './types'
import { CONFIDENCE_LEVELS } from './constants'

/**
 * Database repository functions to reduce query duplication
 */

export async function getUserMovies(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
) {
  const { data } = await supabase
    .from('user_movies')
    .select('*')
    .eq('session_id', sessionId)
  
  return data || []
}

export async function getExistingRecommendations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
) {
  const { data } = await supabase
    .from('recommendations')
    .select('movie_title')
    .eq('session_id', sessionId)
  
  return data || []
}

export async function getTasteGenes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
) {
  const { data } = await supabase
    .from('taste_genes')
    .select('*')
    .eq('session_id', sessionId)
    .order('confidence_score', { ascending: false })
  
  return data || []
}

export async function getWatchedMoviesWithFeedback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
) {
  const { data } = await supabase
    .from('movie_feedback')
    .select(`
      *,
      recommendations (movie_title)
    `)
    .eq('session_id', sessionId)
    .or('status.eq.watched,status.eq.not_interested')
  
  return data || []
}

export async function getTasteProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
) {
  const { data } = await supabase
    .from('taste_profiles')
    .select('profile_summary')
    .eq('session_id', sessionId)
    .single()
  
  return data
}

export async function upsertTasteGene(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  gene: {
    gene_name: string
    strength: number
    is_negative: boolean
    is_dealbreaker: boolean
    description: string
    source_movie_title: string
    source_rating: string
  }
) {
  const { data: existing } = await supabase
    .from('taste_genes')
    .select('id, strength, times_validated')
    .eq('session_id', sessionId)
    .eq('gene_name', gene.gene_name)
    .single()

  if (existing) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db-helpers.ts:27',message:'Updating existing gene',data:{geneId:existing.id,geneName:gene.gene_name,oldStrength:existing.strength,newStrength:gene.strength},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    // Update existing gene
    const result = await supabase
      .from('taste_genes')
      .update({
        strength: gene.strength,
        times_validated: existing.times_validated + 1,
        confidence_score: Math.min(existing.times_validated * 0.2 + 0.8, 2.0),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db-helpers.ts:38',message:'Gene update result',data:{success:!result.error,error:result.error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H5'})}).catch(()=>{});
    // #endregion
    return result
  } else {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db-helpers.ts:44',message:'Inserting new gene',data:{sessionId,geneName:gene.gene_name,strength:gene.strength,isNegative:gene.is_negative,isDealbreaker:gene.is_dealbreaker},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    // Insert new gene
    const result = await supabase.from('taste_genes').insert({
      session_id: sessionId,
      ...gene
    })
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db-helpers.ts:52',message:'Gene insert result',data:{success:!result.error,error:result.error?.message,errorDetails:result.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H5'})}).catch(()=>{});
    // #endregion
    return result
  }
}

export async function updateTasteProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  profileUpdate: string
) {
  const { data: allGenes } = await supabase
    .from('taste_genes')
    .select('*')
    .eq('session_id', sessionId)

  const totalGenes = allGenes?.length || 0
  const confidenceLevel = totalGenes < CONFIDENCE_LEVELS.EMERGING ? 'emerging' 
    : totalGenes < CONFIDENCE_LEVELS.DEVELOPING ? 'developing' 
    : 'established'

  return supabase
    .from('taste_profiles')
    .upsert({
      session_id: sessionId,
      profile_summary: profileUpdate,
      total_genes: totalGenes,
      confidence_level: confidenceLevel,
      updated_at: new Date().toISOString()
    })
}

