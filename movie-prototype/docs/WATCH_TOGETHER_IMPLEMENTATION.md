# Watch Together Feature - Implementation Guide

## Overview

This document outlines the phased implementation of the "Watch Together" feature, which allows two users to get joint movie recommendations in a real-time synced session.

**Goal**: MVP to validate whether users want collaborative movie recommendations.

---

## Architecture Summary

```
┌─────────────┐     ┌─────────────┐
│   Host      │     │   Guest     │
│   Browser   │     │   Browser   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │   Supabase        │
       │   Realtime        │
       └────────┬──────────┘
                │
       ┌────────▼────────┐
       │ watch_sessions  │
       │     table       │
       └────────┬────────┘
                │
       ┌────────▼────────┐
       │  Gemini API     │
       │ (joint recs)    │
       └─────────────────┘
```

**Key Decisions:**
- Session duration: 2 hours (reasonable for deciding what to watch)
- Skip all recommendations: Generate 15 more
- Anonymous guests: Prompt to create account after session ends
- Real-time sync via Supabase Realtime subscriptions

---

## Phase 1: Database & Core Infrastructure

**Goal**: Set up the data layer for watch sessions.

### 1.1 Create Migration File

Create `supabase/migrations/XXXXXX_watch_sessions.sql`:

```sql
-- Watch Together sessions
CREATE TABLE watch_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(6) UNIQUE NOT NULL,

  -- Participants (references your existing sessions table)
  host_session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  guest_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- Session state
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  -- Possible values: 'waiting', 'active', 'completed', 'expired'

  -- Recommendations (stored as JSONB for MVP simplicity)
  recommendations JSONB DEFAULT '[]'::jsonb,
  current_index INTEGER DEFAULT 0,

  -- Voting state for current movie
  host_vote VARCHAR(10), -- 'skip' | 'watch' | null
  guest_vote VARCHAR(10), -- 'skip' | 'watch' | null

  -- Result
  chosen_movie JSONB, -- The movie they decided to watch

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 hours',

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'active', 'completed', 'expired')),
  CONSTRAINT valid_votes CHECK (
    (host_vote IS NULL OR host_vote IN ('skip', 'watch')) AND
    (guest_vote IS NULL OR guest_vote IN ('skip', 'watch'))
  )
);

-- Index for looking up sessions by code
CREATE INDEX idx_watch_sessions_code ON watch_sessions(code);

-- Index for cleanup job
CREATE INDEX idx_watch_sessions_expires_at ON watch_sessions(expires_at)
  WHERE status NOT IN ('completed', 'expired');

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE watch_sessions;

-- RLS Policies
ALTER TABLE watch_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view sessions they're part of
CREATE POLICY "Users can view their sessions" ON watch_sessions
  FOR SELECT USING (
    host_session_id = auth.uid() OR
    guest_session_id = auth.uid() OR
    (status = 'waiting' AND guest_session_id IS NULL) -- Allow viewing to join
  );

-- Only host can create
CREATE POLICY "Users can create sessions" ON watch_sessions
  FOR INSERT WITH CHECK (host_session_id = auth.uid());

-- Participants can update
CREATE POLICY "Participants can update sessions" ON watch_sessions
  FOR UPDATE USING (
    host_session_id = auth.uid() OR guest_session_id = auth.uid()
  );
```

### 1.2 Create Type Definitions

Add to `lib/types.ts`:

```typescript
// Watch Together types
export type WatchSessionStatus = 'waiting' | 'active' | 'completed' | 'expired';
export type SessionVote = 'skip' | 'watch' | null;

export interface WatchSession {
  id: string;
  code: string;
  host_session_id: string;
  guest_session_id: string | null;
  status: WatchSessionStatus;
  recommendations: JointRecommendation[];
  current_index: number;
  host_vote: SessionVote;
  guest_vote: SessionVote;
  chosen_movie: JointRecommendation | null;
  created_at: string;
  expires_at: string;
}

export interface JointRecommendation {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: number;
  genres: string[];
  runtime: number | null;
  vote_average: number;
  overview: string;
  streaming_platforms: string[];
}
```

### 1.3 Create Database Helper Functions

