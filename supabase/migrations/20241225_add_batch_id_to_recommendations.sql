-- Add batch_id to track recommendation generations
-- This allows us to distinguish between latest and earlier recommendation batches

ALTER TABLE recommendations 
ADD COLUMN batch_id INTEGER DEFAULT 1;

-- Create index for performance when filtering by batch_id
CREATE INDEX idx_recommendations_batch_id ON recommendations(batch_id);

-- Backfill existing recommendations with batch_id = 1
UPDATE recommendations SET batch_id = 1 WHERE batch_id IS NULL;

