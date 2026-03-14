-- Compliance Guardian: suppression list + unsubscribe tracking

CREATE TABLE suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  reason TEXT DEFAULT 'unsubscribed',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_lead_id UUID REFERENCES campaign_leads(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_suppression_email ON suppression_list(email);
CREATE INDEX idx_unsubscribes_token ON unsubscribes(token);
