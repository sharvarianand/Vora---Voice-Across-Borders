-- Email Deliverability: warm-up schedules + deliverability event tracking

CREATE TABLE warmup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
  day_number INT DEFAULT 1,
  daily_limit INT DEFAULT 10,
  phase TEXT DEFAULT 'warmup'
    CHECK (phase IN ('warmup', 'rampup', 'full')),
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deliverability_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_lead_id UUID REFERENCES campaign_leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('sent', 'bounced_hard', 'bounced_soft', 'complaint')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deliverability_campaign_lead ON deliverability_events(campaign_lead_id);
CREATE INDEX idx_warmup_campaign ON warmup_schedules(campaign_id);

-- Add bounce_type to logs for richer error classification
ALTER TABLE logs ADD COLUMN IF NOT EXISTS bounce_type TEXT;
