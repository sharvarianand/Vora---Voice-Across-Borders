-- Migration: Add knowledge_base to products and automation_context to campaigns
-- Used by the Auto Reply workflow node to look up FAQs / plain-text context.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS knowledge_base JSONB NOT NULL DEFAULT '{"items":[]}'::jsonb;

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS automation_context JSONB NOT NULL DEFAULT '{"items":[]}'::jsonb;

-- GIN indexes for future JSONB querying
CREATE INDEX IF NOT EXISTS idx_products_knowledge_base
  ON products USING GIN (knowledge_base);

CREATE INDEX IF NOT EXISTS idx_campaigns_automation_context
  ON campaigns USING GIN (automation_context);