Create `lib/watch-session-helpers.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import type { WatchSession } from '@/lib/types';

// Generate a short, URL-safe code
function generateSessionCode(): string {
  return nanoid(6);
}

export async function createWatchSession(hostSessionId: string): Promise<WatchSession> {
  const supabase = await createClient();

  const code = generateSessionCode();

  const { data, error } = await supabase
    .from('watch_sessions')
    .insert({
      code,
      host_session_id: hostSessionId,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data;
}

export async function getWatchSessionByCode(code: string): Promise<WatchSession | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('watch_sessions')
    .select('*')
    .eq('code', code)
    .single();

  if (error) return null;
  return data;
}

export async function joinWatchSession(
  code: string,
  guestSessionId: string
): Promise<WatchSession> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('watch_sessions')
    .update({
      guest_session_id: guestSessionId,
      status: 'active'
    })
    .eq('code', code)
    .eq('status', 'waiting')
    .select()
    .single();

  if (error) throw new Error(`Failed to join session: ${error.message}`);
  return data;
}

export async function updateSessionVote(
  sessionId: string,
  isHost: boolean,
  vote: 'skip' | 'watch'
): Promise<WatchSession> {
  const supabase = await createClient();

  const updateField = isHost ? 'host_vote' : 'guest_vote';

  const { data, error } = await supabase
    .from('watch_sessions')
    .update({ [updateField]: vote })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update vote: ${error.message}`);
  return data;
}

export async function advanceToNextMovie(sessionId: string): Promise<WatchSession> {
  const supabase = await createClient();

  // Reset votes and increment index
  const { data, error } = await supabase
    .from('watch_sessions')
    .update({
      current_index: supabase.rpc('increment', { row_id: sessionId }),
      host_vote: null,
      guest_vote: null
    })
    .eq('id', sessionId)
    .select()
    .single();

  // Alternative without RPC:
  // First fetch current index, then update with incremented value

  if (error) throw new Error(`Failed to advance: ${error.message}`);
  return data;
}

