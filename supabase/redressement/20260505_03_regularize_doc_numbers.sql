--SELECT regularize_user_invoices('f4c78c15-fda1-4c6c-ba8c-786917bf28ed');

-- Script de régularisation des numéros de FACTURES uniquement
-- Objectif : Ré-attribuer des numéros strictement séquentiels aux factures (FAC-) sans trous ni doublons.
-- Utilisation : SELECT regularize_user_invoices('UUID_DE_L_UTILISATEUR');

CREATE OR REPLACE FUNCTION regularize_user_invoices(p_user_id UUID)
RETURNS void AS $$
DECLARE
    r RECORD;
    v_new_ref TEXT;
BEGIN
    -- 1. MISE À JOUR des factures existantes
    -- On boucle sur les factures de l'utilisateur triées par date
    FOR r IN (
        SELECT id, 
               EXTRACT(YEAR FROM date)::INT as doc_year,
               ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM date) ORDER BY date, created_at) as new_seq
        FROM public.documents
        WHERE user_id = p_user_id AND type = 'invoice'
    ) LOOP
        v_new_ref := 'FAC-' || r.doc_year || '-' || LPAD(r.new_seq::TEXT, 3, '0');
        
        -- Mise à jour effective du numéro de facture
        UPDATE public.documents SET number = v_new_ref WHERE id = r.id;
    END LOOP;

    -- 2. MISE À JOUR du compteur global pour les prochaines factures
    -- On utilise INSERT ... ON CONFLICT pour écraser la valeur du compteur (last_number)
    INSERT INTO public.document_sequences (user_id, type, year, last_number)
    SELECT p_user_id, 'invoice', t.calc_year, MAX(t.new_seq)
    FROM (
        SELECT EXTRACT(YEAR FROM date)::INT as calc_year,
               ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM date) ORDER BY date, created_at) as new_seq
        FROM public.documents 
        WHERE user_id = p_user_id AND type = 'invoice'
    ) t
    GROUP BY t.calc_year
    ON CONFLICT (user_id, type, year) DO UPDATE SET last_number = EXCLUDED.last_number;

END;
$$ LANGUAGE plpgsql;
