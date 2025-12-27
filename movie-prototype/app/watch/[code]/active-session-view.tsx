'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { ThumbsDown, Check, Loader2, ChevronLeft, Star, WifiOff, Wifi } from 'lucide-react'
import {
  updateSessionVote,
  advanceToNextMovie,
  completeSession,
  exitWatchSession
} from '@/lib/watch-session-helpers'
import { generateMoreJointRecommendations } from '@/lib/joint-recommendations-service'
import { MatchFoundView } from './match-found-view'
import { PartnerDisconnected, ConnectionError } from './error-states'
import { useRouter } from 'next/navigation'
import type { WatchSession, JointRecommendation } from '@/lib/types'

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

interface ActiveSessionViewProps {
  session: WatchSession
  isHost: boolean
}

export function ActiveSessionView({ session: initialSession, isHost }: ActiveSessionViewProps) {
  const [session, setSession] = useState(initialSession)
  const [voting, setVoting] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const router = useRouter()
  const retryCountRef = useRef(0)

  const currentMovie = session.recommendations[session.current_index] as JointRecommendation | undefined
  const myVote = isHost ? session.host_vote : session.guest_vote
  const theirVote = isHost ? session.guest_vote : session.host_vote
  const isLastMovie = session.current_index >= session.recommendations.length - 1

  // Check for session expiry
  const isExpired = new Date(session.expires_at) < new Date()

  // Check for partner disconnect (guest left)
  const partnerDisconnected = !isHost && session.status === 'waiting'

  // Subscribe to realtime updates with connection status
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
        const updated = payload.new as WatchSession
        setSession(updated)
        retryCountRef.current = 0 // Reset retry count on successful update
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected')
        } else {
          setConnectionStatus('connecting')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id])

  const handleBothSkipped = useCallback(async () => {
    if (isLastMovie) {
      // Need more recommendations
      setLoadingMore(true)
      try {
        await generateMoreJointRecommendations(session.id)
      } catch (err) {
        console.error('Failed to generate more:', err)
      } finally {
        setLoadingMore(false)
      }
    } else {
      // Advance to next
      try {
        await advanceToNextMovie(session.id)
      } catch (err) {
        console.error('Failed to advance:', err)
      }
    }
  }, [session.id, isLastMovie])

  const handleMovieChosen = useCallback(async () => {
    if (!currentMovie) return
    try {
      await completeSession(session.id, currentMovie)
    } catch (err) {
      console.error('Failed to complete session:', err)
    }
  }, [session.id, currentMovie])

  // Handle vote logic - both users voted
  useEffect(() => {
    if (!session.host_vote || !session.guest_vote) return

    // Both voted - determine action
    if (session.host_vote === 'skip' && session.guest_vote === 'skip') {
      // Both skipped - advance to next movie
      handleBothSkipped()
    } else if (session.host_vote === 'watch' && session.guest_vote === 'watch') {
      // Both want to watch - complete!
      handleMovieChosen()
    }
    // If one wants to watch and other skips, the "watch" vote wins
    // This is handled by the watch button immediately completing
  }, [session.host_vote, session.guest_vote, handleBothSkipped, handleMovieChosen])

  const vote = async (choice: 'skip' | 'watch') => {
    if (voting || myVote) return

    setVoting(true)
    try {
      // Server handles authorization and determines if user is host/guest
      await updateSessionVote(session.id, choice)
      // Completion logic is handled by useEffect when realtime update arrives
    } catch (err) {
      console.error('Failed to vote:', err)
    } finally {
      setVoting(false)
    }
  }

  const handleExit = async () => {
    setExiting(true)
    try {
      // Server determines if user is host/guest and handles accordingly
      await exitWatchSession(session.id)
      router.push('/recommendations')
    } catch (err) {
      console.error('Failed to exit:', err)
      setExiting(false)
    }
  }

  // Handle retry for connection errors
  const handleRetry = useCallback(() => {
    retryCountRef.current += 1
    router.refresh()
  }, [router])

  // Session expired
  if (isExpired || session.status === 'expired') {
    return (
      <div className="min-h-screen bg-background">
        <Header showActions={false} />
        <div className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-card border rounded-xl p-8 text-center shadow-sm">
            <div className="text-6xl mb-6">⏰</div>
            <h1 className="text-2xl font-bold mb-3">Session Expired</h1>
            <p className="text-muted-foreground mb-8">
              This session has expired. Start a new Watch Together session from your recommendations.
            </p>
            <Button onClick={() => router.push('/recommendations')}>
              Go to Recommendations
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Partner disconnected (for guest when host cancels)
  if (partnerDisconnected) {
    return <PartnerDisconnected />
  }

  // Connection error with retry
  if (connectionStatus === 'disconnected' && retryCountRef.current < 3) {
    return (
      <ConnectionError
        onRetry={handleRetry}
        isRetrying={false}
      />
    )
  }

  // Session completed - show match
  if (session.status === 'completed' && session.chosen_movie) {
    return (
      <MatchFoundView
        movie={session.chosen_movie as JointRecommendation}
        sessionId={session.id}
        isHost={isHost}
      />
    )
  }

  // Loading more recommendations
  if (loadingMore) {
    return (
      <div className="min-h-screen bg-background">
        <Header showActions={false} />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Finding more movies...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Both of you are picky! Getting 15 more options.
          </p>
        </div>
      </div>
    )
  }

  // No movie to show (edge case)
  if (!currentMovie) {
    return (
      <div className="min-h-screen bg-background">
        <Header showActions={false} />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg font-medium">No recommendations available</p>
          <Button onClick={handleExit} className="mt-4">
            Exit Session
          </Button>
        </div>
      </div>
    )
  }

  const posterUrl = currentMovie.poster_path
    ? `https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`
    : null

  return (
    <div className="min-h-screen bg-background">
      <Header showActions={false} />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            disabled={exiting}
          >
            {exiting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Exit
              </>
            )}
          </Button>
          <div className="flex items-center text-sm text-muted-foreground">
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                <span className="hidden sm:inline">Watching together</span>
                <Wifi className="w-4 h-4 sm:hidden text-green-500" />
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-yellow-500" />
                <span className="hidden sm:inline">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 mr-2 text-destructive" />
                <span className="hidden sm:inline">Disconnected</span>
              </>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {session.current_index + 1} / {session.recommendations.length}
          </div>
        </div>

        {/* Movie Card */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-lg">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={currentMovie.title}
              className="w-full aspect-[2/3] object-cover"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
              <span className="text-4xl">🎬</span>
            </div>
          )}

          <div className="p-4">
            <h2 className="text-xl font-bold">{currentMovie.title}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
              {currentMovie.vote_average > 0 && (
                <>
                  <span className="flex items-center">
                    <Star className="w-3.5 h-3.5 text-yellow-500 mr-1 fill-yellow-500" />
                    {currentMovie.vote_average.toFixed(1)}
                  </span>
                  <span>•</span>
                </>
              )}
              {currentMovie.genres.length > 0 && (
                <>
                  <span>{currentMovie.genres.slice(0, 2).join(', ')}</span>
                  <span>•</span>
                </>
              )}
              <span>{currentMovie.release_year}</span>
              {currentMovie.runtime && (
                <>
                  <span>•</span>
                  <span>{currentMovie.runtime} min</span>
                </>
              )}
            </div>

            {currentMovie.overview && (
              <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                {currentMovie.overview}
              </p>
            )}

            {currentMovie.streaming_platforms.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {currentMovie.streaming_platforms.map(platform => (
                  <span
                    key={platform}
                    className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Voting Buttons */}
        <div className="flex gap-4 mt-6">
          <Button
            variant="outline"
            className="flex-1 h-14 text-base"
            onClick={() => vote('skip')}
            disabled={voting || myVote !== null}
          >
            <ThumbsDown className="w-5 h-5 mr-2" />
            Skip
            {myVote === 'skip' && <Check className="w-4 h-4 ml-2 text-green-500" />}
          </Button>

          <Button
            className="flex-1 h-14 text-base"
            onClick={() => vote('watch')}
            disabled={voting || myVote !== null}
          >
            <Check className="w-5 h-5 mr-2" />
            Watch This
            {myVote === 'watch' && <Check className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        {/* Voting Status */}
        <div className="text-center mt-4 text-sm text-muted-foreground h-6">
          {voting && (
            <span className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Voting...
            </span>
          )}
          {!voting && myVote === 'skip' && !theirVote && (
            <span className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Waiting for your partner...
            </span>
          )}
          {!voting && myVote === 'watch' && !theirVote && (
            <span className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Waiting for your partner to decide...
            </span>
          )}
          {!voting && theirVote === 'skip' && !myVote && (
            <span>Your partner wants to skip this one</span>
          )}
          {!voting && theirVote === 'watch' && !myVote && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              Your partner wants to watch this!
            </span>
          )}
          {!voting && !myVote && !theirVote && (
            <span>Both must skip to see the next movie</span>
          )}
        </div>
      </div>
    </div>
  )
}
