'use server'
import { getOrCreateSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { generateRecommendations } from '@/lib/gemini'
import { enrichWithTMDB, filterDuplicateTitles } from '@/lib/utils'

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

    // 2. Generate recommendations via Gemini
    const recs = await generateRecommendations(movies)

    // 3. Get existing recommendations to check for duplicates
    const { data: existingRecs } = await supabase
      .from('recommendations')
      .select('movie_title')
      .eq('session_id', sessionId)

    const existingTitles = [
      ...(existingRecs?.map(r => r.movie_title) || []),
      ...movies.map(m => m.title)
    ]

    // 4. Enrich with TMDB data
    const enrichedAll = await enrichWithTMDB(recs, sessionId)

    // Filter out duplicates
    const enriched = filterDuplicateTitles(enrichedAll, existingTitles)

    // Remove temporary title_lower field
    const toInsert = enriched.map(({ title_lower, ...rest }) => rest)

    // 5. Store recommendations (only unique ones)
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

