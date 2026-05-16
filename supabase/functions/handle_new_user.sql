-- Fonction appelée par le trigger pour créer automatiquement le profil (revente par défaut)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, business_mode)
  VALUES (new.id, 'revente')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
