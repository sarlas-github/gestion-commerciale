-- Utilitaire pour changer le mode d'activité d'un utilisateur
-- Remplacez 'VOTRE_USER_ID' par l'ID de l'utilisateur cible
-- Remplacez 'production' par 'revente' pour revenir au mode standard

-- Note : Le mode est maintenant stocké dans la table profiles (niveau utilisateur)

INSERT INTO public.profiles (id, business_mode)
VALUES ('VOTRE_USER_ID', 'production')
ON CONFLICT (id) DO UPDATE 
SET business_mode = EXCLUDED.business_mode,
    updated_at = now();
