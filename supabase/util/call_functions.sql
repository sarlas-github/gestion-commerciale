-- =========================================================================
-- FICHIER UTILITAIRE (MEMENTO)
-- Copiez/collez ces instructions une par une pour les exécuter rapidement
-- =========================================================================

-- 1. CRÉER UN NOUVEL UTILISATEUR
-- Paramètres : email, mot de passe, mode ('revente'|'production'), role ('admin'|'super-admin'), company_id (uuid|NULL)
-- Résultat : Retourne out_user_id + out_company_id

-- Nouvel utilisateur + nouvelle entreprise (défaut admin revente) :
SELECT * FROM public.create_app_user('demo@exemple.com', 'password123');

-- Avec mode et rôle explicites :
SELECT * FROM public.create_app_user('demo@exemple.com', 'password123', 'production', 'super-admin');

-- Ajouter un user dans une entreprise existante (copier out_company_id de l'étape précédente) :
SELECT * FROM public.create_app_user('admin@exemple.com', 'password123', 'revente', 'admin', 'uuid-company-id');

-- 2. Récupérer le company_id créé
SELECT id FROM companies WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'sara@test.com'
);

-- 2. GÉNÉRER DES DONNÉES DE DÉMO
-- Copiez l'UUID obtenu à l'étape 1 et remplacez la valeur ci-dessous.
SELECT public.generate_demo_data('00000000-0000-0000-0000-000000000000');


