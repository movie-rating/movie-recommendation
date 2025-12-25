-- Remove taste genes system - simplify to direct LLM recommendations
-- This migration drops gene-related tables and cleans up movie_feedback

-- Drop gene-related tables (CASCADE removes foreign key constraints)
DROP TABLE IF EXISTS gene_sources CASCADE;
DROP TABLE IF EXISTS taste_genes CASCADE;
DROP TABLE IF EXISTS taste_profiles CASCADE;

-- Remove genes_extracted flag from movie_feedback
ALTER TABLE movie_feedback 
DROP COLUMN IF EXISTS genes_extracted;

-- Update user_movies to support 'watchlist' sentiment
-- Current values: 'loved', 'liked', 'meh', 'hated'
-- Add support for: 'watchlist' (when user adds to watchlist without watching yet)
-- Note: Column already exists as TEXT, no schema change needed

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_movies_session_rated 
ON user_movies(session_id, rated_at DESC);

CREATE INDEX IF NOT EXISTS idx_movie_feedback_session_status
ON movie_feedback(session_id, status);

