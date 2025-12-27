-- Atomic function to advance watch session to next movie
-- Prevents race conditions by doing increment + vote reset in single transaction

CREATE OR REPLACE FUNCTION advance_watch_session(session_uuid UUID)
RETURNS SETOF watch_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE watch_sessions
  SET
    current_index = current_index + 1,
    host_vote = NULL,
    guest_vote = NULL
  WHERE id = session_uuid
    AND host_vote = 'skip'
    AND guest_vote = 'skip'
    AND status = 'active'
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION advance_watch_session IS
  'Atomically advances to next movie and resets votes. Only succeeds if both users voted skip.';
