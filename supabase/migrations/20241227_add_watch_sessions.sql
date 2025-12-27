-- Watch Together sessions
-- Allows two users to find movies together with real-time synced voting

CREATE TABLE watch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,

  -- Participants (session IDs from cookie-based sessions)
  host_session_id TEXT NOT NULL,
  guest_session_id TEXT,

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

-- Index for looking up by host/guest session
CREATE INDEX idx_watch_sessions_host ON watch_sessions(host_session_id);
CREATE INDEX idx_watch_sessions_guest ON watch_sessions(guest_session_id);

-- Index for cleanup job
CREATE INDEX idx_watch_sessions_expires_at ON watch_sessions(expires_at)
  WHERE status NOT IN ('completed', 'expired');

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE watch_sessions;

-- Add documentation
COMMENT ON TABLE watch_sessions IS
  'Watch Together sessions for collaborative movie selection';
COMMENT ON COLUMN watch_sessions.code IS
  'Short shareable code for joining session (e.g., "abc123")';
COMMENT ON COLUMN watch_sessions.recommendations IS
  'JSONB array of joint recommendations for both users';
COMMENT ON COLUMN watch_sessions.current_index IS
  'Index of the currently displayed movie in recommendations array';
