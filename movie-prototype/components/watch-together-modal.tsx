'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check, Loader2, X } from 'lucide-react'
import { createWatchSession } from '@/lib/watch-session-helpers'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { WatchSession } from '@/lib/types'

interface WatchTogetherModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
}

export function WatchTogetherModal({ isOpen, onClose, sessionId }: WatchTogetherModalProps) {
  const [session, setSession] = useState<WatchSession | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const shareUrl = session
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/watch/${session.code}`
    : ''

  // Create session when modal opens
  useEffect(() => {
    if (isOpen && !session && !loading) {
      setLoading(true)
      setError(null)
      createWatchSession(sessionId)
        .then(setSession)
        .catch((err) => {
          console.error('Failed to create session:', err)
          setError('Failed to create session. Please try again.')
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, session, sessionId, loading])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSession(null)
      setCopied(false)
      setError(null)
    }
  }, [isOpen])

  // Subscribe to session updates (waiting for guest)
  useEffect(() => {
    if (!session) return

    const supabase = createClient()
    const channel = supabase
      .channel(`watch-session:${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'watch_sessions',
        filter: `id=eq.${session.id}`
      }, (payload) => {
        const updatedSession = payload.new as WatchSession
        if (updatedSession.status === 'active') {
          // Guest joined! Navigate to session
          router.push(`/watch/${session.code}`)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, router])

  const copyLink = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [shareUrl])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card p-6 rounded-lg border shadow-xl max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Watch Together</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Creating session...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={() => {
              setError(null)
              setLoading(true)
              createWatchSession(sessionId)
                .then(setSession)
                .catch((err) => {
                  console.error('Failed to create session:', err)
                  setError('Failed to create session. Please try again.')
                })
                .finally(() => setLoading(false))
            }}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with your watch partner to find something you will both enjoy:
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 rounded-md border bg-background text-sm font-mono"
              />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {session?.code && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Or share this code:</p>
                <p className="text-2xl font-bold font-mono tracking-widest">{session.code}</p>
              </div>
            )}

            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Waiting for them to join...
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Session expires in 2 hours
            </p>

            <Button variant="ghost" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
