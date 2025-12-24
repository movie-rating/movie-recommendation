import { createClient } from './supabase/server'
import type { TasteGene, UserMovie, GeneSource } from './types'
import { CONFIDENCE_LEVELS, GENE_MULTIPLIER } from './constants'
import { findSimilarGene } from './gene-similarity'

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
    .or('status.eq.watched,status.eq.not_interested,status.eq.watchlist')
  
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
  // First, check for semantic similarity with existing genes (with error handling)
  try {
    const { data: allExisting } = await supabase
      .from('taste_genes')
      .select('gene_name, description, strength, id, times_validated')
      .eq('session_id', sessionId)
      .eq('is_negative', gene.is_negative) // Only check within same polarity

    // Check for semantic similarity
    const { similar, existingGene, similarity } = await findSimilarGene(
      { gene_name: gene.gene_name, description: gene.description },
      allExisting || []
    )

    if (similar && existingGene) {
      // Log merge decision
      console.log(`[Gene Consolidation] Merging "${gene.gene_name}" → "${existingGene.gene_name}" (similarity: ${similarity?.toFixed(2)})`)
      
      // Merge with similar gene - take higher strength
      const newStrength = Math.max(existingGene.strength, gene.strength)
      
      // Update gene sources and multiplier
      await updateGeneSourcesAndMultiplier(
        supabase,
        existingGene.id!,
        sessionId,
        gene.source_movie_title,
        gene.source_rating
      )
      
      return supabase
        .from('taste_genes')
        .update({
          strength: newStrength,
          times_validated: (existingGene.times_validated || 0) + 1,
          confidence_score: Math.min((existingGene.times_validated || 0) * 0.2 + 1.0, 2.0),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingGene.id)
    }
  } catch (error) {
    // If semantic similarity fails, fall back to exact name matching
    console.error('Semantic similarity check failed, using exact match:', error)
  }

  // Check for exact name match (original behavior)
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
    
    // Update gene sources and multiplier
    await updateGeneSourcesAndMultiplier(
      supabase,
      existing.id,
      sessionId,
      gene.source_movie_title,
      gene.source_rating
    )
    
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
    }).select()
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db-helpers.ts:52',message:'Gene insert result',data:{success:!result.error,error:result.error?.message,errorDetails:result.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H5'})}).catch(()=>{});
    // #endregion
    
    // Add initial gene source if insert was successful
    if (!result.error && result.data && result.data[0]) {
      await updateGeneSourcesAndMultiplier(
        supabase,
        result.data[0].id,
        sessionId,
        gene.source_movie_title,
        gene.source_rating
      )
    }
    
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

export async function getGeneSources(
  supabase: Awaited<ReturnType<typeof createClient>>,
  geneId: string
): Promise<GeneSource[]> {
  const { data } = await supabase
    .from('gene_sources')
    .select('*')
    .eq('gene_id', geneId)
    .order('contributed_at', { ascending: false })
  
  return data || []
}

async function updateGeneSourcesAndMultiplier(
  supabase: Awaited<ReturnType<typeof createClient>>,
  geneId: string,
  sessionId: string,
  sourceMovieTitle: string,
  sourceRating: string
) {
  // Insert new source (UNIQUE constraint prevents duplicates)
  const { error: insertError } = await supabase.from('gene_sources').insert({
    gene_id: geneId,
    session_id: sessionId,
    source_movie_title: sourceMovieTitle,
    source_rating: sourceRating
  })

  // If error is not a duplicate key violation, log it
  if (insertError && !insertError.message.includes('duplicate key')) {
    console.error('Error inserting gene source:', insertError)
    // Don't throw - continue with recalculation in case of other errors
  }

  // Recalculate source count and multiplier based on actual DB state
  const { data: sources, error: fetchError } = await supabase
    .from('gene_sources')
    .select('source_movie_title')
    .eq('gene_id', geneId)

  if (fetchError) {
    console.error('Error fetching gene sources for count:', fetchError)
    return // Don't update if we can't get accurate count
  }

  const sourceCount = sources?.length || 1
  const sourceMultiplier = Math.min(
    GENE_MULTIPLIER.BASE + (sourceCount - 1) * GENE_MULTIPLIER.INCREMENT_PER_SOURCE,
    GENE_MULTIPLIER.MAX_MULTIPLIER
  )

  // Update gene with new counts
  const { error: updateError } = await supabase
    .from('taste_genes')
    .update({ 
      source_count: sourceCount, 
      source_multiplier: sourceMultiplier 
    })
    .eq('id', geneId)

  if (updateError) {
    console.error('Error updating gene multiplier:', updateError)
  }
}

