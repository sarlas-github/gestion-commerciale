-- Renomme les valeurs existantes de l'enum methode_paiement_type vers les nouvelles clés
-- normalisées. PostgreSQL met à jour automatiquement toutes les lignes existantes.
-- Les valeurs 'Effet' et 'Traite' sont conservées (impossible de supprimer une valeur d'enum
-- sans recréer le type).

ALTER TYPE public.methode_paiement_type RENAME VALUE 'Espèces'         TO 'especes';
ALTER TYPE public.methode_paiement_type RENAME VALUE 'Virement bancaire' TO 'virement';
ALTER TYPE public.methode_paiement_type RENAME VALUE 'Chèque'           TO 'cheque';
ALTER TYPE public.methode_paiement_type RENAME VALUE 'Carte bancaire'   TO 'carte_bancaire';

ALTER TYPE public.methode_paiement_type ADD VALUE IF NOT EXISTS 'mobile_money';
ALTER TYPE public.methode_paiement_type ADD VALUE IF NOT EXISTS 'credit';
