-- Remove 'paused' from the campaigns status check constraint
-- Update any existing paused campaigns to 'completed'
UPDATE campaigns SET status = 'completed' WHERE status = 'paused';

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'active', 'completed'));
