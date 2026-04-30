-- ============================================================================
-- SCRIPT SQL : INITIALISATION DES DONNÉES DE TEST
-- À copier-coller et exécuter directement dans Supabase > SQL Editor
-- ============================================================================

DO $$
DECLARE

-- 0171ae54-3906-4cc6-b8a7-95166f6ca98c : khadamat@gmail.com
    -- Remplacez par votre UUID si différent :
    my_user_id UUID := '0171ae54-3906-4cc6-b8a7-95166f6ca98c'; 
BEGIN

    -- 1. Insertion des Clients
    INSERT INTO clients (user_id, name, phone, address, ice) VALUES
    (my_user_id, 'Entreprise Alpha', '0600112233', '123 Rue de la Paix, Casablanca', '111111111111111'),
    (my_user_id, 'Boutique Beta', '0611223344', '45 Boulevard Anfa, Rabat', '222222222222222'),
    (my_user_id, 'Consulting Gamma', '0622334455', '78 Avenue Hassan II, Marrakech', '333333333333333');

    -- 2. Insertion des Fournisseurs
    INSERT INTO suppliers (user_id, name, phone, address, ice) VALUES
    (my_user_id, 'Fournisseur GlobalTech', '0522001122', 'Zone Industrielle, Tanger', '999999999999999'),
    (my_user_id, 'Grossiste MegaStore', '0533001122', 'Quartier Industriel, Agadir', '888888888888888'),
    (my_user_id, 'Import-Export Pro', '0544001122', 'Port de Casablanca', '777777777777777');

    -- 3. Insertion des Produits
    INSERT INTO products (user_id, name, type, pieces_count, stock_alert) VALUES
    (my_user_id, 'PC Portable Dell', 'individual', 1, 5),
    (my_user_id, 'Souris Sans Fil Logitech', 'individual', 1, 20),
    (my_user_id, 'Pack Bureau (Écran + Clavier + Souris)', 'pack', 3, 2),
    (my_user_id, 'Imprimante HP LaserJet', 'individual', 1, 3),
    (my_user_id, 'Ramette Papier A4 (Carton de 5)', 'pack', 5, 10);

END $$;
