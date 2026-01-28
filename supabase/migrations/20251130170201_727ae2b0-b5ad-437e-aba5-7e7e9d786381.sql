-- Remove unique constraint from email to allow duplicate emails (for typo cases)
ALTER TABLE b2b_clients DROP CONSTRAINT IF EXISTS b2b_clients_email_key;

-- Add indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_b2b_clients_email_lower ON b2b_clients (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_b2b_clients_phone_normalized ON b2b_clients (REGEXP_REPLACE(phone, '[^0-9]', '', 'g'));