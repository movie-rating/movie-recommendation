'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { Loader2, Users } from 'lucide-react'
import { activateWatchSession } from '@/lib/watch-session-helpers'
import { useRouter } from 'next/navigation'
import { QuickOnboarding } from './quick-onboarding'
import type { WatchSession } from '@/lib/types'

interface JoinSessionViewProps {
  session: WatchSession
  hasPreferences: boolean
  guestSessionId: string
}

export function JoinSessionView({ session, hasPreferences, guestSessionId }: JoinSessionViewProps) {
  const [showOnboarding, setShowOnboarding] = useState(!hasPreferences)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleJoin = async () => {
    setJoining(true)
    setError(null)
    try {
      await activateWatchSession(session.code, guestSessionId)
      router.refresh() // Will show ActiveSessionView with recommendations
    } catch (err) {
      console.error('Failed to join:', err)
      setError('Failed to join session. Please try again.')
      setJoining(false)
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  // User needs to rate some movies first
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <Header showActions={false} />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm text-primary mb-4">
              <Users className="w-4 h-4" />
              Watch Together Invite
            </div>
            <h1 className="text-2xl font-bold mb-2">
              You have been invited to watch together
            </h1>
            <p className="text-muted-foreground">
              Rate a few movies so we can find something you will both enjoy
            </p>
          </div>

          <QuickOnboarding
            onComplete={handleOnboardingComplete}
            guestSessionId={guestSessionId}
          />
        </div>
      </div>
    )
  }

  // Ready to join
  return (
    <div className="min-h-screen bg-background">
      <Header showActions={false} />
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-card border rounded-lg p-8 text-center">
          <div className="text-6xl mb-6">🎬</div>
          <h1 className="text-2xl font-bold mb-3">
            Ready to Watch Together
          </h1>
          <p className="text-muted-foreground mb-8">
            Join the session to find something you will both enjoy watching.
          </p>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <Button
            onClick={handleJoin}
            disabled={joining}
            size="lg"
            className="w-full"
          >
            {joining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Joining...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Join Session
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
