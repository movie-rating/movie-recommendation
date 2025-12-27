'use server'

/**
 * Watch Session Database Helpers
 *
 * Error Handling Pattern:
 * - Query functions (getWatchSessionByCode, getWatchSessionById): Return null if not found
 * - Mutation functions (create, update, delete): Throw Error on failure
 */

import { createClient } from '@/lib/supabase/server'
import { getOrCreateSession } from '@/lib/session'
import { nanoid } from 'nanoid'
import type { WatchSession, JointRecommendation } from '@/lib/types'

/**
 * Generate a short, URL-safe session code
 */
function generateSessionCode(): string {
  return nanoid(6)
}

/**
 * Verify user is a participant and return their role
 */
async function verifyParticipant(
  sessionId: string,
  userSessionId: string
): Promise<{ session: WatchSession; isHost: boolean }> {
  const supabase = await createClient()

  const { data: session, error } = await supabase
    .from('watch_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    throw new Error('Session not found')
  }

  const isHost = session.host_session_id === userSessionId
  const isGuest = session.guest_session_id === userSessionId

  if (!isHost && !isGuest) {
    throw new Error('Not authorized to access this session')
  }

  return { session: session as WatchSession, isHost }
}

/**
 * Create a new watch session for the host
 */
export async function createWatchSession(hostSessionId: string): Promise<WatchSession> {
  const supabase = await createClient()
  const code = generateSessionCode()

  const { data, error } = await supabase
    .from('watch_sessions')
    .insert({
      code,
      host_session_id: hostSessionId,
      status: 'waiting',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return data as WatchSession
}

/**
 * Get a watch session by its shareable code
 * Returns null if not found (query pattern - does not throw)
 */
export async function getWatchSessionByCode(code: string): Promise<WatchSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('watch_sessions')
    .select('*')
    .eq('code', code)
    .single()

  if (error) return null
  return data as WatchSession
}

/**
 * Get a watch session by its ID
 * Returns null if not found (query pattern - does not throw)
 */
export async function getWatchSessionById(id: string): Promise<WatchSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('watch_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as WatchSession
}

/**
 * Activate a watch session - join as guest and generate recommendations
 * This is the main entry point for guests joining a session
 */
export async function activateWatchSession(
  code: string,
  guestSessionId: string
): Promise<WatchSession> {
  const supabase = await createClient()

  // Verify the code exists and is waiting
  const session = await getWatchSessionByCode(code)
  if (!session) throw new Error('Session not found')
  if (session.status !== 'waiting') throw new Error('Session is not available to join')
  if (session.host_session_id === guestSessionId) throw new Error('Cannot join your own session')

  // Atomically update session - only succeeds if still in waiting state
  const { data: updatedSession, error } = await supabase
    .from('watch_sessions')
    .update({
      guest_session_id: guestSessionId,
      status: 'active'
    })
    .eq('code', code)
    .eq('status', 'waiting')
    .is('guest_session_id', null) // Ensure no guest already assigned
    .select()
    .single()

  if (error) throw new Error(`Failed to join session: ${error.message}`)

  // Generate recommendations
  const { generateAndStoreJointRecommendations } = await import('@/lib/joint-recommendations-service')

  try {
    await generateAndStoreJointRecommendations(
      updatedSession.id,
      session.host_session_id,
      guestSessionId
    )
  } catch (recError) {
    console.error('Failed to generate recommendations:', recError)
    // Continue - session is active, recommendations can be retried
  }

  // Return final session state
  const finalSession = await getWatchSessionById(updatedSession.id)
  return finalSession || (updatedSession as WatchSession)
}

/**
 * Update a participant's vote on the current movie
 * Automatically handles completion when both vote "watch"
 */
export async function updateSessionVote(
  sessionId: string,
  vote: 'skip' | 'watch'
): Promise<WatchSession> {
  const userSessionId = await getOrCreateSession()
  const { session, isHost } = await verifyParticipant(sessionId, userSessionId)

  // Check if session has expired
  if (new Date(session.expires_at) < new Date()) {
    throw new Error('Session has expired')
  }

  // Prevent double voting
  const myCurrentVote = isHost ? session.host_vote : session.guest_vote
  if (myCurrentVote !== null) {
    throw new Error('Already voted on this movie')
  }

  const supabase = await createClient()
  const updateField = isHost ? 'host_vote' : 'guest_vote'

  const { data, error } = await supabase
    .from('watch_sessions')
    .update({ [updateField]: vote })
    .eq('id', sessionId)
    .eq('status', 'active') // Only allow voting on active sessions
    .select()
    .single()

  if (error) throw new Error(`Failed to update vote: ${error.message}`)
  return data as WatchSession
}

/**
 * Advance to the next movie in recommendations
 * Uses atomic database function to prevent race conditions
 */
export async function advanceToNextMovie(sessionId: string): Promise<WatchSession> {
  const userSessionId = await getOrCreateSession()
  await verifyParticipant(sessionId, userSessionId)

  const supabase = await createClient()

  // Use atomic RPC function - increments index and resets votes in single transaction
  // Only succeeds if both votes are 'skip' and session is active
  const { data, error } = await supabase
    .rpc('advance_watch_session', { session_uuid: sessionId })
    .single()

  if (error) {
    // RPC failed - could be votes changed or session not active
    const current = await getWatchSessionById(sessionId)
    if (current) return current
    throw new Error(`Failed to advance: ${error.message}`)
  }

  if (!data) {
    // No rows returned - votes weren't both 'skip' or session not active
    const current = await getWatchSessionById(sessionId)
    if (current) return current
    throw new Error('Failed to advance: conditions not met')
  }

  return data as WatchSession
}

/**
 * Complete a session with the chosen movie
 */
export async function completeSession(
  sessionId: string,
  chosenMovie: JointRecommendation
): Promise<WatchSession> {
  const userSessionId = await getOrCreateSession()
  const { session } = await verifyParticipant(sessionId, userSessionId)

  // Verify both voted watch
  if (session.host_vote !== 'watch' || session.guest_vote !== 'watch') {
    throw new Error('Both participants must vote to watch')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('watch_sessions')
    .update({
      status: 'completed',
      chosen_movie: chosenMovie
    })
    .eq('id', sessionId)
    .eq('status', 'active') // Prevent completing already completed sessions
    .select()
    .single()

  if (error) throw new Error(`Failed to complete session: ${error.message}`)
  return data as WatchSession
}

/**
 * Update session with generated recommendations (initial generation)
 * Resets index and votes - use only for first batch
 */
export async function updateSessionRecommendations(
  sessionId: string,
  recommendations: JointRecommendation[]
): Promise<WatchSession> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('watch_sessions')
    .update({
      recommendations,
      current_index: 0,
      host_vote: null,
      guest_vote: null
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update recommendations: ${error.message}`)
  return data as WatchSession
}

/**
 * Append more recommendations to existing session
 * Does NOT reset index - continues from current position
 */
export async function appendSessionRecommendations(
  sessionId: string,
  newRecommendations: JointRecommendation[]
): Promise<WatchSession> {
  const supabase = await createClient()

  // Get current recommendations
  const { data: current, error: fetchError } = await supabase
    .from('watch_sessions')
    .select('recommendations, current_index')
    .eq('id', sessionId)
    .single()

  if (fetchError) throw new Error(`Failed to fetch session: ${fetchError.message}`)

  const existingRecs = (current?.recommendations || []) as JointRecommendation[]
  const currentIndex = current?.current_index ?? 0

  // Append new recommendations and advance index to first new one
  const { data, error } = await supabase
    .from('watch_sessions')
    .update({
      recommendations: [...existingRecs, ...newRecommendations],
      current_index: currentIndex + 1, // Move to next (first new rec if at end)
      host_vote: null,
      guest_vote: null
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw new Error(`Failed to append recommendations: ${error.message}`)
  return data as WatchSession
}

/**
 * Exit a watch session
 * Host leaving expires the session, guest leaving resets to waiting
 */
export async function exitWatchSession(sessionId: string): Promise<void> {
  const userSessionId = await getOrCreateSession()
  const { isHost } = await verifyParticipant(sessionId, userSessionId)

  const supabase = await createClient()

  if (isHost) {
    // Host leaving expires the session
    const { error } = await supabase
      .from('watch_sessions')
      .update({ status: 'expired' })
      .eq('id', sessionId)

    if (error) throw new Error(`Failed to exit session: ${error.message}`)
  } else {
    // Guest leaving removes them and resets to waiting
    const { error } = await supabase
      .from('watch_sessions')
      .update({
        guest_session_id: null,
        status: 'waiting',
        recommendations: [],
        current_index: 0,
        host_vote: null,
        guest_vote: null
      })
      .eq('id', sessionId)

    if (error) throw new Error(`Failed to exit session: ${error.message}`)
  }
}
