'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Home, RefreshCw, Users, AlertCircle } from 'lucide-react'

interface ErrorCardProps {
  emoji: string
  title: string
  description: string
  actions?: React.ReactNode
}

function ErrorCard({ emoji, title, description, actions }: ErrorCardProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header showActions={false} />
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-card border rounded-xl p-8 text-center shadow-sm">
          <div className="text-6xl mb-6">{emoji}</div>
          <h1 className="text-2xl font-bold mb-3">{title}</h1>
          <p className="text-muted-foreground mb-8">{description}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {actions || (
              <Button asChild>
                <Link href="/recommendations">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Recommendations
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SessionNotFound() {
  return (
    <ErrorCard
      emoji="🔍"
      title="Session Not Found"
      description="This link may be invalid or the session was cancelled by the host."
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/recommendations">
              <Home className="w-4 h-4 mr-2" />
              My Recommendations
            </Link>
          </Button>
          <Button asChild>
            <Link href="/onboarding">
              <Users className="w-4 h-4 mr-2" />
              Start Fresh
            </Link>
          </Button>
        </>
      }
    />
  )
}

export function ExpiredSessionView() {
  return (
    <ErrorCard
      emoji="⏰"
      title="Session Expired"
      description="This session has expired after 2 hours. Ask your friend for a new link to start another Watch Together session."
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/recommendations">
              <Home className="w-4 h-4 mr-2" />
              My Recommendations
            </Link>
          </Button>
        </>
      }
    />
  )
}

export function PartnerDisconnected() {
  return (
    <ErrorCard
      emoji="👋"
      title="Partner Disconnected"
      description="Your watch partner has left the session. You can start a new session from your recommendations page."
      actions={
        <>
          <Button asChild>
            <Link href="/recommendations">
              <Home className="w-4 h-4 mr-2" />
              Go to Recommendations
            </Link>
          </Button>
        </>
      }
    />
  )
}

export function SessionFullView() {
  return (
    <ErrorCard
      emoji="🚫"
      title="Session Full"
      description="This session already has two participants. Only one guest can join a Watch Together session."
      actions={
        <>
          <Button asChild>
            <Link href="/recommendations">
              <Home className="w-4 h-4 mr-2" />
              Go to Recommendations
            </Link>
          </Button>
        </>
      }
    />
  )
}

interface ConnectionErrorProps {
  onRetry: () => void
  isRetrying?: boolean
}

export function ConnectionError({ onRetry, isRetrying }: ConnectionErrorProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header showActions={false} />
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-card border rounded-xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Connection Lost</h1>
          <p className="text-muted-foreground mb-8">
            We lost connection to the session. This might be a temporary network issue.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onRetry} disabled={isRetrying}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Reconnecting...' : 'Try Again'}
            </Button>
            <Button asChild variant="outline">
              <Link href="/recommendations">
                <Home className="w-4 h-4 mr-2" />
                Exit Session
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function GeneratingRecommendations() {
  return (
    <div className="min-h-screen bg-background">
      <Header showActions={false} />
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-card border rounded-xl p-8 text-center shadow-sm">
          <div className="text-6xl mb-6 animate-bounce">🎬</div>
          <h1 className="text-2xl font-bold mb-3">Finding Perfect Matches</h1>
          <p className="text-muted-foreground mb-6">
            Analyzing both of your tastes to find movies you will both love...
          </p>
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
