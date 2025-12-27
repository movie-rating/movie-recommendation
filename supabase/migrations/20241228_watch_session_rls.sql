-- Enable Row Level Security for watch_sessions table
-- Note: This app uses cookie-based session IDs, not Supabase auth
-- RLS policies use a custom session header set by the application

ALTER TABLE watch_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view waiting sessions (to join) or sessions they're part of
CREATE POLICY "view_accessible_sessions" ON watch_sessions
  FOR SELECT USING (
    -- Can view sessions you're part of
    host_session_id = current_setting('app.current_session_id', true) OR
    guest_session_id = current_setting('app.current_session_id', true) OR
    -- Can view waiting sessions without a guest (to join)
    (status = 'waiting' AND guest_session_id IS NULL)
  );

-- Policy: Users can create sessions as host
CREATE POLICY "create_as_host" ON watch_sessions
  FOR INSERT WITH CHECK (
    host_session_id = current_setting('app.current_session_id', true)
  );

-- Policy: Participants can update their sessions
CREATE POLICY "update_own_sessions" ON watch_sessions
  FOR UPDATE USING (
    host_session_id = current_setting('app.current_session_id', true) OR
    guest_session_id = current_setting('app.current_session_id', true)
  );

-- Note: For RLS to work, the application must set the session ID before queries:
-- await supabase.rpc('set_config', { setting: 'app.current_session_id', value: sessionId })
-- Or use a custom header approach with Supabase Edge Functions

COMMENT ON POLICY "view_accessible_sessions" ON watch_sessions IS
  'Allow viewing own sessions or joinable waiting sessions';
COMMENT ON POLICY "create_as_host" ON watch_sessions IS
  'Only allow creating sessions where you are the host';
COMMENT ON POLICY "update_own_sessions" ON watch_sessions IS
  'Only participants can update session state';
