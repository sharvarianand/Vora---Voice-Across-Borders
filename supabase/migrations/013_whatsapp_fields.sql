-- 013_whatsapp_fields.sql
-- Adds WhatsApp contact phone to leads and WhatsApp conversation state to campaign_leads

ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE campaign_leads
  ADD COLUMN IF NOT EXISTS whatsapp_jid TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_last_msg_ts BIGINT;

COMMENT ON COLUMN leads.phone IS 'WhatsApp-capable phone number in E.164 format, e.g. +447700900000';
COMMENT ON COLUMN campaign_leads.whatsapp_jid IS 'Baileys JID for the WhatsApp conversation (e.g. 447700900000@s.whatsapp.net)';
COMMENT ON COLUMN campaign_leads.whatsapp_last_msg_ts IS 'Unix millisecond timestamp of the last outbound WhatsApp message — used for reply detection';
