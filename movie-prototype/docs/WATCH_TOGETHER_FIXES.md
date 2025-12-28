# Watch Together - Fixes Required

Audit performed on the Watch Together implementation. Items are prioritized by severity.

---

## Critical

### 1. Race Condition in advanceToNextMovie
**File:** `lib/watch-session-helpers.ts:183-222`

**Problem:** Two separate database queries to reset votes and increment index. Another vote could arrive between them.

**Fix:** Combine into a single atomic update or use a Postgres function:
```sql
CREATE OR REPLACE FUNCTION advance_watch_session(session_uuid UUID)
RETURNS watch_sessions AS $$
  UPDATE watch_sessions
  SET current_index = current_index + 1,
      host_vote = NULL,
      guest_vote = NULL
  WHERE id = session_uuid
    AND host_vote = 'skip'
    AND guest_vote = 'skip'
  RETURNING *;
$$ LANGUAGE sql;
```

---

### 2. Missing RLS Policies
**File:** `supabase/migrations/20241227_add_watch_sessions.sql`

**Problem:** Table has no row-level security. Any authenticated user could read/modify any session.

**Fix:** Add to migration:
```sql
ALTER TABLE watch_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their sessions" ON watch_sessions
  FOR SELECT USING (
    host_session_id = current_setting('app.session_id', true) OR
    guest_session_id = current_setting('app.session_id', true) OR
    (status = 'waiting' AND guest_session_id IS NULL)
  );

CREATE POLICY "Host can create sessions" ON watch_sessions
  FOR INSERT WITH CHECK (
    host_session_id = current_setting('app.session_id', true)
  );

CREATE POLICY "Participants can update" ON watch_sessions
  FOR UPDATE USING (
    host_session_id = current_setting('app.session_id', true) OR
    guest_session_id = current_setting('app.session_id', true)
  );
```

---

### 3. generateMoreJointRecommendations Resets Index
**File:** `lib/joint-recommendations-service.ts:200-201`

**Problem:** Calling `updateSessionRecommendations` resets `current_index` to 0, so users see old movies again.

**Fix:** Create a separate function that only appends recommendations without resetting index:
```typescript
export async function appendSessionRecommendations(
  sessionId: string,
  newRecommendations: JointRecommendation[]
): Promise<WatchSession> {
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('watch_sessions')
    .select('recommendations')
    .eq('id', sessionId)
    .single()

  const existing = (current?.recommendations || []) as JointRecommendation[]

  const { data, error } = await supabase
    .from('watch_sessions')
    .update({ recommendations: [...existing, ...newRecommendations] })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw new Error(`Failed to append recommendations: ${error.message}`)
  return data as WatchSession
}
```

---

## High

### 4. Voting Logic Contradicts Documentation
**Files:** `app/watch/[code]/active-session-view.tsx:116-118`, `lib/watch-session-helpers.ts:234-236`

**Problem:** Doc says "either voted watch = complete", but code requires both to vote 'watch'.

**Decision needed:** Pick one behavior and update accordingly.

**Option A (One watch wins - per doc):**
```typescript
// active-session-view.tsx
if (session.host_vote === 'watch' || session.guest_vote === 'watch') {
  handleMovieChosen()
}
```

**Option B (Both must agree - current):**
Update documentation to match current behavior.

---

### 5. Function Signature Mismatch
**File:** `app/watch/[code]/host-waiting-view.tsx:66`

**Problem:** Calls `exitWatchSession(session.id, true)` but function only takes one argument.

**Fix:**
```typescript
// Change from:
await exitWatchSession(session.id, true)

// To:
await exitWatchSession(session.id)
```

---

### 6. No Expiry Check Before Voting
**File:** `lib/watch-session-helpers.ts:151-176`

**Problem:** `updateSessionVote` doesn't verify session hasn't expired.

