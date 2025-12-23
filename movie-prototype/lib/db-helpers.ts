import { createClient } from './supabase/server'
import type { TasteGene } from './types'
import { CONFIDENCE_LEVELS } from './constants'

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
    // Update existing gene
    return supabase
      .from('taste_genes')
      .update({
        strength: gene.strength,
        times_validated: existing.times_validated + 1,
        confidence_score: Math.min(existing.times_validated * 0.2 + 0.8, 2.0),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    // Insert new gene
    return supabase.from('taste_genes').insert({
      session_id: sessionId,
      ...gene
    })
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

