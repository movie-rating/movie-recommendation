-- Add missing columns to taste_genes table
-- These columns are critical for taste gene functionality

-- Add is_negative column to distinguish preferences vs avoidances
ALTER TABLE taste_genes 
ADD COLUMN IF NOT EXISTS is_negative BOOLEAN DEFAULT false NOT NULL;

-- Add is_dealbreaker column for absolute requirements
ALTER TABLE taste_genes
ADD COLUMN IF NOT EXISTS is_dealbreaker BOOLEAN DEFAULT false NOT NULL;

-- Add updated_at column for tracking changes
ALTER TABLE taste_genes
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for filtering by positive/negative genes
CREATE INDEX IF NOT EXISTS idx_taste_genes_is_negative 
ON taste_genes(is_negative);

-- Add comments for documentation
COMMENT ON COLUMN taste_genes.is_negative IS 'True if gene represents what user wants to AVOID, false for what they ENJOY';
COMMENT ON COLUMN taste_genes.is_dealbreaker IS 'True if this is an absolute requirement or hard rejection';
COMMENT ON COLUMN taste_genes.updated_at IS 'Timestamp of last modification to this gene';

