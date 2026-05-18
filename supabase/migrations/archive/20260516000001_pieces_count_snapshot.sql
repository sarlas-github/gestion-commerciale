-- Ajouter pieces_count dans purchase_items (snapshot au moment de l'achat)
-- sale_items a déjà cette colonne (DEFAULT 1) depuis la baseline
ALTER TABLE purchase_items
  ADD COLUMN pieces_count integer NOT NULL DEFAULT 1;
