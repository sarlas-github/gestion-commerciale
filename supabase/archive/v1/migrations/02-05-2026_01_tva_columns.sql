-- Migration : ajout colonnes TVA sur purchases et sales
-- Date : 2026-05-02
-- À exécuter dans Supabase SQL Editor

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS tva_rate   NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tva_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS tva_rate   NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tva_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
