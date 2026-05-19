-- Ajout du rôle super-admin dans company_members
-- et paramètre p_role dans create_app_user

-- 1. Mise à jour de la contrainte CHECK sur company_members.role
ALTER TABLE public.company_members
  DROP CONSTRAINT IF EXISTS company_members_role_check;

ALTER TABLE public.company_members
  ADD CONSTRAINT company_members_role_check
  CHECK (role IN ('admin', 'super-admin'));

-- 2. Mise à jour de create_app_user : p_mode et p_role en paramètres, company_name figé
-- DROP obligatoire car la signature change (PostgreSQL interdit CREATE OR REPLACE dans ce cas)
DROP FUNCTION IF EXISTS public.create_app_user(text, text, text, text);
DROP FUNCTION IF EXISTS public.create_app_user(text, text, text, text, text);

CREATE FUNCTION public.create_app_user(
  p_email    text,
  p_password text,
  p_mode     text DEFAULT 'revente',
  p_role     text DEFAULT 'admin'
) RETURNS uuid AS $$
DECLARE
  v_user_id    uuid;
  v_company_id uuid;
BEGIN
  -- 1. Insertion dans auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  )
  RETURNING id INTO v_user_id;

  -- 2. Insertion dans auth.identities
  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), v_user_id::text, v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id::text, p_email)::jsonb,
    'email', now(), now(), now()
  );

  -- 3. Mise à jour du profil (le trigger handle_new_user l'a déjà créé en 'revente')
  UPDATE public.profiles SET business_mode = p_mode WHERE id = v_user_id;

  -- 4. Création de l'entreprise avec nom par défaut à configurer
  INSERT INTO public.companies (user_id, name, couleur_marque)
  VALUES (v_user_id, 'votre-nom-entreprise', '#4f46e5')
  RETURNING id INTO v_company_id;

  -- 5. Ajout de l'utilisateur comme membre de l'entreprise avec le rôle spécifié
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, p_role);

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
