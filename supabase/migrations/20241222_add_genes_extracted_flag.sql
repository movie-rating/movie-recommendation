-- Add genes_extracted flag to movie_feedback table
-- This tracks whether taste genes have been extracted from this feedback

ALTER TABLE movie_feedback
ADD COLUMN IF NOT EXISTS genes_extracted BOOLEAN DEFAULT false;

-- Create index for querying unprocessed feedback
CREATE INDEX IF NOT EXISTS idx_movie_feedback_genes_extracted 
ON movie_feedback(genes_extracted, session_id);

COMMENT ON COLUMN movie_feedback.genes_extracted IS 'True if taste genes have been extracted from this feedback';
