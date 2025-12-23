'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionId } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { generateDiverseRecommendations } from '@/lib/gemini'
import { enrichWithTMDB, filterDuplicateTitles } from '@/lib/utils'

export async function updateGeneAction(
  geneId: string,
  updates: { strength?: number; is_dealbreaker?: boolean }
) {
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

export async function regenerateWithGenesAction() {
  const sessionId = await getSessionId()
  if (!sessionId) return { success: false, error: 'No session' }

  const supabase = await createClient()

  // Get user movies
  const { data: userMovies } = await supabase
    .from('user_movies')
    .select('*')
    .eq('session_id', sessionId)

  // Get ALL existing recommendations to avoid duplicates
  const { data: existingRecs } = await supabase
    .from('recommendations')
    .select('movie_title')
    .eq('session_id', sessionId)

  const { data: feedbackData } = await supabase
    .from('movie_feedback')
    .select('recommendations (movie_title)')
    .eq('session_id', sessionId)

  const watchedTitles = feedbackData?.map(f => f.recommendations.movie_title) || []
  const existingMovieTitles = [
    ...(userMovies?.map(m => m.movie_title) || []),
    ...watchedTitles
  ]

  // Get updated taste genes
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

  if (!tasteGenes || tasteGenes.length < 3) {
    return { success: false, error: 'Need more feedback to regenerate' }
  }

  try {
    // Generate with updated genes
    const safeRecs = await generateDiverseRecommendations(
      userMovies || [],
      tasteGenes,
      profile?.profile_summary || 'Updated taste profile',
      existingMovieTitles,
      'safe'
    )

    const expRecs = await generateDiverseRecommendations(
      userMovies || [],
      tasteGenes,
      profile?.profile_summary || 'Updated taste profile',
      existingMovieTitles,
      'experimental'
    )

    const allRecs = [...safeRecs, ...expRecs]
    const enrichedAll = await enrichWithTMDB(allRecs, sessionId)
    
    // Filter duplicates
    const enriched = filterDuplicateTitles(enrichedAll, existingMovieTitles)
    
    // Remove temporary title_lower field
    const toInsert = enriched.map(({ title_lower, ...rest }) => rest)

    if (toInsert.length > 0) {
      await supabase.from('recommendations').insert(toInsert)
    }

    revalidatePath('/recommendations')
    return { success: true }
  } catch (error) {
    console.error('Error regenerating:', error)
    return { success: false, error: 'Failed to regenerate' }
  }
}

