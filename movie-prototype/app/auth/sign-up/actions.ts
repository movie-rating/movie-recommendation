'use server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function linkSessionToUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('movie_session_id')?.value
  
  if (!sessionId) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  // Link all session data to user
  await Promise.all([
    supabase
      .from('user_movies')
      .update({ user_id: user.id })
      .eq('session_id', sessionId)
      .is('user_id', null),
    supabase
      .from('recommendations')
      .update({ user_id: user.id })
      .eq('session_id', sessionId)
      .is('user_id', null)
  ])
}



