-- RIB + full document snapshot columns (2026-05-04)
--
-- 1. companies: add RIB field (displayed in invoice footer)
-- 2. documents: add company_rib, company_couleur_marque, tva_rate, tva_amount
--    so every generated invoice is fully self-contained and never reads live data.

ALTER TABLE companies  ADD COLUMN IF NOT EXISTS rib                   text;

ALTER TABLE documents  ADD COLUMN IF NOT EXISTS company_rib           text;
ALTER TABLE documents  ADD COLUMN IF NOT EXISTS company_couleur_marque text;
ALTER TABLE documents  ADD COLUMN IF NOT EXISTS tva_rate              numeric NOT NULL DEFAULT 0;
ALTER TABLE documents  ADD COLUMN IF NOT EXISTS tva_amount            numeric NOT NULL DEFAULT 0;
