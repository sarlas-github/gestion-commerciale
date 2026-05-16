-- Stored Procedure pour créer un utilisateur complet manuellement (Auth + Profil)
-- Usage: SELECT public.create_app_user('email@test.com', 'password123', 'production');

CREATE OR REPLACE FUNCTION public.create_app_user(
  p_email text,
  p_password text,
  p_mode text DEFAULT 'revente'
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Insertion dans auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- 2. Insertion dans auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id::text, p_email)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- 3. Mise à jour du profil avec le mode spécifié 
  -- (Note: le trigger handle_new_user l'aura déjà créé en 'revente', on fait un UPDATE)
  UPDATE public.profiles 
  SET business_mode = p_mode 
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
