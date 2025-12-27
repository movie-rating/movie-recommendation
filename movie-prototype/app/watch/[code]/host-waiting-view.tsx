'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { Copy, Check, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { exitWatchSession } from '@/lib/watch-session-helpers'
import type { WatchSession } from '@/lib/types'

interface HostWaitingViewProps {
  session: WatchSession
}

export function HostWaitingView({ session: initialSession }: HostWaitingViewProps) {
  const [session, setSession] = useState(initialSession)
  const [copied, setCopied] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const router = useRouter()

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/watch/${session.code}`
    : ''

  // Subscribe to session updates (waiting for guest)
  useEffect(() => {
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
        setSession(updatedSession)

        if (updatedSession.status === 'active') {
          // Guest joined! Refresh to show active session
          router.refresh()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, router])

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

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await exitWatchSession(session.id)
      router.push('/recommendations')
    } catch (err) {
      console.error('Failed to cancel session:', err)
      setCancelling(false)
    }
  }

  // Calculate time remaining
  const expiresAt = new Date(session.expires_at)
  const now = new Date()
  const minutesRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000))
  const hoursRemaining = Math.floor(minutesRemaining / 60)
  const minsRemaining = minutesRemaining % 60

  return (
    <div className="min-h-screen bg-background">
      <Header showActions={false} />
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👥</div>
          <h1 className="text-2xl font-bold mb-2">Waiting for Your Partner</h1>
          <p className="text-muted-foreground">
            Share the link below and wait for them to join
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Share this link:
            </label>
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
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Or share this code:</p>
            <p className="text-3xl font-bold font-mono tracking-widest">{session.code}</p>
          </div>

          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-3" />
            <span>Waiting for them to join...</span>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Session expires in {hoursRemaining > 0 ? `${hoursRemaining}h ` : ''}{minsRemaining}m
          </p>

          <Button
            variant="ghost"
            className="w-full"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Cancelling...
              </>
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancel Session
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
