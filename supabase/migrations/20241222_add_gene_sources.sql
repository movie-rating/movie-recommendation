-- Add multi-source tracking for taste genes
-- This enables tracking which movies contribute to each gene and calculating source multipliers

-- Create gene_sources junction table to track all movies that contributed to each gene
CREATE TABLE IF NOT EXISTS gene_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gene_id UUID NOT NULL REFERENCES taste_genes(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  source_movie_title TEXT NOT NULL,
  source_rating TEXT NOT NULL,
  contributed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gene_id, source_movie_title)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gene_sources_gene_id ON gene_sources(gene_id);
CREATE INDEX IF NOT EXISTS idx_gene_sources_session_id ON gene_sources(session_id);

-- Add source tracking fields to taste_genes table
ALTER TABLE taste_genes 
ADD COLUMN IF NOT EXISTS source_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS source_multiplier NUMERIC(4,2) DEFAULT 1.0;

-- Add comments for documentation
COMMENT ON TABLE gene_sources IS 'Tracks which movies contributed to each taste gene, enabling multi-source validation';
COMMENT ON COLUMN gene_sources.gene_id IS 'Reference to the taste gene this source contributed to';
COMMENT ON COLUMN gene_sources.source_movie_title IS 'Title of the movie that contributed this gene instance';
COMMENT ON COLUMN gene_sources.source_rating IS 'User rating for the source movie (loved/liked/meh/hated)';
COMMENT ON COLUMN taste_genes.source_count IS 'Number of distinct movies that contributed to this gene';
COMMENT ON COLUMN taste_genes.source_multiplier IS 'Multiplier for gene weight based on source count (1.0 to 2.0)';

