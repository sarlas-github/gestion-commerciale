-- =========================================================================
-- FICHIER UTILITAIRE (MEMENTO)
-- Copiez/collez ces instructions une par une pour les exécuter rapidement
-- =========================================================================

-- 1. CRÉER UN NOUVEL UTILISATEUR
-- Paramètres : email, mot de passe, mode ('production' ou 'revente')
-- Résultat : Retourne l'UUID du nouvel utilisateur créé.
SELECT public.create_app_user('demo123@exemple.com', 'password123', 'production');


-- 2. GÉNÉRER DES DONNÉES DE DÉMO
-- Copiez l'UUID obtenu à l'étape 1 et remplacez la valeur ci-dessous.
SELECT public.generate_demo_data('00000000-0000-0000-0000-000000000000');
