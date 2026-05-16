
-- Ajout de la colonne nature à la table products
ALTER TABLE public.products ADD COLUMN nature text DEFAULT 'revente';
ALTER TABLE public.products ADD CONSTRAINT products_nature_check CHECK (nature IN ('revente', 'matiere_premiere', 'produit_fini'));

-- Création de la table profiles pour stocker le business_mode par utilisateur
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_mode text DEFAULT 'revente' CHECK (business_mode IN ('revente', 'production')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS simplifié pour profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
CREATE POLICY "Users can manage their own profile" 
  ON public.profiles 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── FONCTIONS & TRIGGERS ──────────────────────────────────────────────────

-- 1. Trigger pour création automatique du profil (revente par défaut)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, business_mode)
  VALUES (new.id, 'revente')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Stored Procedure pour créer un utilisateur complet manuellement
-- Usage: SELECT public.create_app_user('email@test.com', 'password123', 'production');
CREATE OR REPLACE FUNCTION public.create_app_user(
  p_email text,
  p_password text,
  p_mode text DEFAULT 'revente'
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Insertion dans auth.users
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

  -- Insertion dans auth.identities
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id::text, p_email)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- Mise à jour du profil avec le mode spécifié (le trigger l'aura créé en 'revente' juste avant)
  UPDATE public.profiles 
  SET business_mode = p_mode 
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire pour documentation
COMMENT ON COLUMN public.products.nature IS 'Nature du produit : revente (standard), matiere_premiere ou produit_fini (pour mode production)';
COMMENT ON TABLE public.profiles IS 'Profils utilisateurs stockant les préférences globales comme le business_mode';
