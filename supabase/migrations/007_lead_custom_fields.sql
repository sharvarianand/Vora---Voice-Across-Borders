-- Add custom_fields column to store extra columns from CSV/JSON uploads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT NULL;