export async function completeSession(
  sessionId: string,
  chosenMovie: JointRecommendation
): Promise<WatchSession> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('watch_sessions')
    .update({
      status: 'completed',
      chosen_movie: chosenMovie
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to complete session: ${error.message}`);
  return data;
}
```

### 1.4 Acceptance Criteria

- [ ] Migration runs successfully
- [ ] Can create a watch session and get back a code
- [ ] Can retrieve a session by code
- [ ] Can join a session as guest
- [ ] Realtime subscription works on table updates

---

## Phase 2: Session Creation & Sharing (Host Flow)

**Goal**: Host can create a session and get a shareable link.

### 2.1 Create Watch Together Button Component

Create `components/watch-together-button.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { WatchTogetherModal } from './watch-together-modal';

export function WatchTogetherButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
      >
        <Users className="w-4 h-4 mr-2" />
        Watch Together
      </Button>

      <WatchTogetherModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

### 2.2 Create Host Modal Component

Create `components/watch-together-modal.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Loader2 } from 'lucide-react';
import { createWatchSession } from '@/lib/watch-session-helpers';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function WatchTogetherModal({ isOpen, onClose }: Props) {
  const [session, setSession] = useState<WatchSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const shareUrl = session
    ? `${window.location.origin}/watch/${session.code}`
    : '';

  // Create session when modal opens
  useEffect(() => {
    if (isOpen && !session) {
      setLoading(true);
      createWatchSession(/* get current session ID */)
        .then(setSession)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Subscribe to session updates (waiting for guest)
  useEffect(() => {
    if (!session) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`watch-session:${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'watch_sessions',
        filter: `id=eq.${session.id}`
      }, (payload) => {
        if (payload.new.status === 'active') {
          // Guest joined! Navigate to session
          router.push(`/watch/${session.code}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, router]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Watch Together</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with your watch partner:
            </p>

            <div className="flex gap-2">
              <Input value={shareUrl} readOnly />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Waiting for them to join...
            </div>

            <Button variant="ghost" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 2.3 Add Button to Recommendations Page

Update the recommendations page to include the Watch Together button next to existing actions.

### 2.4 Acceptance Criteria

- [ ] "Watch Together" button appears on recommendations page
- [ ] Clicking opens modal and creates session
- [ ] Shareable link is displayed and copyable
- [ ] Modal shows waiting state
- [ ] When guest joins, host is redirected to session view

---

## Phase 3: Guest Join Flow

**Goal**: Guest can open link and join session (with quick onboarding if needed).

### 3.1 Create Join Page Route

Create `app/watch/[code]/page.tsx`:

```typescript
import { getWatchSessionByCode } from '@/lib/watch-session-helpers';
import { getSession } from '@/lib/session'; // Your existing session helper
import { redirect } from 'next/navigation';
import { JoinSessionView } from './join-session-view';
import { ActiveSessionView } from './active-session-view';
import { ExpiredSessionView } from './expired-session-view';

interface Props {
  params: { code: string };
}

export default async function WatchSessionPage({ params }: Props) {
  const { code } = params;
  const watchSession = await getWatchSessionByCode(code);
  const userSession = await getSession();

  // Session not found
  if (!watchSession) {
    return <SessionNotFound />;
  }

  // Session expired
  if (watchSession.status === 'expired' ||
      new Date(watchSession.expires_at) < new Date()) {
    return <ExpiredSessionView />;
  }

  // Check if current user is host or guest
  const isHost = userSession?.id === watchSession.host_session_id;
  const isGuest = userSession?.id === watchSession.guest_session_id;

  // Session is active - show the synced view
  if (watchSession.status === 'active' && (isHost || isGuest)) {
    return (
      <ActiveSessionView
        session={watchSession}
        isHost={isHost}
      />
    );
  }

  // Session is waiting and user is not host - show join flow
  if (watchSession.status === 'waiting' && !isHost) {
    return (
      <JoinSessionView
        session={watchSession}
        hasPreferences={/* check if user has rated movies */}
      />
    );
  }

  // Host viewing their waiting session
  if (watchSession.status === 'waiting' && isHost) {
    return <HostWaitingView session={watchSession} />;
  }

  // Fallback
  return <SessionNotFound />;
}
```

### 3.2 Create Join Session View Component

Create `app/watch/[code]/join-session-view.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MovieInputForm } from '@/components/movie-input-form';
import { joinWatchSession } from '@/lib/watch-session-helpers';
import { useRouter } from 'next/navigation';

interface Props {
  session: WatchSession;
  hasPreferences: boolean;
}

export function JoinSessionView({ session, hasPreferences }: Props) {
  const [showOnboarding, setShowOnboarding] = useState(!hasPreferences);
  const [joining, setJoining] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinWatchSession(session.code, /* current session id */);
      router.refresh(); // Will show ActiveSessionView
    } catch (error) {
      console.error('Failed to join:', error);
    } finally {
      setJoining(false);
    }
  };

  // User needs to rate some movies first
  if (showOnboarding) {
    return (
      <div className="container max-w-lg mx-auto py-8">
        <Card className="p-6">
          <h1 className="text-xl font-semibold mb-2">
            You've been invited to watch together
          </h1>
          <p className="text-muted-foreground mb-6">
            Rate a few movies so we can find something you'll both enjoy:
          </p>

          <MovieInputForm
            minMovies={3}
            maxMovies={3}
            onComplete={() => setShowOnboarding(false)}
            submitLabel="Continue"
          />
        </Card>
      </div>
    );
  }

  // Ready to join
  return (
    <div className="container max-w-lg mx-auto py-8">
      <Card className="p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">
          You've been invited
        </h1>
        <p className="text-muted-foreground mb-6">
          Join to find something you'll both enjoy watching.
        </p>

        <Button
          onClick={handleJoin}
          disabled={joining}
          className="w-full"
        >
          {joining ? 'Joining...' : 'Join Session'}
        </Button>
      </Card>
    </div>
  );
}
```

### 3.3 Acceptance Criteria

- [ ] Guest can open link and see join screen
- [ ] If guest has no preferences, they see 3-movie quick onboarding
- [ ] After onboarding/clicking join, guest is added to session
- [ ] Session status changes to 'active'
- [ ] Both users are redirected to active session view

---

## Phase 4: Joint Recommendations Generation

**Goal**: Generate recommendations that work for both users' preferences.

### 4.1 Create Joint Recommendations Service

Create `lib/joint-recommendations-service.ts`:

```typescript
'use server';

import { generateRecommendationsFromMovies } from '@/lib/gemini';
import { enrichWithTMDBData } from '@/lib/tmdb';
import { getUserMovies, getUserStreamingPlatforms } from '@/lib/db-helpers';
import type { JointRecommendation, UserMovie } from '@/lib/types';

interface JointPreferences {
  hostMovies: UserMovie[];
  guestMovies: UserMovie[];
  sharedPlatforms: string[];
}

export async function generateJointRecommendations(
  hostSessionId: string,
  guestSessionId: string
): Promise<JointRecommendation[]> {
  // Fetch both users' data in parallel
  const [hostMovies, guestMovies, hostPlatforms, guestPlatforms] = await Promise.all([
    getUserMovies(hostSessionId),
    getUserMovies(guestSessionId),
    getUserStreamingPlatforms(hostSessionId),
    getUserStreamingPlatforms(guestSessionId),
  ]);

  // Find shared streaming platforms
  const sharedPlatforms = hostPlatforms.filter(p =>
    guestPlatforms.includes(p)
  );

  // Build joint prompt context
  const jointPrompt = buildJointPrompt({
    hostMovies,
    guestMovies,
    sharedPlatforms,
  });

  // Generate recommendations via Gemini
  const rawRecommendations = await generateJointRecommendationsFromGemini(jointPrompt);

  // Enrich with TMDB data
  const enrichedRecommendations = await enrichWithTMDBData(rawRecommendations);

  // Filter to shared platforms if available
  // (or show all with platform availability info)

  return enrichedRecommendations;
}

function buildJointPrompt(prefs: JointPreferences): string {
  const hostLoved = prefs.hostMovies
    .filter(m => m.rating === 'loved')
    .map(m => m.title);
  const hostLiked = prefs.hostMovies
    .filter(m => m.rating === 'liked')
    .map(m => m.title);
  const hostHated = prefs.hostMovies
    .filter(m => m.rating === 'hated')
    .map(m => m.title);

  const guestLoved = prefs.guestMovies
    .filter(m => m.rating === 'loved')
    .map(m => m.title);
  const guestLiked = prefs.guestMovies
    .filter(m => m.rating === 'liked')
    .map(m => m.title);
  const guestHated = prefs.guestMovies
    .filter(m => m.rating === 'hated')
    .map(m => m.title);

  return `
Two users want to find a movie to watch together. Recommend 15 movies they would BOTH enjoy.

USER 1 PREFERENCES:
- Loved: ${hostLoved.join(', ') || 'None specified'}
- Liked: ${hostLiked.join(', ') || 'None specified'}
- Hated: ${hostHated.join(', ') || 'None specified'}

USER 2 PREFERENCES:
- Loved: ${guestLoved.join(', ') || 'None specified'}
- Liked: ${guestLiked.join(', ') || 'None specified'}
- Hated: ${guestHated.join(', ') || 'None specified'}

IMPORTANT RULES:
1. AVOID movies similar in style/genre to what EITHER user hated
2. PRIORITIZE movies that match tastes BOTH users loved
3. Find common ground - look for overlapping genres, directors, eras, or themes
4. Mix well-known crowd-pleasers with some interesting discoveries
5. Only recommend movies, not TV shows

${prefs.sharedPlatforms.length > 0
  ? `They share these streaming platforms: ${prefs.sharedPlatforms.join(', ')}`
  : 'Consider movies available on major streaming platforms.'}

Return exactly 15 movie recommendations as a JSON array.
  `.trim();
}
```

### 4.2 Update Gemini Service

Add to `lib/gemini.ts`:

```typescript
export async function generateJointRecommendationsFromGemini(
  prompt: string
): Promise<GeminiRecommendation[]> {
  // Similar to existing generateRecommendationsFromMovies
  // but with the joint prompt

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8, // Slightly higher for variety
      topP: 0.95,
    },
  });

  // Parse and return recommendations
  // (reuse existing parsing logic)
}
```

### 4.3 Trigger Generation on Session Activation

When guest joins and session becomes active, generate recommendations:

```typescript
// In joinWatchSession or a separate function
export async function activateWatchSession(
  code: string,
  guestSessionId: string
): Promise<WatchSession> {
  const supabase = await createClient();

  // Get session to find host
  const session = await getWatchSessionByCode(code);
  if (!session) throw new Error('Session not found');

  // Generate joint recommendations
  const recommendations = await generateJointRecommendations(
    session.host_session_id,
    guestSessionId
  );

  // Update session with guest and recommendations
  const { data, error } = await supabase
    .from('watch_sessions')
    .update({
      guest_session_id: guestSessionId,
      status: 'active',
      recommendations,
      current_index: 0,
    })
    .eq('code', code)
    .select()
    .single();

  if (error) throw new Error(`Failed to activate session: ${error.message}`);
  return data;
}
```

### 4.4 Acceptance Criteria

- [ ] Joint recommendations are generated when session activates
- [ ] Recommendations consider both users' preferences
- [ ] Movies that either user hated are avoided
- [ ] Recommendations are stored in session

---

## Phase 5: Real-Time Synced Session View

**Goal**: Both users see the same movie and can vote together.

### 5.1 Create Active Session View

Create `app/watch/[code]/active-session-view.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThumbsDown, Check, Loader2 } from 'lucide-react';
import { updateSessionVote, advanceToNextMovie, completeSession } from '@/lib/watch-session-helpers';
import { MatchFoundView } from './match-found-view';
import { generateMoreRecommendations } from '@/lib/joint-recommendations-service';

interface Props {
  session: WatchSession;
  isHost: boolean;
}

export function ActiveSessionView({ session: initialSession, isHost }: Props) {
  const [session, setSession] = useState(initialSession);
  const [voting, setVoting] = useState(false);

  const currentMovie = session.recommendations[session.current_index];
  const myVote = isHost ? session.host_vote : session.guest_vote;
  const theirVote = isHost ? session.guest_vote : session.host_vote;

  // Subscribe to realtime updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`watch-session:${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'watch_sessions',
        filter: `id=eq.${session.id}`
      }, (payload) => {
        setSession(payload.new as WatchSession);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session.id]);

  // Handle vote logic - both users must agree
  useEffect(() => {
    if (!session.host_vote || !session.guest_vote) return;

    // Both voted - determine action
    if (session.host_vote === 'skip' && session.guest_vote === 'skip') {
      // Both skipped - advance to next movie
      handleBothSkipped();
    } else if (session.host_vote === 'watch' && session.guest_vote === 'watch') {
      // Both want to watch - complete!
      handleMovieChosen();
    }
    // Mixed votes (one skip, one watch): wait for the skipper to reconsider
    // or show prompt to discuss
  }, [session.host_vote, session.guest_vote]);

  const handleBothSkipped = async () => {
    // Check if we need more recommendations
    if (session.current_index >= session.recommendations.length - 1) {
      // Generate 15 more
      await generateMoreRecommendations(session.id);
    } else {
      await advanceToNextMovie(session.id);
    }
  };

  const handleMovieChosen = async () => {
    await completeSession(session.id, currentMovie);
  };

  const vote = async (choice: 'skip' | 'watch') => {
    setVoting(true);
    try {
      await updateSessionVote(session.id, isHost, choice);
    } finally {
      setVoting(false);
    }
  };

  // Session completed - show match
  if (session.status === 'completed' && session.chosen_movie) {
    return <MatchFoundView movie={session.chosen_movie} />;
  }

  // No more movies (edge case - shouldn't happen with auto-generate)
  if (!currentMovie) {
    return <NoMoreMovies sessionId={session.id} />;
  }

  return (
    <div className="container max-w-lg mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm">
          ← Exit
        </Button>
        <div className="flex items-center text-sm text-muted-foreground">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
          Watching together
        </div>
      </div>

      {/* Movie Card */}
      <Card className="overflow-hidden">
        {currentMovie.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`}
            alt={currentMovie.title}
            className="w-full aspect-[2/3] object-cover"
          />
        )}

        <div className="p-4">
          <h2 className="text-xl font-semibold">{currentMovie.title}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span>⭐ {currentMovie.vote_average.toFixed(1)}</span>
            <span>•</span>
            <span>{currentMovie.genres.slice(0, 2).join(', ')}</span>
            <span>•</span>
            <span>{currentMovie.release_year}</span>
          </div>

          {currentMovie.streaming_platforms.length > 0 && (
            <div className="mt-3 text-sm">
              Available on: {currentMovie.streaming_platforms.join(', ')}
            </div>
          )}
        </div>
      </Card>

      {/* Voting Buttons */}
      <div className="flex gap-4 mt-6">
        <Button
          variant="outline"
          className="flex-1 h-14"
          onClick={() => vote('skip')}
          disabled={voting || myVote === 'skip'}
        >
          <ThumbsDown className="w-5 h-5 mr-2" />
          Skip
          {myVote === 'skip' && <Check className="w-4 h-4 ml-2 text-green-500" />}
        </Button>

        <Button
          className="flex-1 h-14"
          onClick={() => vote('watch')}
          disabled={voting || myVote === 'watch'}
        >
          <Check className="w-5 h-5 mr-2" />
          Watch This
        </Button>
      </div>

      {/* Voting Status */}
      <div className="text-center mt-4 text-sm text-muted-foreground">
        {myVote === 'skip' && !theirVote && (
          'Waiting for your partner...'
        )}
        {theirVote === 'skip' && !myVote && (
          'Your partner wants to skip'
        )}
        {!myVote && !theirVote && (
          'Both must skip to see next movie'
        )}
      </div>
    </div>
  );
}
```

### 5.2 Create Match Found View

Create `app/watch/[code]/match-found-view.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import type { JointRecommendation } from '@/lib/types';

interface Props {
  movie: JointRecommendation;
  onFindAnother: () => void;
}

export function MatchFoundView({ movie, onFindAnother }: Props) {
  const router = useRouter();

  return (
    <div className="container max-w-lg mx-auto py-8 text-center">
      <div className="text-4xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold mb-2">You're watching</h1>

      <Card className="overflow-hidden my-6">
        {movie.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            className="w-full aspect-[2/3] object-cover"
          />
        )}
        <div className="p-4">
          <h2 className="text-xl font-semibold">{movie.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {movie.genres.slice(0, 2).join(', ')} • {movie.release_year}
          </p>
        </div>
      </Card>

      {movie.streaming_platforms.length > 0 && (
        <Button className="w-full mb-3">
          Open in {movie.streaming_platforms[0]}
        </Button>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onFindAnother}
        >
          Find Another
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push('/recommendations')}
        >
          Done
        </Button>
      </div>

      {/* Account prompt for anonymous users */}
      <AnonymousAccountPrompt />
    </div>
  );
}
```

### 5.3 Create Account Prompt for Anonymous Users

Create `components/anonymous-account-prompt.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session'; // Your existing hook

export function AnonymousAccountPrompt() {
  const { session, isAnonymous } = useSession();
  const [dismissed, setDismissed] = useState(false);

  if (!isAnonymous || dismissed) return null;

  return (
    <Card className="p-4 mt-6 bg-muted">
      <p className="text-sm mb-3">
        Create an account to save your preferences and get personalized recommendations.
      </p>
      <div className="flex gap-2">
        <Button size="sm" asChild>
          <a href="/signup">Create Account</a>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDismissed(true)}
        >
          Not now
        </Button>
      </div>
    </Card>
  );
}
```

### 5.4 Acceptance Criteria

- [ ] Both users see the same movie card
- [ ] Voting updates are synced in real-time
- [ ] Both users must skip to advance
- [ ] Both users must vote "Watch This" to complete (consensus required)
- [ ] Match found screen shows chosen movie
- [ ] "Find Another" resets and continues session
- [ ] Anonymous users see account creation prompt

---

## Phase 6: Polish & Edge Cases

**Goal**: Handle errors, expiry, and cleanup gracefully.

### 6.1 Session Expiry Handling

Create a cron job or edge function to clean up expired sessions:

```sql
-- Run periodically to expire old sessions
UPDATE watch_sessions
SET status = 'expired'
WHERE status IN ('waiting', 'active')
  AND expires_at < NOW();
```

### 6.2 Error States

Create `app/watch/[code]/error-states.tsx`:

```typescript
export function SessionNotFound() {
  return (
    <div className="container max-w-lg mx-auto py-16 text-center">
      <h1 className="text-xl font-semibold mb-2">Session not found</h1>
      <p className="text-muted-foreground mb-6">
        This link may be invalid or the session was cancelled.
      </p>
      <Button asChild>
        <a href="/recommendations">Go to Recommendations</a>
      </Button>
    </div>
  );
}

export function ExpiredSessionView() {
  return (
    <div className="container max-w-lg mx-auto py-16 text-center">
      <h1 className="text-xl font-semibold mb-2">Session expired</h1>
      <p className="text-muted-foreground mb-6">
        This session has expired. Ask your friend for a new link.
      </p>
      <Button asChild>
        <a href="/recommendations">Go to Recommendations</a>
      </Button>
    </div>
  );
}

export function PartnerDisconnected() {
  return (
    <div className="container max-w-lg mx-auto py-16 text-center">
      <h1 className="text-xl font-semibold mb-2">Partner disconnected</h1>
      <p className="text-muted-foreground mb-6">
        Your watch partner has left the session.
      </p>
      <Button asChild>
        <a href="/recommendations">Go to Recommendations</a>
      </Button>
    </div>
  );
}
```

### 6.3 Loading States

Add skeleton loaders for:
- Session creation
- Waiting for partner
- Generating recommendations
- Loading more movies

### 6.4 Exit Session Flow

```typescript
export async function exitWatchSession(sessionId: string, isHost: boolean) {
  const supabase = await createClient();

  if (isHost) {
    // Host leaving cancels the session
    await supabase
      .from('watch_sessions')
      .update({ status: 'expired' })
      .eq('id', sessionId);
  } else {
    // Guest leaving just removes them
    await supabase
      .from('watch_sessions')
      .update({
        guest_session_id: null,
        status: 'waiting'
      })
      .eq('id', sessionId);
  }
}
```

### 6.5 Acceptance Criteria

- [ ] Expired sessions show appropriate message
- [ ] Invalid links show not found state
- [ ] Loading states are shown during async operations
- [ ] Exit button works for both host and guest
- [ ] Session cleanup runs automatically

---

## Testing Checklist

### Manual Testing Scenarios

1. **Happy Path**
   - [ ] Host creates session, gets link
   - [ ] Guest opens link, joins
   - [ ] Both see same recommendations
   - [ ] Voting works bidirectionally
   - [ ] Movie selection completes session

2. **Anonymous Guest**
   - [ ] Guest without account can join
   - [ ] Quick onboarding works
   - [ ] Account prompt shown after completion

3. **Edge Cases**
   - [ ] Expired link shows error
   - [ ] Host cancelling notifies guest
   - [ ] Network disconnection handled
   - [ ] Skip all 15 generates more

4. **Mobile**
   - [ ] Responsive on small screens
   - [ ] Share link works on mobile
   - [ ] Touch targets are adequate

---

## File Structure Summary

```
movie-prototype/
├── app/
│   └── watch/
│       └── [code]/
│           ├── page.tsx
│           ├── join-session-view.tsx
│           ├── active-session-view.tsx
│           ├── match-found-view.tsx
│           └── error-states.tsx
├── components/
│   ├── watch-together-button.tsx
│   ├── watch-together-modal.tsx
│   └── anonymous-account-prompt.tsx
├── lib/
│   ├── watch-session-helpers.ts
│   └── joint-recommendations-service.ts
└── supabase/
    └── migrations/
        └── XXXXXX_watch_sessions.sql
```

---

## Dependencies to Add

```bash
npm install nanoid
```

---

## Rollout Plan

1. **Phase 1-2**: Database + Host flow (internal testing)
2. **Phase 3-4**: Guest flow + recommendations (internal testing)
3. **Phase 5**: Real-time sync (internal testing)
4. **Phase 6**: Polish (QA)
5. **Launch**: Feature flag rollout to % of users
