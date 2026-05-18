-- ============================================================
-- Multi-tenant: Réécriture de toutes les politiques RLS
-- Filtre désormais par company_id = get_my_company_id() au lieu de user_id = auth.uid()
-- Fichier: 17-05-2026_04_multi_tenant_rls.sql
-- ============================================================

-- ── clients ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_clients" ON public.clients;
CREATE POLICY "company_clients" ON public.clients
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── suppliers ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_suppliers" ON public.suppliers;
CREATE POLICY "company_suppliers" ON public.suppliers
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── products ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_products" ON public.products;
CREATE POLICY "company_products" ON public.products
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── sales ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_sales" ON public.sales;
CREATE POLICY "company_sales" ON public.sales
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── purchases ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_purchases" ON public.purchases;
CREATE POLICY "company_purchases" ON public.purchases
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── documents ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_documents" ON public.documents;
CREATE POLICY "company_documents" ON public.documents
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── document_sequences ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_document_sequences" ON public.document_sequences;
CREATE POLICY "company_document_sequences" ON public.document_sequences
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── client_payments ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_client_payments" ON public.client_payments;
CREATE POLICY "company_client_payments" ON public.client_payments
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── supplier_payments ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_supplier_payments" ON public.supplier_payments;
CREATE POLICY "company_supplier_payments" ON public.supplier_payments
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── stock ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_stock" ON public.stock;
CREATE POLICY "company_stock" ON public.stock
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── stock_movements ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_stock_movements" ON public.stock_movements;
CREATE POLICY "company_stock_movements" ON public.stock_movements
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- ── sale_items (tables enfant : filtrage via parent) ─────────────────────────
DROP POLICY IF EXISTS "user_sale_items" ON public.sale_items;
CREATE POLICY "company_sale_items" ON public.sale_items
  USING (sale_id IN (
    SELECT id FROM public.sales WHERE company_id = get_my_company_id()
  ));

-- ── purchase_items ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_purchase_items" ON public.purchase_items;
CREATE POLICY "company_purchase_items" ON public.purchase_items
  USING (purchase_id IN (
    SELECT id FROM public.purchases WHERE company_id = get_my_company_id()
  ));

-- ── document_items ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_document_items" ON public.document_items;
CREATE POLICY "company_document_items" ON public.document_items
  USING (document_id IN (
    SELECT id FROM public.documents WHERE company_id = get_my_company_id()
  ));

-- ── companies (inchangée : chaque user voit sa propre entreprise) ─────────────
-- La politique "user_companies" reste filtrée par user_id = auth.uid()
-- car l'utilisateur ne doit modifier que son entreprise (admin de celle-ci)

-- ── profiles (inchangée : table individuelle par user) ────────────────────────
-- La politique "Users can manage their own profile" reste inchangée
