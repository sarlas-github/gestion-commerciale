-- ============================================================
-- SCRIPT SQL COMPLET - APPLICATION GESTION COMMERCIALE
-- À exécuter dans Supabase > SQL Editor
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 2. TABLE COMPANIES (infos de l'entreprise de l'utilisateur)
-- ============================================================
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  ice         TEXT,
  rc          TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 3. TABLE PRODUCTS
-- ============================================================
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('individual', 'pack')),
  pieces_count  INTEGER NOT NULL DEFAULT 1,
  stock_alert   INTEGER DEFAULT 0,  -- seuil d'alerte stock faible
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 4. TABLE CLIENTS
-- ============================================================
CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  ice         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 5. TABLE SUPPLIERS (fournisseurs)
-- ============================================================
CREATE TABLE suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  ice         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 6. TABLE STOCK
-- ============================================================
CREATE TABLE stock (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);


-- ============================================================
-- 7. TABLE STOCK_MOVEMENTS (historique mouvements)
-- ============================================================
CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
  quantity        INTEGER NOT NULL,
  reference_type  TEXT CHECK (reference_type IN ('purchase', 'sale', 'manual')),
  reference_id    UUID,   -- id de l'achat ou de la vente concernée
  note            TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 8. TABLE PURCHASES (achats fournisseurs)
-- ============================================================
CREATE TABLE purchases (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  reference     TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid          NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining     NUMERIC(12,2) GENERATED ALWAYS AS (total - paid) STORED,
  status        TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'partial', 'unpaid')),
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 9. TABLE PURCHASE_ITEMS (lignes d'achat)
-- ============================================================
CREATE TABLE purchase_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id  UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL,
  subtotal     NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);


-- ============================================================
-- 10. TABLE SUPPLIER_PAYMENTS (paiements fournisseurs)
-- ============================================================
CREATE TABLE supplier_payments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id  UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  amount       NUMERIC(12,2) NOT NULL,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 11. TABLE SALES (ventes)
-- ============================================================
CREATE TABLE sales (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid        NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining   NUMERIC(12,2) GENERATED ALWAYS AS (total - paid) STORED,
  status      TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'partial', 'unpaid')),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 12. TABLE SALE_ITEMS (lignes de vente)
-- ============================================================
CREATE TABLE sale_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id      UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL,
  pieces_count INTEGER NOT NULL DEFAULT 1,  -- snapshot du pieces_count au moment de la vente
  unit_price   NUMERIC(12,2) NOT NULL,
  subtotal     NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);


-- ============================================================
-- 13. TABLE CLIENT_PAYMENTS (paiements clients)
-- ============================================================
CREATE TABLE client_payments (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sale_id   UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount    NUMERIC(12,2) NOT NULL,
  date      DATE NOT NULL DEFAULT CURRENT_DATE,
  note      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 14. TABLE DOCUMENTS (devis / BC / BL / facture - générique)
-- ============================================================
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  sale_id         UUID REFERENCES sales(id) ON DELETE SET NULL,     -- lien vers la vente (si généré depuis vente)
  parent_id       UUID REFERENCES documents(id) ON DELETE SET NULL, -- lien vers doc précédent (conversion)
  type            TEXT NOT NULL CHECK (type IN ('quote', 'order', 'delivery', 'invoice')),
  number          TEXT NOT NULL,  -- ex: FAC-2025-001
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  payment_status  TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid            NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining       NUMERIC(12,2) GENERATED ALWAYS AS (total - paid) STORED,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 15. TABLE DOCUMENT_ITEMS (lignes de document)
-- ============================================================
CREATE TABLE document_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL,
  pieces_count INTEGER NOT NULL DEFAULT 1,
  unit_price   NUMERIC(12,2) NOT NULL,
  subtotal     NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);


