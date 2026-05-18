-- ============================================================
-- Multi-tenant: Ajout company_members + company_id sur toutes les tables métier
-- Fichier: 17-05-2026_03_multi_tenant_schema.sql
-- ============================================================

-- ── 1. Tableau pivot company_members ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_members (
  id          uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_company_members_user    ON public.company_members (user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON public.company_members (company_id);

-- RLS sur company_members : filtre direct user_id, pas de récursion possible
CREATE POLICY "user_company_members" ON public.company_members
  USING (user_id = auth.uid());

-- ── 2. Fonction helper SECURITY DEFINER ──────────────────────────────────────
-- Lit company_members en contournant la RLS (SECURITY DEFINER = exécuté en tant que owner)
-- Retourne le company_id de l'entreprise de l'utilisateur connecté (1 seule pour cette phase)
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

GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated, anon, service_role;

-- ── 3. Ajout de company_id aux 11 tables métier (nullable d'abord) ──────────
ALTER TABLE public.clients         ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers       ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.products        ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.sales           ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.purchases       ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.documents       ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.document_sequences ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.client_payments ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.supplier_payments ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.stock           ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.stock_movements ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- ── 4. Population de company_id depuis l'entreprise existante de chaque user ─
UPDATE public.clients c
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = c.user_id;

UPDATE public.suppliers s
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = s.user_id;

UPDATE public.products p
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = p.user_id;

UPDATE public.sales s
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = s.user_id;

UPDATE public.purchases p
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = p.user_id;

UPDATE public.documents d
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = d.user_id;

UPDATE public.document_sequences ds
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = ds.user_id;

UPDATE public.client_payments cp
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = cp.user_id;

UPDATE public.supplier_payments sp
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = sp.user_id;

UPDATE public.stock st
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = st.user_id;

UPDATE public.stock_movements sm
SET company_id = co.id
FROM public.companies co
WHERE co.user_id = sm.user_id;

-- ── 5. Migration des utilisateurs existants → company_members (rôle admin) ───
INSERT INTO public.company_members (company_id, user_id, role)
SELECT co.id, co.user_id, 'admin'
FROM public.companies co
ON CONFLICT (company_id, user_id) DO NOTHING;

-- ── 6. Passage company_id en NOT NULL après population ───────────────────────
ALTER TABLE public.clients            ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.suppliers          ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.products           ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.sales              ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.purchases          ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.documents          ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.document_sequences ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.client_payments    ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.supplier_payments  ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.stock              ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.stock_movements    ALTER COLUMN company_id SET NOT NULL;

-- ── 7. Mise à jour des contraintes UNIQUE (user_id → company_id) ─────────────

-- clients
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_name_key;
ALTER TABLE public.clients ADD CONSTRAINT clients_company_id_name_key UNIQUE (company_id, name);

-- suppliers
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_user_id_name_key;
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_company_id_name_key UNIQUE (company_id, name);

-- products
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_user_id_name_key;
ALTER TABLE public.products ADD CONSTRAINT products_company_id_name_key UNIQUE (company_id, name);

-- sales (référence unique par entreprise)
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_user_id_reference_key;
ALTER TABLE public.sales ADD CONSTRAINT sales_company_id_reference_key UNIQUE (company_id, reference);

-- purchases
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_user_id_reference_key;
ALTER TABLE public.purchases ADD CONSTRAINT purchases_company_id_reference_key UNIQUE (company_id, reference);

-- document_sequences : numérotation par entreprise (pas par user)
ALTER TABLE public.document_sequences DROP CONSTRAINT IF EXISTS document_sequences_user_id_type_year_key;
DROP INDEX IF EXISTS idx_document_sequences_user_type_year;
ALTER TABLE public.document_sequences ADD CONSTRAINT document_sequences_company_id_type_year_key UNIQUE (company_id, type, year);

-- stock : un seul enregistrement de stock par produit par entreprise
ALTER TABLE public.stock DROP CONSTRAINT IF EXISTS stock_user_id_product_id_key;
ALTER TABLE public.stock ADD CONSTRAINT stock_company_id_product_id_key UNIQUE (company_id, product_id);

-- ── 8. Index sur company_id pour les performances ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_company         ON public.clients (company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company       ON public.suppliers (company_id);
CREATE INDEX IF NOT EXISTS idx_products_company        ON public.products (company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company           ON public.sales (company_id);
CREATE INDEX IF NOT EXISTS idx_purchases_company       ON public.purchases (company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company       ON public.documents (company_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_company ON public.client_payments (company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_company ON public.supplier_payments (company_id);
CREATE INDEX IF NOT EXISTS idx_stock_company           ON public.stock (company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON public.stock_movements (company_id);
