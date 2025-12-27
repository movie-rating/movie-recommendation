import { getWatchSessionByCode } from '@/lib/watch-session-helpers'
import { getOrCreateSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { JoinSessionView } from './join-session-view'
import { HostWaitingView } from './host-waiting-view'
import { ActiveSessionView } from './active-session-view'
import { SessionNotFound, ExpiredSessionView } from './error-states'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Watch Together | Find Something to Watch',
  description: 'Join a Watch Together session to find movies you will both enjoy.',
}

interface Props {
  params: Promise<{ code: string }>
}

export default async function WatchSessionPage({ params }: Props) {
  const { code } = await params
  const watchSession = await getWatchSessionByCode(code)

  // Session not found
  if (!watchSession) {
    return <SessionNotFound />
  }

  // Session expired
  if (watchSession.status === 'expired' || new Date(watchSession.expires_at) < new Date()) {
    return <ExpiredSessionView />
  }

  // Get or create user session
  const userSessionId = await getOrCreateSession()

  // Check if current user is host or guest
  const isHost = userSessionId === watchSession.host_session_id
  const isGuest = userSessionId === watchSession.guest_session_id

  // Session completed - show the match (only for participants)
  if (watchSession.status === 'completed' && (isHost || isGuest)) {
    return (
      <ActiveSessionView
        session={watchSession}
        isHost={isHost}
      />
    )
  }

  // Session is active - show voting view
  if (watchSession.status === 'active' && (isHost || isGuest)) {
    return (
      <ActiveSessionView
        session={watchSession}
        isHost={isHost}
      />
    )
  }

  // Host viewing their waiting session
  if (watchSession.status === 'waiting' && isHost) {
    return <HostWaitingView session={watchSession} />
  }

  // Someone else trying to view an active session they're not part of
  if (watchSession.status === 'active' && !isHost && !isGuest) {
    return <SessionNotFound />
  }

  // Check if user has rated movies (has preferences)
  const supabase = await createClient()
  const { data: userMovies } = await supabase
    .from('user_movies')
    .select('id')
    .eq('session_id', userSessionId)
    .limit(1)

  const hasPreferences = (userMovies?.length ?? 0) > 0

  // Guest join flow - show join screen (with onboarding if needed)
  return (
    <JoinSessionView
      session={watchSession}
      hasPreferences={hasPreferences}
      guestSessionId={userSessionId}
    />
  )
}
