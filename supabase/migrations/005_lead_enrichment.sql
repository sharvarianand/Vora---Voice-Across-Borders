-- Add enrichment data column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enriched_data JSONB DEFAULT NULL;

-- Index for quickly finding enriched vs un-enriched leads
CREATE INDEX IF NOT EXISTS idx_leads_enriched ON leads ((enriched_data IS NOT NULL));
