'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('[ErrorBoundary]', error)
  }, [error])

  // Determine error type for user-friendly message
  const getErrorInfo = () => {
    const message = error.message?.toLowerCase() || ''

    if (message.includes('session') || message.includes('auth')) {
      return {
        title: 'Session Expired',
        description: 'Your session has expired. Please start fresh.',
        action: 'start-over'
      }
    }

    if (message.includes('network') || message.includes('fetch')) {
      return {
        title: 'Connection Error',
        description: 'Unable to connect. Please check your internet connection.',
        action: 'retry'
      }
    }

    if (message.includes('database') || message.includes('supabase')) {
      return {
        title: 'Database Error',
        description: 'There was a problem loading your data. Please try again.',
        action: 'retry'
      }
    }

    return {
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Please try again or start fresh.',
      action: 'both'
    }
  }

  const errorInfo = getErrorInfo()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-foreground">
            {errorInfo.title}
          </h1>
          <p className="text-muted-foreground">
            {errorInfo.description}
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {(errorInfo.action === 'retry' || errorInfo.action === 'both') && (
            <Button onClick={reset} variant="default">
              Try again
            </Button>
          )}
          {(errorInfo.action === 'start-over' || errorInfo.action === 'both') && (
            <Button asChild variant="outline">
              <Link href="/onboarding">Start Fresh</Link>
            </Button>
          )}
        </div>

        <div className="pt-4 border-t border-border">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}


