-- Add streaming platform preferences table
-- Stores which platforms users have access to for filtering recommendations

CREATE TABLE user_streaming_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, platform_name)
);

-- Index for efficient lookups by session
CREATE INDEX idx_user_streaming_session 
  ON user_streaming_platforms(session_id);

-- Add documentation
COMMENT ON TABLE user_streaming_platforms IS 
  'Stores which streaming platforms users have access to for filtering recommendations';
COMMENT ON COLUMN user_streaming_platforms.platform_name IS 
  'Name of streaming platform (e.g., Netflix, Hulu, Disney+)';

