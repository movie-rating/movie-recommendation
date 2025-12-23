'use server'
import { getOrCreateSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { generateRecommendations, extractTasteGenes } from '@/lib/gemini'
import { enrichWithTMDB, filterDuplicateTitles } from '@/lib/utils'
import { upsertTasteGene, updateTasteProfile } from '@/lib/db-helpers'

export async function submitMoviesAction(
  movies: Array<{ title: string; sentiment: string; reason: string }>
) {
  try {
    const sessionId = await getOrCreateSession()
    const supabase = await createClient()

    // 1. Store user movies
    const { error: insertError } = await supabase
      .from('user_movies')
      .insert(
        movies.map(m => ({
          session_id: sessionId,
          movie_title: m.title,
          sentiment: m.sentiment,
          reason: m.reason
        }))
      )

    if (insertError) throw insertError

    // 2. Extract taste genes from initial input (in parallel)
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding/actions.ts:29',message:'Starting gene extraction',data:{movieCount:movies.length,sessionId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    try {
      // Extract genes from all movies in parallel for speed
      const extractions = await Promise.all(
        movies.map(async (movie) => {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding/actions.ts:36',message:'Processing movie',data:{title:movie.title,sentiment:movie.sentiment,hasReason:!!movie.reason},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
          
          // Each movie extracts independently (no dependencies)
          const extraction = await extractTasteGenes(
            movie.title,
            movie.sentiment,
            movie.reason,
            [] // Start fresh for each movie in parallel
          )
          
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding/actions.ts:48',message:'Genes extracted',data:{movieTitle:movie.title,geneCount:extraction.genes.length,profileUpdate:extraction.profile_update},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          
          return { movie, extraction }
        })
      )

      // Store all genes after extraction
      for (const { movie, extraction } of extractions) {
        for (const gene of extraction.genes) {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding/actions.ts:59',message:'Upserting gene',data:{geneName:gene.gene_name,strength:gene.strength,isNegative:gene.is_negative},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion
          await upsertTasteGene(supabase, sessionId, {
            ...gene,
            source_movie_title: movie.title,
            source_rating: movie.sentiment
          })
        }

        // Update profile summary with the last extraction's insight
        await updateTasteProfile(supabase, sessionId, extraction.profile_update)
      }
    } catch (geneError) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding/actions.ts:74',message:'Gene extraction error',data:{error:geneError instanceof Error ? geneError.message : String(geneError),stack:geneError instanceof Error ? geneError.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      console.error('Error extracting taste genes during onboarding:', geneError)
      // Don't fail the whole onboarding if gene extraction fails
    }
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/5054ccb2-5854-4192-ae02-8b80db09250d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding/actions.ts:80',message:'Gene extraction completed',data:{sessionId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    // 3. Generate recommendations via Gemini (now with genes available)
    const recs = await generateRecommendations(movies)

    // 4. Get existing recommendations to check for duplicates
    const { data: existingRecs } = await supabase
      .from('recommendations')
      .select('movie_title')
      .eq('session_id', sessionId)

    const existingTitles = [
      ...(existingRecs?.map(r => r.movie_title) || []),
      ...movies.map(m => m.title)
    ]

    // 5. Enrich with TMDB data (no taste genes yet for initial recommendations)
    const enrichedAll = await enrichWithTMDB(recs, sessionId, [], false)

    // Filter out duplicates
    const enriched = filterDuplicateTitles(enrichedAll, existingTitles)

    // Remove temporary title_lower field
    const toInsert = enriched.map(({ title_lower, ...rest }) => rest)

    // 6. Store recommendations (only unique ones)
    if (toInsert.length > 0) {
      await supabase.from('recommendations').insert(toInsert)
    }

    return { success: true }
  } catch (error) {
    console.error('Error generating recommendations:', error)
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to generate recommendations'
    
    if (error instanceof Error) {
      if (error.message.includes('API') || error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to AI service. Please check your API keys and try again.'
      } else if (error.message.includes('parse') || error.message.includes('JSON')) {
        errorMessage = 'Received invalid response from AI. Please try again.'
      } else if (error.message.includes('TMDB')) {
        errorMessage = 'Unable to fetch movie posters. Recommendations generated but images may be missing.'
      } else {
        errorMessage = error.message
      }
    }
    
    return { 
      success: false, 
      error: errorMessage
    }
  }
}

