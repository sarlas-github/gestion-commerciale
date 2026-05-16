-- Script de redressement pour créer les profils de TOUS les utilisateurs existants
-- À exécuter une seule fois après la migration

INSERT INTO public.profiles (id, business_mode)
SELECT id, 'revente'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Note : Tous les utilisateurs existants passent en mode 'revente' par défaut.
