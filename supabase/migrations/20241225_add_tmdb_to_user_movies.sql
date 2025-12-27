-- Add TMDB metadata columns to user_movies table
-- This enables storing canonical movie/TV IDs for better data quality

-- Add columns to store TMDB IDs and media type
ALTER TABLE user_movies
ADD COLUMN IF NOT EXISTS tmdb_movie_id INTEGER,
ADD COLUMN IF NOT EXISTS tmdb_tv_id INTEGER,
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('movie', 'tv'));

-- Add indexes for performance when querying by TMDB IDs
CREATE INDEX IF NOT EXISTS idx_user_movies_tmdb_movie_id 
ON user_movies(tmdb_movie_id) WHERE tmdb_movie_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_movies_tmdb_tv_id 
ON user_movies(tmdb_tv_id) WHERE tmdb_tv_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_movies.tmdb_movie_id IS 'TMDB movie ID (mutually exclusive with tmdb_tv_id)';
COMMENT ON COLUMN user_movies.tmdb_tv_id IS 'TMDB TV show ID (mutually exclusive with tmdb_movie_id)';
COMMENT ON COLUMN user_movies.media_type IS 'Type of media: movie or tv';


