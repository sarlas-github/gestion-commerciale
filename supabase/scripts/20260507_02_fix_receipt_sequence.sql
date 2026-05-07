-- Fix séquence reçus : les tentatives échouées (erreur client_id null)
-- ont incrémenté le compteur sans créer de document.
-- Ce script renomme le premier vrai reçu en REC-2026-001
-- et remet la séquence à 1.

-- 1. Renommer le reçu mal numéroté → REC-2026-001
UPDATE documents
SET number = 'REC-2026-001'
WHERE type    = 'receipt'
  AND number  = 'REC-2026-004'
  AND user_id = auth.uid();

-- 2. Remettre la séquence à 1 (dernier numéro utilisé = 1)
UPDATE document_sequences
SET last_number = 1
WHERE type    = 'receipt'
  AND year    = 2026
  AND user_id = auth.uid();
