-- Add per-campaign email sending rate limit.
-- NULL means unlimited; any positive integer caps emails sent per hour.
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS email_rate_limit_per_hour INTEGER DEFAULT NULL;

COMMENT ON COLUMN campaigns.email_rate_limit_per_hour IS
  'Max outbound emails allowed per hour for this campaign. NULL = unlimited.';
