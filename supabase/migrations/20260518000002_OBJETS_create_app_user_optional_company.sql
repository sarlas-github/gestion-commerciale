-- Ajout du paramètre optionnel p_company_id dans create_app_user
-- Retourne user_id ET company_id via paramètres OUT
-- NULL (défaut) → crée une nouvelle entreprise
-- UUID fourni   → rattache l'utilisateur à une entreprise existante

DROP FUNCTION IF EXISTS public.create_app_user(text, text, text, text);
DROP FUNCTION IF EXISTS public.create_app_user(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_app_user(text, text, text, text, uuid);

CREATE FUNCTION public.create_app_user(
  p_email      text,
  p_password   text,
  p_mode       text DEFAULT 'revente',
  p_role       text DEFAULT 'admin',
  p_company_id uuid DEFAULT NULL,
  OUT out_user_id    uuid,
  OUT out_company_id uuid
) AS $$
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
  RETURNING id INTO out_user_id;

  -- 2. Insertion dans auth.identities
  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), out_user_id::text, out_user_id,
    format('{"sub":"%s","email":"%s"}', out_user_id::text, p_email)::jsonb,
    'email', now(), now(), now()
  );

  -- 3. Mise à jour du profil
  UPDATE public.profiles SET business_mode = p_mode WHERE id = out_user_id;

  -- 4. Nouvelle entreprise OU rattachement à une entreprise existante
  IF p_company_id IS NOT NULL THEN
    out_company_id := p_company_id;
  ELSE
    INSERT INTO public.companies (user_id, name, couleur_marque)
    VALUES (out_user_id, 'votre-nom-entreprise', '#4f46e5')
    RETURNING id INTO out_company_id;
  END IF;

  -- 5. Ajout comme membre avec le rôle spécifié
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (out_company_id, out_user_id, p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
