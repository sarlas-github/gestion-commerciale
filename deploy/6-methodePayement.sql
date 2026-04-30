-- Créer le type ENUM
CREATE TYPE methode_paiement_type AS ENUM (
  'Espèces',
  'Virement bancaire',
  'Chèque',
  'Effet',
  'Traite',
  'Carte bancaire'
);

-- Ajouter dans client_payments
ALTER TABLE client_payments
  ADD COLUMN IF NOT EXISTS methode_paiement methode_paiement_type;

-- Ajouter dans supplier_payments
ALTER TABLE supplier_payments
  ADD COLUMN IF NOT EXISTS methode_paiement methode_paiement_type;