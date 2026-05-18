-- Dernière version déployée : 17-05-2026_03_multi_tenant_schema.sql

-- Retourne le company_id de l'entreprise de l'utilisateur connecté.
-- SECURITY DEFINER pour lire company_members sans risque de récursion RLS.
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_members
  WHERE user_id = auth.uid()
  ORDER BY created_at
  LIMIT 1;
$$;
