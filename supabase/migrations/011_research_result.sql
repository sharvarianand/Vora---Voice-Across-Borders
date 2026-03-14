-- Add research_result column for Tavily-based workflow research
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_result JSONB DEFAULT NULL;

-- Index for quickly finding researched vs un-researched leads
CREATE INDEX IF NOT EXISTS idx_leads_researched ON leads ((research_result IS NOT NULL));
