-- Dernière version déployée : 17-05-2026_05_multi_tenant_functions.sql
-- Usage: SELECT public.create_app_user('email@test.com', 'password123', 'Ma Société', 'revente');

CREATE OR REPLACE FUNCTION public.create_app_user(
  p_email        text,
  p_password     text,
  p_company_name text,
  p_mode         text DEFAULT 'revente'
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

  -- 4. Création de l'entreprise
  INSERT INTO public.companies (user_id, name, couleur_marque)
  VALUES (v_user_id, p_company_name, '#4f46e5')
  RETURNING id INTO v_company_id;

  -- 5. Ajout de l'utilisateur comme admin de l'entreprise
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'admin');

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
