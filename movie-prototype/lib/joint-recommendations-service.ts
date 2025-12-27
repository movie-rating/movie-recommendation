'use server'

import { createClient } from '@/lib/supabase/server'
import { generateJointRecommendations } from '@/lib/gemini'
import { getUserMovies, getUserPlatforms } from '@/lib/db-helpers'
import { searchMedia } from '@/lib/tmdb'
import { updateSessionRecommendations, appendSessionRecommendations } from '@/lib/watch-session-helpers'
import type { JointRecommendation } from '@/lib/types'

/**
 * Generate and store joint recommendations for a watch session
 * Called when a guest joins the session
 */
export async function generateAndStoreJointRecommendations(
  watchSessionId: string,
  hostSessionId: string,
  guestSessionId: string
): Promise<JointRecommendation[]> {
  const supabase = await createClient()

  console.log(`[JointRecs] Generating for session ${watchSessionId}`)

  // Fetch both users' data in parallel
  const [hostMovies, guestMovies, hostPlatforms, guestPlatforms] = await Promise.all([
    getUserMovies(supabase, hostSessionId),
    getUserMovies(supabase, guestSessionId),
    getUserPlatforms(supabase, hostSessionId),
    getUserPlatforms(supabase, guestSessionId),
  ])

  console.log(`[JointRecs] Host: ${hostMovies.length} movies, ${hostPlatforms.length} platforms`)
  console.log(`[JointRecs] Guest: ${guestMovies.length} movies, ${guestPlatforms.length} platforms`)

  // Find shared streaming platforms
  const sharedPlatforms = hostPlatforms.filter(p => guestPlatforms.includes(p))
  console.log(`[JointRecs] Shared platforms: ${sharedPlatforms.length}`)

  // Transform to expected format
  const hostMoviesFormatted = hostMovies.map(m => ({
    movie_title: m.movie_title,
    sentiment: m.sentiment,
    reason: m.reason || ''
  }))

  const guestMoviesFormatted = guestMovies.map(m => ({
    movie_title: m.movie_title,
    sentiment: m.sentiment,
    reason: m.reason || ''
  }))

  // Generate recommendations via Gemini
  const aiRecommendations = await generateJointRecommendations(
    hostMoviesFormatted,
    guestMoviesFormatted,
    sharedPlatforms
  )

  if (aiRecommendations.length === 0) {
    console.error('[JointRecs] No recommendations generated')
    throw new Error('Failed to generate recommendations')
  }

  // Enrich with TMDB data
  const enrichedRecommendations = await enrichJointRecommendations(aiRecommendations)

  console.log(`[JointRecs] Enriched ${enrichedRecommendations.length} recommendations`)

  // Store in watch session
  await updateSessionRecommendations(watchSessionId, enrichedRecommendations)

  return enrichedRecommendations
}

/**
 * Enrich AI recommendations with TMDB data
 */
async function enrichJointRecommendations(
  recommendations: Array<{
    title: string
    year?: number
    reasoning?: string
    match_explanation?: string
    ai_confidence?: number
    available_on?: string
  }>
): Promise<JointRecommendation[]> {
  const results = await Promise.all(
    recommendations.map(async (rec) => {
      const tmdb = await searchMedia(rec.title, rec.year)

      // Skip recommendations without valid TMDB data
      if (!tmdb || !tmdb.id) {
        console.warn(`[JointRecs] No TMDB data for: ${rec.title}`)
        return null
      }

      // Extract genres if available
      const genres: string[] = []
      if ('genres' in tmdb && Array.isArray(tmdb.genres)) {
        genres.push(...tmdb.genres.map((g: { name: string }) => g.name))
      }

      // Extract runtime
      let runtime: number | null = null
      if ('runtime' in tmdb) {
        runtime = tmdb.runtime || null
      }

      // Extract release year
      let releaseYear = rec.year || 0
      if ('release_date' in tmdb && tmdb.release_date) {
        releaseYear = parseInt(tmdb.release_date.split('-')[0]) || releaseYear
      } else if ('first_air_date' in tmdb && tmdb.first_air_date) {
        releaseYear = parseInt(tmdb.first_air_date.split('-')[0]) || releaseYear
      }

      // Parse streaming platforms from available_on string
      const streamingPlatforms = rec.available_on
        ? rec.available_on.split(',').map(p => p.trim()).filter(Boolean)
        : []

      return {
        tmdb_id: tmdb.id,
        title: rec.title,
        poster_path: tmdb.poster_path || null,
        release_year: releaseYear,
        genres,
        runtime,
        vote_average: 'vote_average' in tmdb ? tmdb.vote_average : 0,
        overview: 'overview' in tmdb ? tmdb.overview : rec.reasoning || '',
        streaming_platforms: streamingPlatforms
      } satisfies JointRecommendation
    })
  )

  // Filter out nulls (movies without TMDB data)
  return results.filter((r): r is JointRecommendation => r !== null)
}

/**
 * Generate more recommendations for an existing session
 * Called when users skip all current recommendations
 */
export async function generateMoreJointRecommendations(
  watchSessionId: string
): Promise<JointRecommendation[]> {
  const supabase = await createClient()

  // Get the watch session to find participants
  const { data: session, error } = await supabase
    .from('watch_sessions')
    .select('*')
    .eq('id', watchSessionId)
    .single()

  if (error || !session) {
    throw new Error('Session not found')
  }

  if (!session.guest_session_id) {
    throw new Error('Session has no guest')
  }

  // Get existing recommendations to avoid duplicates
  const existingTitles = (session.recommendations as JointRecommendation[] || [])
    .map(r => r.title)

  // Fetch both users' data
  const [hostMovies, guestMovies, hostPlatforms, guestPlatforms] = await Promise.all([
    getUserMovies(supabase, session.host_session_id),
    getUserMovies(supabase, session.guest_session_id),
    getUserPlatforms(supabase, session.host_session_id),
    getUserPlatforms(supabase, session.guest_session_id),
  ])

  const sharedPlatforms = hostPlatforms.filter(p => guestPlatforms.includes(p))

  // Generate new recommendations
  // Note: generateJointRecommendations already excludes user movies internally
  const aiRecommendations = await generateJointRecommendations(
    hostMovies.map(m => ({ movie_title: m.movie_title, sentiment: m.sentiment, reason: m.reason || '' })),
    guestMovies.map(m => ({ movie_title: m.movie_title, sentiment: m.sentiment, reason: m.reason || '' })),
    sharedPlatforms
  )

  // Filter out any that were in existing recommendations
  const newRecs = aiRecommendations.filter(
    r => !existingTitles.some(t => t.toLowerCase() === r.title.toLowerCase())
  )

  // Enrich with TMDB
  const enriched = await enrichJointRecommendations(newRecs)

  // Append to session without resetting index - continues from current position
  await appendSessionRecommendations(watchSessionId, enriched)

  return enriched
}
