-- ============================================================
-- SCRIPT SQL MISE À JOUR — ALTER TABLE
-- À exécuter dans Supabase > SQL Editor
-- après le premier script
-- ============================================================

-- ============================================================
-- 1. MISE À JOUR TABLE COMPANIES
-- ============================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS forme_juridique  TEXT,
  ADD COLUMN IF NOT EXISTS site_web         TEXT,
  ADD COLUMN IF NOT EXISTS tva_number       TEXT,
  ADD COLUMN IF NOT EXISTS taux_tva_defaut  NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS if_number        TEXT,
  ADD COLUMN IF NOT EXISTS tp_number        TEXT,
  ADD COLUMN IF NOT EXISTS couleur_marque   TEXT DEFAULT '#000000';

-- ============================================================
-- 2. MISE À JOUR TABLE DOCUMENTS
-- ============================================================

-- Ajouter type receipt et invoice
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_type_check
  CHECK (type IN ('quote', 'order', 'delivery', 'invoice', 'receipt'));

-- Ajouter colonnes snapshot client
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS sale_id          UUID REFERENCES sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_id       UUID REFERENCES client_payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name      TEXT,
  ADD COLUMN IF NOT EXISTS client_address   TEXT,
  ADD COLUMN IF NOT EXISTS client_ice       TEXT,
  ADD COLUMN IF NOT EXISTS company_name     TEXT,
  ADD COLUMN IF NOT EXISTS company_address  TEXT,
  ADD COLUMN IF NOT EXISTS company_ice      TEXT,
  ADD COLUMN IF NOT EXISTS company_if       TEXT,
  ADD COLUMN IF NOT EXISTS company_rc       TEXT,
  ADD COLUMN IF NOT EXISTS company_tp       TEXT,
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS company_phone    TEXT,
  ADD COLUMN IF NOT EXISTS company_email    TEXT;

-- ============================================================
-- 3. MISE À JOUR TABLE DOCUMENT_ITEMS
-- ============================================================
ALTER TABLE document_items
  ADD COLUMN IF NOT EXISTS product_name TEXT;

-- ============================================================
-- 4. INDEX supplémentaires
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_documents_sale    ON documents(sale_id);
CREATE INDEX IF NOT EXISTS idx_documents_payment ON documents(payment_id);

-- ============================================================
-- ✅ MISE À JOUR TERMINÉE
-- ============================================================
