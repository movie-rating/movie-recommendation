-- Add match_confidence column to recommendations table
-- This migration adds a match confidence score (0-100) to each recommendation

-- Add the column with a default value
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS match_confidence INTEGER DEFAULT 75;

-- Add constraint to ensure valid range (0-100)
-- Drop constraint first if it exists (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'match_confidence_range'
    ) THEN
        ALTER TABLE recommendations
        ADD CONSTRAINT match_confidence_range 
        CHECK (match_confidence >= 0 AND match_confidence <= 100);
    END IF;
END $$;

-- Create index for sorting by confidence (improves query performance)
CREATE INDEX IF NOT EXISTS idx_recommendations_match_confidence 
ON recommendations(match_confidence DESC);

-- Add comment for documentation
COMMENT ON COLUMN recommendations.match_confidence IS 'AI-generated match score (0-100) indicating how well the recommendation fits user preferences';
