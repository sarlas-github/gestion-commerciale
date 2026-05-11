-- Add company website and client phone as snapshot columns to documents table.
-- Displayed in the invoice: site_web after company email, client phone in client card.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS company_site_web text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS client_phone     text;