-- ============================================================
-- 16. INDEXES (performance requêtes)
-- ============================================================
CREATE INDEX idx_products_user        ON products(user_id);
CREATE INDEX idx_clients_user         ON clients(user_id);
CREATE INDEX idx_suppliers_user       ON suppliers(user_id);
CREATE INDEX idx_stock_user           ON stock(user_id);
CREATE INDEX idx_stock_product        ON stock(product_id);
CREATE INDEX idx_stock_mov_user       ON stock_movements(user_id);
CREATE INDEX idx_stock_mov_product    ON stock_movements(product_id);
CREATE INDEX idx_purchases_user       ON purchases(user_id);
CREATE INDEX idx_purchases_supplier   ON purchases(supplier_id);
CREATE INDEX idx_purchases_date       ON purchases(date);
CREATE INDEX idx_purchase_items_purch ON purchase_items(purchase_id);
CREATE INDEX idx_supplier_pay_user    ON supplier_payments(user_id);
CREATE INDEX idx_supplier_pay_purch   ON supplier_payments(purchase_id);
CREATE INDEX idx_sales_user           ON sales(user_id);
CREATE INDEX idx_sales_client         ON sales(client_id);
CREATE INDEX idx_sales_date           ON sales(date);
CREATE INDEX idx_sale_items_sale      ON sale_items(sale_id);
CREATE INDEX idx_client_pay_user      ON client_payments(user_id);
CREATE INDEX idx_client_pay_sale      ON client_payments(sale_id);
CREATE INDEX idx_documents_user       ON documents(user_id);
CREATE INDEX idx_documents_client     ON documents(client_id);
CREATE INDEX idx_documents_sale       ON documents(sale_id);
CREATE INDEX idx_documents_parent     ON documents(parent_id);
CREATE INDEX idx_documents_type       ON documents(type);
CREATE INDEX idx_doc_items_doc        ON document_items(document_id);


-- ============================================================
-- 17. TRIGGER updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 18. ROW LEVEL SECURITY (RLS) - chaque user voit ses données
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_items    ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- POLICIES : chaque utilisateur voit/modifie
--            uniquement SES données
-- -----------------------------------------------

-- companies
CREATE POLICY "user_companies" ON companies
  FOR ALL USING (user_id = auth.uid());

-- products
CREATE POLICY "user_products" ON products
  FOR ALL USING (user_id = auth.uid());

-- clients
CREATE POLICY "user_clients" ON clients
  FOR ALL USING (user_id = auth.uid());

-- suppliers
CREATE POLICY "user_suppliers" ON suppliers
  FOR ALL USING (user_id = auth.uid());

-- stock
CREATE POLICY "user_stock" ON stock
  FOR ALL USING (user_id = auth.uid());

-- stock_movements
CREATE POLICY "user_stock_movements" ON stock_movements
  FOR ALL USING (user_id = auth.uid());

-- purchases
CREATE POLICY "user_purchases" ON purchases
  FOR ALL USING (user_id = auth.uid());

-- purchase_items (via purchase)
CREATE POLICY "user_purchase_items" ON purchase_items
  FOR ALL USING (
    purchase_id IN (
      SELECT id FROM purchases WHERE user_id = auth.uid()
    )
  );

-- supplier_payments
CREATE POLICY "user_supplier_payments" ON supplier_payments
  FOR ALL USING (user_id = auth.uid());

-- sales
CREATE POLICY "user_sales" ON sales
  FOR ALL USING (user_id = auth.uid());

-- sale_items (via sale)
CREATE POLICY "user_sale_items" ON sale_items
  FOR ALL USING (
    sale_id IN (
      SELECT id FROM sales WHERE user_id = auth.uid()
    )
  );

-- client_payments
CREATE POLICY "user_client_payments" ON client_payments
  FOR ALL USING (user_id = auth.uid());

-- documents
CREATE POLICY "user_documents" ON documents
  FOR ALL USING (user_id = auth.uid());

-- document_items (via document)
CREATE POLICY "user_document_items" ON document_items
  FOR ALL USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );


-- ============================================================
-- ✅ SCRIPT TERMINÉ
-- Toutes les tables, indexes, triggers et policies RLS sont créés
-- ============================================================