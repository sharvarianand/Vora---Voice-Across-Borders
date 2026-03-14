-- Allow campaign_leads to have "pending_review" status for human-in-the-loop approval
-- No enum constraint exists on the status column (it uses TEXT), so this is a no-op note.
-- The application already validates status values via TypeScript types.

-- If your DB has a CHECK constraint on campaign_leads.status, run:
-- ALTER TABLE campaign_leads DROP CONSTRAINT IF EXISTS campaign_leads_status_check;
-- ALTER TABLE campaign_leads ADD CONSTRAINT campaign_leads_status_check
--   CHECK (status IN ('queued', 'waiting', 'active', 'completed', 'failed', 'pending_review'));

-- Index for quickly finding leads pending review
CREATE INDEX IF NOT EXISTS idx_campaign_leads_pending_review
  ON campaign_leads (campaign_id)
  WHERE status = 'pending_review';
