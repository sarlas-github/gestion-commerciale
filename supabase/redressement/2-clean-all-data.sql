-- ============================================================================
-- SCRIPT SQL : NETTOYAGE DE TOUTES LES DONNÉES (sauf catalogue de base)
-- À copier-coller et exécuter directement dans Supabase > SQL Editor
-- ============================================================================

DO $$
DECLARE
 -- 0171ae54-3906-4cc6-b8a7-95166f6ca98c : khadamat@gmail.com
    -- Remplacez par votre UUID si différent :
    my_user_id UUID := '0171ae54-3906-4cc6-b8a7-95166f6ca98c'; 
BEGIN

    -- L'ordre de suppression est primordial pour éviter les erreurs de contraintes de clés étrangères (Foreign Keys).
    -- On supprime les enfants avant les parents.

    DELETE FROM document_items WHERE document_id IN (SELECT id FROM documents WHERE user_id = my_user_id);
    DELETE FROM documents WHERE user_id = my_user_id;
    
    DELETE FROM client_payments WHERE user_id = my_user_id;
    DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = my_user_id);
    DELETE FROM sales WHERE user_id = my_user_id;
    
    DELETE FROM supplier_payments WHERE user_id = my_user_id;
    DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE user_id = my_user_id);
    DELETE FROM purchases WHERE user_id = my_user_id;
    
    DELETE FROM stock_movements WHERE user_id = my_user_id;
    DELETE FROM stock WHERE user_id = my_user_id;
    
    -- On réinitialise les compteurs de référence (ex: ACH-2026-001)
    DELETE FROM document_sequences WHERE user_id = my_user_id;

    -- Nettoyage du Catalogue
    DELETE FROM products WHERE user_id = my_user_id;
    DELETE FROM clients WHERE user_id = my_user_id;
    DELETE FROM suppliers WHERE user_id = my_user_id;
    
    -- NOTE : la table companies n'est pas touchée.

END $$;
