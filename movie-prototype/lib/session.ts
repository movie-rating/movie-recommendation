'use server'
import { cookies } from 'next/headers'
import { createClient } from './supabase/server'

const SESSION_COOKIE = 'movie_session_id'

export async function getOrCreateSession(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value

  if (!sessionId) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('sessions')
      .insert({})
      .select()
      .single()
    
    if (error) {
      console.error('Error creating session:', error)
      throw new Error('Failed to create session')
    }
    
    if (data) {
      sessionId = data.id
      // Set cookie (this works in Server Actions but not in Server Components)
      try {
        cookieStore.set(SESSION_COOKIE, sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          sameSite: 'lax'
        })
      } catch (e) {
        // Cookie setting might fail in some contexts, but session is still created
        console.log('Cookie setting skipped (will be set on next action)')
      }
    }
  }

  return sessionId!
}

export async function getSessionId(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value
}

