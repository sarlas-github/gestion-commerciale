-- ============================================================================
-- SCRIPT SQL : NETTOYAGE DE TOUTES LES DONNÉES (sauf catalogue de base)
-- À copier-coller et exécuter directement dans Supabase > SQL Editor
-- ============================================================================

DO $$
DECLARE
 -- 0171ae54-3906-4cc6-b8a7-95166f6ca98c : khadamat@gmail.com
 -- 7af58026-049f-4cb7-96fc-32653c17a011 : laasri.sarah@gmail.com
    -- Remplacez par le company_id de l'entreprise à nettoyer :
    -- SELECT id, name FROM companies;
    my_company_id UUID := (SELECT id FROM public.companies WHERE user_id = '9b1cb70a-03a3-44f5-b1ec-4f9b0786d6bd' LIMIT 1);
BEGIN

    -- L'ordre de suppression est primordial pour éviter les erreurs de contraintes de clés étrangères (Foreign Keys).
    -- On supprime les enfants avant les parents.

    DELETE FROM document_items WHERE document_id IN (SELECT id FROM documents WHERE company_id = my_company_id);
    DELETE FROM documents WHERE company_id = my_company_id;

    DELETE FROM client_payments WHERE company_id = my_company_id;
    DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE company_id = my_company_id);
    DELETE FROM sales WHERE company_id = my_company_id;

    DELETE FROM supplier_payments WHERE company_id = my_company_id;
    DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE company_id = my_company_id);
    DELETE FROM purchases WHERE company_id = my_company_id;

    DELETE FROM stock_movements WHERE company_id = my_company_id;
    DELETE FROM stock WHERE company_id = my_company_id;

    -- On réinitialise les compteurs de référence (ex: ACH-2026-001)
    DELETE FROM document_sequences WHERE company_id = my_company_id;

/*
    -- Nettoyage du Catalogue
    DELETE FROM products WHERE company_id = my_company_id;
    DELETE FROM clients WHERE company_id = my_company_id;
    DELETE FROM suppliers WHERE company_id = my_company_id;
    */
    -- NOTE : la table companies et company_members ne sont pas touchées.

END $$;
