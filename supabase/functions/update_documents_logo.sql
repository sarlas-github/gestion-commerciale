-- Met à jour le logo (et la couleur de marque) snapshotés dans les documents
-- existants pour les aligner sur les paramètres actuels de l'entreprise.
-- Usage : SELECT public.update_documents_logo('uuid-company-id');
--         Retourne le nombre de documents mis à jour.

CREATE OR REPLACE FUNCTION public.update_documents_logo(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_logo_url         text;
    v_couleur_marque   text;
    v_updated          integer;
BEGIN
    SELECT logo_url, couleur_marque
    INTO v_logo_url, v_couleur_marque
    FROM public.companies
    WHERE id = p_company_id;

    UPDATE public.documents
    SET company_logo_url       = v_logo_url,
        company_couleur_marque = COALESCE(v_couleur_marque, '#4f46e5')
    WHERE company_id = p_company_id
      AND type IN ('invoice', 'receipt');

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;