**Fix:** Add expiry check:
```typescript
export async function updateSessionVote(
  sessionId: string,
  vote: 'skip' | 'watch'
): Promise<WatchSession> {
  // ... existing code ...

  // Add after verifyParticipant
  if (new Date(session.expires_at) < new Date()) {
    throw new Error('Session has expired')
  }

  // ... rest of function
}
```

---

## Medium

### 7. partnerDisconnected Check Never True
**File:** `app/watch/[code]/active-session-view.tsx:45-46`

**Problem:** Check `!isHost && session.status === 'waiting'` is unreachable. If guest joined, status is 'active'.

**Fix:** This should detect when host leaves (sets status to 'expired'):
```typescript
const partnerDisconnected = session.status === 'expired' ||
  (!isHost && session.guest_session_id === null)
```

---

### 8. Modal Creates Orphan Sessions
**File:** `components/watch-together-modal.tsx:29-41`

**Problem:** Opening modal creates session. Closing and reopening creates another, leaving orphans.

**Fix:** Track created session ID and cancel it on modal close:
```typescript
useEffect(() => {
  if (!isOpen && session) {
    // Cancel the session when modal closes without guest joining
    exitWatchSession(session.id).catch(console.error)
    setSession(null)
  }
}, [isOpen])
```

---

### 9. "Find Another" Doesn't Work
**File:** `app/watch/[code]/match-found-view.tsx:36-40`

**Problem:** Just redirects to /recommendations instead of starting new session.

**Fix:** Either implement properly or remove the button:
```typescript
const handleFindAnother = async () => {
  // Option 1: Create new session with same participants
  // Option 2: Reset current session (clear chosen_movie, generate new recs)
  // Option 3: Remove button entirely for MVP
  router.push('/recommendations')
}
```

---

### 10. No pg_cron Configured
**File:** `supabase/migrations/20241227_watch_session_expiry.sql`

**Problem:** Function exists but isn't scheduled. Sessions don't auto-expire.

**Fix:** Enable pg_cron in Supabase dashboard, then:
```sql
SELECT cron.schedule(
  'expire-watch-sessions',
  '*/15 * * * *',
  'SELECT expire_watch_sessions()'
);
```

Or add client-side expiry handling in page.tsx.

---

## Low

### 11. Unused Props in MatchFoundView
**File:** `app/watch/[code]/match-found-view.tsx:29`

**Problem:** `sessionId` and `isHost` props defined but not used.

**Fix:** Remove from interface and component signature, or use them for "Find Another" feature.

---

### 12. Missing AnonymousAccountPrompt
**File:** `app/watch/[code]/match-found-view.tsx:157-158`

**Problem:** Placeholder comment but no implementation.

**Fix:** Either implement or remove the comment:
```typescript
{isAnonymous && <AnonymousAccountPrompt />}
```

---

### 13. Type Casting Instead of Proper Types
**Files:** Multiple files in `lib/watch-session-helpers.ts`

**Problem:** Repeated `as WatchSession` casts.

**Fix:** Use Supabase generated types or create proper type guards.

---

### 14. Inconsistent Error Handling
**File:** `lib/watch-session-helpers.ts`

**Problem:** Some functions return `null`, others `throw`. Inconsistent patterns.

**Fix:** Standardize on one approach. Recommendation: throw errors for mutations, return null for queries.

---

## Checklist

- [x] Fix race condition in advanceToNextMovie
- [x] Add RLS policies to migration
- [x] Fix index reset when generating more recommendations
- [x] Decide on voting logic (one watch wins vs both required) - kept "both must agree"
- [x] Fix exitWatchSession call signature
- [x] Add expiry check before voting
- [x] Fix partnerDisconnected detection
- [x] Handle modal close orphan sessions
- [x] Implement or remove "Find Another" - simplified to redirect for MVP
- [x] Configure pg_cron for session expiry - added client-side interval check
- [x] Clean up unused props
- [x] Implement AnonymousAccountPrompt or remove comment - removed placeholder
- [x] Improve type safety - reviewed, kept simple casts (Supabase types are reliable)
- [x] Standardize error handling - documented pattern at top of file
