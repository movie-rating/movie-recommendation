-- Add 'watchlist' as a valid status for movie_feedback
-- This allows users to save movies to their watchlist

-- Drop the existing check constraint
ALTER TABLE movie_feedback
DROP CONSTRAINT IF EXISTS movie_feedback_status_check;

-- Recreate with 'watchlist' included
ALTER TABLE movie_feedback
ADD CONSTRAINT movie_feedback_status_check 
CHECK (status IN ('to_watch', 'watched', 'not_interested', 'watchlist'));

COMMENT ON CONSTRAINT movie_feedback_status_check ON movie_feedback IS 'Ensures status is one of: to_watch, watched, not_interested, watchlist';

