-- Function to expire old watch sessions
-- Can be called periodically via pg_cron or external cron job

CREATE OR REPLACE FUNCTION expire_watch_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE watch_sessions
  SET status = 'expired'
  WHERE status IN ('waiting', 'active')
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$;

-- Optional: If using pg_cron extension, schedule cleanup every 15 minutes
-- Note: pg_cron must be enabled in your Supabase project settings
--
-- SELECT cron.schedule(
--   'expire-watch-sessions',
--   '*/15 * * * *',
--   'SELECT expire_watch_sessions()'
-- );

-- Add index for efficient expiry lookups if not already exists
CREATE INDEX IF NOT EXISTS idx_watch_sessions_status_expires
  ON watch_sessions(status, expires_at)
  WHERE status IN ('waiting', 'active');

COMMENT ON FUNCTION expire_watch_sessions IS
  'Marks watch sessions as expired when their expires_at timestamp has passed. Returns count of expired sessions.';
