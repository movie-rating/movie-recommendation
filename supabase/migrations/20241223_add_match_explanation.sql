-- Add match_explanation column to recommendations table
-- This stores AI-generated conversational explanations of why each recommendation matches user taste

ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS match_explanation TEXT;

COMMENT ON COLUMN recommendations.match_explanation IS 'AI-generated conversational explanation of why this recommendation matches user taste genes and preferences';



