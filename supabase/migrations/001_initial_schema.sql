CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sheet_id TEXT,
  drive_folder_id TEXT,
  gmail_label_prefix TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  industry TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, email)
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workflow_json JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed')),
  gmail_label_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  current_node_id TEXT DEFAULT '1',
  status TEXT DEFAULT 'queued'
    CHECK (status IN ('queued','waiting','active','completed','failed')),
  followup_count INT DEFAULT 0,
  last_action_time TIMESTAMPTZ,
  next_action_time TIMESTAMPTZ DEFAULT now(),
  replied BOOLEAN DEFAULT false,
  thread_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, lead_id)
);

CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_lead_id UUID REFERENCES campaign_leads(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cl_pending ON campaign_leads(status, next_action_time)
  WHERE status IN ('queued','waiting');
CREATE INDEX idx_leads_product ON leads(product_id);
CREATE INDEX idx_campaigns_product ON campaigns(product_id);
CREATE INDEX idx_logs_cl ON logs(campaign_lead_id);
