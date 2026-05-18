-- ============================================================
-- Multi-tenant: Réécriture de toutes les fonctions PostgreSQL
-- Le filtre user_id = auth.uid() est remplacé par company_id = get_my_company_id()
-- Fichier: 17-05-2026_05_multi_tenant_functions.sql
-- ============================================================


-- ── cancel_transaction ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_transaction(
  p_id   uuid,
  p_type text  -- 'purchase' | 'sale'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancelled  CONSTANT text := 'cancelled';
  v_uid        uuid;
  v_company_id uuid;
  v_reference  text;
  v_date       date;
  v_paid       numeric;
  v_item       record;
  v_status     text;
  v_stock_avant integer;
BEGIN
  v_uid        := auth.uid();
  v_company_id := get_my_company_id();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Aucune entreprise associée';
  END IF;
  IF p_type NOT IN ('purchase', 'sale') THEN
    RAISE EXCEPTION 'Type invalide : %', p_type;
  END IF;

  IF p_type = 'purchase' THEN
    SELECT status, reference, date, paid
      INTO v_status, v_reference, v_date, v_paid
      FROM purchases
     WHERE id = p_id AND company_id = v_company_id
       FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Achat introuvable'; END IF;
  ELSE
    SELECT status, reference, date, paid
      INTO v_status, v_reference, v_date, v_paid
      FROM sales
     WHERE id = p_id AND company_id = v_company_id
       FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Vente introuvable'; END IF;
  END IF;

  IF v_status = v_cancelled THEN
    RAISE EXCEPTION 'Cette transaction est déjà annulée';
  END IF;

  IF v_paid > 0 THEN
    RAISE EXCEPTION 'Annulation impossible : un paiement a déjà été enregistré pour cette transaction.';
  END IF;

  IF p_type = 'sale' THEN
    IF EXISTS (
      SELECT 1 FROM documents
       WHERE sale_id = p_id AND company_id = v_company_id AND type = 'invoice'
    ) THEN
      RAISE EXCEPTION 'Annulation impossible : une facture a déjà été générée pour cette vente.';
    END IF;
  END IF;

  IF p_type = 'purchase' THEN
    UPDATE purchases
       SET status = v_cancelled, updated_at = now()
     WHERE id = p_id AND company_id = v_company_id;
  ELSE
    UPDATE sales
       SET status = v_cancelled, updated_at = now()
     WHERE id = p_id AND company_id = v_company_id;
  END IF;

  IF p_type = 'purchase' THEN
    FOR v_item IN
      SELECT pi.product_id, pi.quantity
        FROM purchase_items pi WHERE pi.purchase_id = p_id
    LOOP
      SELECT COALESCE(quantity, 0) INTO v_stock_avant
        FROM stock WHERE product_id = v_item.product_id AND company_id = v_company_id;

      UPDATE stock
         SET quantity = quantity - v_item.quantity, updated_at = now()
       WHERE product_id = v_item.product_id AND company_id = v_company_id;

      INSERT INTO stock_movements (
        user_id, company_id, product_id, type, quantity,
        reference_type, reference_id, note, date, stock_avant, stock_apres
      ) VALUES (
        v_uid, v_company_id, v_item.product_id, 'out', -v_item.quantity,
        'purchase', p_id,
        'Annulation ' || COALESCE(v_reference, 'achat'),
        COALESCE(v_date, CURRENT_DATE),
        v_stock_avant, v_stock_avant - v_item.quantity
      );
    END LOOP;

  ELSE
    FOR v_item IN
      SELECT si.product_id, si.quantity
        FROM sale_items si WHERE si.sale_id = p_id
    LOOP
      SELECT COALESCE(quantity, 0) INTO v_stock_avant
        FROM stock WHERE product_id = v_item.product_id AND company_id = v_company_id;

      INSERT INTO stock (user_id, company_id, product_id, quantity)
        VALUES (v_uid, v_company_id, v_item.product_id, v_item.quantity)
      ON CONFLICT (company_id, product_id)
      DO UPDATE SET quantity = stock.quantity + v_item.quantity, updated_at = now();

      INSERT INTO stock_movements (
        user_id, company_id, product_id, type, quantity,
        reference_type, reference_id, note, date, stock_avant, stock_apres
      ) VALUES (
        v_uid, v_company_id, v_item.product_id, 'in', v_item.quantity,
        'sale', p_id,
        'Annulation ' || COALESCE(v_reference, 'vente'),
        COALESCE(v_date, CURRENT_DATE),
        v_stock_avant, v_stock_avant + v_item.quantity
      );
    END LOOP;
  END IF;
END;
$$;


-- ── create_invoice ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_invoice(
  p_sale_id       uuid,
  p_client_id     uuid,
  p_date          date,
  p_note          text,
  p_total         numeric,
  p_paid          numeric,
  p_tva_rate      numeric,
  p_tva_amount    numeric,
  p_mode_paiement text,
  p_items         jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid    := auth.uid();
  v_company_id     uuid    := get_my_company_id();
  v_year           int     := EXTRACT(YEAR FROM p_date)::int;
  v_seq            int;
  v_number         text;
  v_doc_id         uuid;
  v_company        record;
  v_client         record;
  v_payment_status text;
  v_item           jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Aucune entreprise associée'; END IF;

  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND company_id = v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id AND company_id = v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO document_sequences (user_id, company_id, type, year, last_number)
  VALUES (v_user_id, v_company_id, 'invoice', v_year, 1)
  ON CONFLICT (company_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;

  v_number := 'FAC-' || v_year || '-' || LPAD(v_seq::text, 3, '0');

  v_payment_status := CASE
    WHEN p_paid >= p_total THEN 'paid'
    WHEN p_paid > 0        THEN 'partial'
    ELSE                        'unpaid'
  END;

  SELECT * INTO v_company FROM companies WHERE id = v_company_id;
  SELECT name, address, ice, phone INTO v_client FROM clients WHERE id = p_client_id;

  INSERT INTO documents (
    user_id, company_id, client_id, sale_id,
    type, number, date, status, payment_status,
    total, tva_rate, tva_amount, paid, note,
    client_name, client_address, client_ice, client_phone,
    company_name, company_address, company_phone, company_email,
    company_ice, company_if, company_rc, company_tp, company_rib,
    company_site_web, company_couleur_marque, company_logo_url,
    mode_paiement
  ) VALUES (
    v_user_id, v_company_id, p_client_id, p_sale_id,
    'invoice', v_number, p_date, 'confirmed', v_payment_status,
    p_total, p_tva_rate, p_tva_amount, p_paid, p_note,
    v_client.name, v_client.address, v_client.ice, v_client.phone,
    v_company.name, v_company.address, v_company.phone, v_company.email,
    v_company.ice, v_company.if_number, v_company.rc, v_company.tp_number, v_company.rib,
    v_company.site_web, v_company.couleur_marque, v_company.logo_url,
    p_mode_paiement
  )
  RETURNING id INTO v_doc_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO document_items (document_id, product_id, product_name, quantity, pieces_count, unit_price)
    VALUES (
      v_doc_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::int * (v_item->>'pieces_count')::int,
      1,
      (v_item->>'unit_price')::numeric
    );
  END LOOP;

  RETURN v_doc_id;
END;
$$;


-- ── create_receipt ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_receipt(
  p_payment_id    uuid,
  p_sale_id       uuid,
  p_client_id     uuid,
  p_date          date,
  p_total         numeric,
  p_paid          numeric,
  p_tva_rate      numeric,
  p_tva_amount    numeric,
  p_mode_paiement text,
  p_items         jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid    := auth.uid();
  v_company_id uuid    := get_my_company_id();
  v_year       int     := EXTRACT(YEAR FROM p_date)::int;
  v_seq        int;
  v_number     text;
  v_doc_id     uuid;
  v_company    record;
  v_item       jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Aucune entreprise associée'; END IF;

  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND company_id = v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM client_payments WHERE id = p_payment_id AND company_id = v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO document_sequences (user_id, company_id, type, year, last_number)
  VALUES (v_user_id, v_company_id, 'receipt', v_year, 1)
  ON CONFLICT (company_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;

  v_number := 'REC-' || v_year || '-' || LPAD(v_seq::text, 3, '0');

  SELECT * INTO v_company FROM companies WHERE id = v_company_id;

  INSERT INTO documents (
    user_id, company_id, client_id, sale_id, payment_id,
    type, number, date, status, payment_status,
    total, tva_rate, tva_amount, paid, note,
    company_name, company_address, company_phone, company_email,
    company_ice, company_if, company_rc, company_tp, company_rib,
    company_site_web, company_couleur_marque, company_logo_url,
    mode_paiement
  ) VALUES (
    v_user_id, v_company_id, p_client_id, p_sale_id, p_payment_id,
    'receipt', v_number, p_date, 'confirmed', 'paid',
    p_total, p_tva_rate, p_tva_amount, p_paid, NULL,
    v_company.name, v_company.address, v_company.phone, v_company.email,
    v_company.ice, v_company.if_number, v_company.rc, v_company.tp_number, v_company.rib,
    v_company.site_web, v_company.couleur_marque, v_company.logo_url,
    p_mode_paiement
  )
  RETURNING id INTO v_doc_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO document_items (document_id, product_id, product_name, quantity, pieces_count, unit_price)
    VALUES (
      v_doc_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::int,
      1,
      (v_item->>'unit_price')::numeric
    );
  END LOOP;

  RETURN v_doc_id;
END;
$$;


-- ── get_available_years ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_available_years(p_table text)
RETURNS int[]
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_table = 'sales' THEN
    RETURN ARRAY(
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int
      FROM sales
      WHERE company_id = get_my_company_id()
      ORDER BY 1 DESC
    );
  ELSIF p_table = 'purchases' THEN
    RETURN ARRAY(
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int
      FROM purchases
      WHERE company_id = get_my_company_id()
      ORDER BY 1 DESC
    );
  END IF;
  RETURN '{}';
END;
$$;


-- ── get_client_monthly_stats ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_client_monthly_stats(
  p_client_id uuid,
  p_year      int,
  p_month     int
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_start     date;
  v_end       date;
  v_result    json;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;

  SELECT json_build_object(
    'totalVentes', COALESCE(SUM(total),     0),
    'totalPaye',   COALESCE(SUM(paid),      0),
    'resteAPayer', COALESCE(SUM(remaining), 0)
  )
  INTO v_result
  FROM sales
  WHERE company_id = get_my_company_id()
    AND client_id  = p_client_id
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  RETURN v_result;
END;
$$;


-- ── get_supplier_monthly_stats ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_supplier_monthly_stats(
  p_supplier_id uuid,
  p_year        int,
  p_month       int
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_start     date;
  v_end       date;
  v_result    json;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;

  SELECT json_build_object(
    'totalAchats', COALESCE(SUM(total),     0),
    'totalPaye',   COALESCE(SUM(paid),      0),
    'resteAPayer', COALESCE(SUM(remaining), 0)
  )
  INTO v_result
  FROM purchases
  WHERE company_id  = get_my_company_id()
    AND supplier_id = p_supplier_id
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  RETURN v_result;
END;
$$;


-- ── get_client_report ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_client_report(p_year int, p_month int)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_start  date;
  v_end    date;
  v_rows   json;
  v_totals json;
BEGIN
  IF p_month = 0 THEN
    v_start := make_date(p_year, 1, 1);
    v_end   := make_date(p_year, 12, 31);
  ELSE
    v_start := make_date(p_year, p_month, 1);
    v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'client_id',    client_id,
    'client_name',  client_name,
    'total_ventes', total_ventes,
    'total_paye',   total_paye,
    'reste',        reste
  ) ORDER BY lower(client_name)), '[]'::json)
  INTO v_rows
  FROM (
    SELECT
      c.id          AS client_id,
      c.name        AS client_name,
      SUM(s.total)     AS total_ventes,
      SUM(s.paid)      AS total_paye,
      SUM(s.remaining) AS reste
    FROM sales s
    JOIN clients c ON c.id = s.client_id
    WHERE s.company_id = get_my_company_id()
      AND s.date BETWEEN v_start AND v_end
      AND s.status != v_cancelled
    GROUP BY c.id, c.name
  ) t;

  SELECT json_build_object(
    'total_ventes', COALESCE(SUM((r->>'total_ventes')::numeric), 0),
    'total_paye',   COALESCE(SUM((r->>'total_paye')::numeric),   0),
    'reste',        COALESCE(SUM((r->>'reste')::numeric),        0)
  )
  INTO v_totals
  FROM json_array_elements(v_rows) AS r;

  RETURN json_build_object('rows', v_rows, 'totals', v_totals);
END;
$$;


-- ── get_supplier_report ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_supplier_report(p_year int, p_month int)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_start  date;
  v_end    date;
  v_rows   json;
  v_totals json;
BEGIN
  IF p_month = 0 THEN
    v_start := make_date(p_year, 1, 1);
    v_end   := make_date(p_year, 12, 31);
  ELSE
    v_start := make_date(p_year, p_month, 1);
    v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'supplier_id',   supplier_id,
    'supplier_name', supplier_name,
    'total_achats',  total_achats,
    'total_paye',    total_paye,
    'reste',         reste
  ) ORDER BY lower(supplier_name)), '[]'::json)
  INTO v_rows
  FROM (
    SELECT
      su.id          AS supplier_id,
      su.name        AS supplier_name,
      SUM(p.total)      AS total_achats,
      SUM(p.paid)       AS total_paye,
      SUM(p.remaining)  AS reste
    FROM purchases p
    JOIN suppliers su ON su.id = p.supplier_id
    WHERE p.company_id = get_my_company_id()
      AND p.date BETWEEN v_start AND v_end
      AND p.status != v_cancelled
    GROUP BY su.id, su.name
  ) t;

  SELECT json_build_object(
    'total_achats', COALESCE(SUM((r->>'total_achats')::numeric), 0),
    'total_paye',   COALESCE(SUM((r->>'total_paye')::numeric),   0),
    'reste',        COALESCE(SUM((r->>'reste')::numeric),        0)
  )
  INTO v_totals
  FROM json_array_elements(v_rows) AS r;

  RETURN json_build_object('rows', v_rows, 'totals', v_totals);
END;
$$;


-- ── get_clients_with_stats ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_clients_with_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_result    json;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id',            c.id,
    'user_id',       c.user_id,
    'company_id',    c.company_id,
    'name',          c.name,
    'phone',         c.phone,
    'address',       c.address,
    'ice',           c.ice,
    'created_at',    c.created_at,
    'updated_at',    c.updated_at,
    'totalDu',       COALESCE(agg.total_du, 0),
    'paymentStatus', CASE
                       WHEN COALESCE(agg.total_du, 0) = 0 THEN 'ok'
                       WHEN COALESCE(agg.has_unpaid, false) THEN 'unpaid'
                       ELSE 'partial'
                     END
  ) ORDER BY c.created_at DESC), '[]'::json)
  INTO v_result
  FROM clients c
  LEFT JOIN (
    SELECT
      client_id,
      SUM(remaining)                           AS total_du,
      bool_or(status IN ('unpaid', 'partial')) AS has_unpaid
    FROM sales
    WHERE company_id = get_my_company_id()
      AND status != v_cancelled
    GROUP BY client_id
  ) agg ON agg.client_id = c.id
  WHERE c.company_id = get_my_company_id();

  RETURN v_result;
END;
$$;


-- ── get_suppliers_with_stats ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_suppliers_with_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_result    json;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id',            s.id,
    'user_id',       s.user_id,
    'company_id',    s.company_id,
    'name',          s.name,
    'phone',         s.phone,
    'address',       s.address,
    'ice',           s.ice,
    'created_at',    s.created_at,
    'updated_at',    s.updated_at,
    'totalDu',       COALESCE(agg.total_du, 0),
    'paymentStatus', CASE
                       WHEN COALESCE(agg.total_du, 0) = 0 THEN 'ok'
                       WHEN COALESCE(agg.has_unpaid, false) THEN 'unpaid'
                       ELSE 'partial'
                     END
  ) ORDER BY s.created_at DESC), '[]'::json)
  INTO v_result
  FROM suppliers s
  LEFT JOIN (
    SELECT
      supplier_id,
      SUM(remaining)                           AS total_du,
      bool_or(status IN ('unpaid', 'partial')) AS has_unpaid
    FROM purchases
    WHERE company_id = get_my_company_id()
      AND status != v_cancelled
    GROUP BY supplier_id
  ) agg ON agg.supplier_id = s.id
  WHERE s.company_id = get_my_company_id();

  RETURN v_result;
END;
$$;


-- ── get_stock_alert_count ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_stock_alert_count()
RETURNS int
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM products p
  LEFT JOIN stock st ON st.product_id = p.id AND st.company_id = p.company_id
  WHERE p.company_id = get_my_company_id()
    AND (COALESCE(st.quantity, 0) = 0 OR COALESCE(st.quantity, 0) <= p.stock_alert);
$$;


-- ── get_unpaid_clients_count ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_unpaid_clients_count()
RETURNS int
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM clients c
  LEFT JOIN (
    SELECT
      client_id,
      SUM(remaining)                           AS total_du,
      bool_or(status IN ('unpaid', 'partial')) AS has_unpaid
    FROM sales
    WHERE company_id = get_my_company_id()
      AND status != 'cancelled'
    GROUP BY client_id
  ) agg ON agg.client_id = c.id
  WHERE c.company_id = get_my_company_id()
    AND COALESCE(agg.total_du, 0) > 0
    AND COALESCE(agg.has_unpaid, false) = true;
$$;


-- ── get_unpaid_suppliers_count ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_unpaid_suppliers_count()
RETURNS int
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM suppliers s
  LEFT JOIN (
    SELECT
      supplier_id,
      SUM(remaining)                           AS total_du,
      bool_or(status IN ('unpaid', 'partial')) AS has_unpaid
    FROM purchases
    WHERE company_id = get_my_company_id()
      AND status != 'cancelled'
    GROUP BY supplier_id
  ) agg ON agg.supplier_id = s.id
  WHERE s.company_id = get_my_company_id()
    AND COALESCE(agg.total_du, 0) > 0
    AND COALESCE(agg.has_unpaid, false) = true;
$$;


-- ── get_dashboard_stats ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_year int, p_month int)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cancelled    CONSTANT text := 'cancelled';
  v_start        date;
  v_end          date;
  v_ca           numeric := 0;
  v_enc          numeric := 0;
  v_arec         numeric := 0;
  v_nb           bigint  := 0;
  v_ach          numeric := 0;
  v_dec          numeric := 0;
  v_apay         numeric := 0;
  v_vpj          json;
  v_apj          json;
  v_produits_agg json;
  v_top5p        json;
  v_top5c        json;
  v_rpart        json;
  v_alerts       json;
BEGIN
  IF p_month = 0 THEN
    v_start := make_date(p_year, 1, 1);
    v_end   := make_date(p_year, 12, 31);
  ELSE
    v_start := make_date(p_year, p_month, 1);
    v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;
  END IF;

  SELECT
    COALESCE(SUM(total),     0),
    COALESCE(SUM(paid),      0),
    COALESCE(SUM(remaining), 0),
    COUNT(*)
  INTO v_ca, v_enc, v_arec, v_nb
  FROM sales
  WHERE company_id = get_my_company_id()
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  SELECT
    COALESCE(SUM(total),     0),
    COALESCE(SUM(paid),      0),
    COALESCE(SUM(remaining), 0)
  INTO v_ach, v_dec, v_apay
  FROM purchases
  WHERE company_id = get_my_company_id()
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  IF p_month = 0 THEN
    SELECT json_agg(
      json_build_object('day', day_label, 'total', COALESCE(agg.total, 0))
      ORDER BY m
    )
    INTO v_vpj
    FROM generate_series(1, 12) AS m
    CROSS JOIN LATERAL (
      SELECT CASE m
        WHEN 1  THEN 'Jan' WHEN 2  THEN 'Fév' WHEN 3  THEN 'Mar'
        WHEN 4  THEN 'Avr' WHEN 5  THEN 'Mai' WHEN 6  THEN 'Jui'
        WHEN 7  THEN 'Jul' WHEN 8  THEN 'Aoû' WHEN 9  THEN 'Sep'
        WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Déc'
      END AS day_label
    ) lbl
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM date)::int AS mois, SUM(total) AS total
      FROM sales
      WHERE company_id = get_my_company_id() AND date BETWEEN v_start AND v_end
        AND status != v_cancelled
      GROUP BY mois
    ) agg ON agg.mois = m;
  ELSE
    SELECT json_agg(
      json_build_object('day', d::text, 'total', COALESCE(agg.total, 0))
      ORDER BY d
    )
    INTO v_vpj
    FROM generate_series(1, EXTRACT(DAY FROM v_end)::int) AS d
    LEFT JOIN (
      SELECT EXTRACT(DAY FROM date)::int AS jour, SUM(total) AS total
      FROM sales
      WHERE company_id = get_my_company_id() AND date BETWEEN v_start AND v_end
        AND status != v_cancelled
      GROUP BY jour
    ) agg ON agg.jour = d;
  END IF;

  IF p_month = 0 THEN
    SELECT json_agg(
      json_build_object('day', day_label, 'total', COALESCE(agg.total, 0))
      ORDER BY m
    )
    INTO v_apj
    FROM generate_series(1, 12) AS m
    CROSS JOIN LATERAL (
      SELECT CASE m
        WHEN 1  THEN 'Jan' WHEN 2  THEN 'Fév' WHEN 3  THEN 'Mar'
        WHEN 4  THEN 'Avr' WHEN 5  THEN 'Mai' WHEN 6  THEN 'Jui'
        WHEN 7  THEN 'Jul' WHEN 8  THEN 'Aoû' WHEN 9  THEN 'Sep'
        WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Déc'
      END AS day_label
    ) lbl
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM date)::int AS mois, SUM(total) AS total
      FROM purchases
      WHERE company_id = get_my_company_id() AND date BETWEEN v_start AND v_end
        AND status != v_cancelled
      GROUP BY mois
    ) agg ON agg.mois = m;
  ELSE
    SELECT json_agg(
      json_build_object('day', d::text, 'total', COALESCE(agg.total, 0))
      ORDER BY d
    )
    INTO v_apj
    FROM generate_series(1, EXTRACT(DAY FROM v_end)::int) AS d
    LEFT JOIN (
      SELECT EXTRACT(DAY FROM date)::int AS jour, SUM(total) AS total
      FROM purchases
      WHERE company_id = get_my_company_id() AND date BETWEEN v_start AND v_end
        AND status != v_cancelled
      GROUP BY jour
    ) agg ON agg.jour = d;
  END IF;

  SELECT COALESCE(json_agg(json_build_object('name', name, 'total', total)), '[]'::json)
  INTO v_produits_agg
  FROM (
    SELECT p.name, SUM(si.quantity * si.unit_price) AS total
    FROM sale_items si
    JOIN sales     s ON s.id = si.sale_id
    JOIN products  p ON p.id = si.product_id
    WHERE s.company_id = get_my_company_id()
      AND s.date BETWEEN v_start AND v_end
      AND s.status != v_cancelled
    GROUP BY p.id, p.name
    ORDER BY total DESC
    LIMIT 8
  ) t;

  SELECT COALESCE(json_agg(elem), '[]'::json)
  INTO v_top5p
  FROM json_array_elements(v_produits_agg) WITH ORDINALITY AS t(elem, ord)
  WHERE ord <= 5;

  SELECT COALESCE(json_agg(json_build_object('name', elem->>'name', 'value', (elem->>'total')::numeric)), '[]'::json)
  INTO v_rpart
  FROM json_array_elements(v_produits_agg) AS elem;

  SELECT COALESCE(json_agg(json_build_object('name', name, 'total', total)), '[]'::json)
  INTO v_top5c
  FROM (
    SELECT c.name, SUM(s.total) AS total
    FROM sales   s
    JOIN clients c ON c.id = s.client_id
    WHERE s.company_id = get_my_company_id()
      AND s.date BETWEEN v_start AND v_end
      AND s.status != v_cancelled
    GROUP BY c.id, c.name
    ORDER BY total DESC
    LIMIT 5
  ) t;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id',          p.id,
      'name',        p.name,
      'quantity',    COALESCE(st.quantity, 0),
      'stock_alert', COALESCE(p.stock_alert, 0),
      'status',      CASE WHEN COALESCE(st.quantity, 0) <= 0 THEN 'rupture' ELSE 'faible' END
    )
    ORDER BY COALESCE(st.quantity, 0)
  ), '[]'::json)
  INTO v_alerts
  FROM products p
  LEFT JOIN stock st ON st.product_id = p.id AND st.company_id = p.company_id
  WHERE p.company_id = get_my_company_id()
    AND (COALESCE(st.quantity, 0) <= 0 OR COALESCE(st.quantity, 0) <= p.stock_alert);

  RETURN json_build_object(
    'ca',                  v_ca,
    'encaisse',            v_enc,
    'aRecevoir',           v_arec,
    'nbVentes',            v_nb,
    'totalAchats',         v_ach,
    'decaisse',            v_dec,
    'aPayer',              v_apay,
    'marge',               v_ca - v_ach,
    'panierMoyen',         CASE WHEN v_nb > 0 THEN v_ca / v_nb ELSE 0 END,
    'ventesParJour',       COALESCE(v_vpj, '[]'::json),
    'achatsParJour',       COALESCE(v_apj, '[]'::json),
    'top5Produits',        v_top5p,
    'top5Clients',         v_top5c,
    'repartitionProduits', v_rpart,
    'stockAlerts',         v_alerts
  );
END;
$$;


-- ── get_next_doc_sequence ─────────────────────────────────────────────────────
-- Signature mise à jour : p_company_id remplace p_user_id
-- DROP nécessaire car PostgreSQL interdit de renommer les paramètres avec CREATE OR REPLACE
DROP FUNCTION IF EXISTS public.get_next_doc_sequence(uuid, text, integer);
CREATE OR REPLACE FUNCTION public.get_next_doc_sequence(
  p_company_id uuid,
  p_type       text,
  p_year       integer
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_seq integer;
BEGIN
  IF p_company_id NOT IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO document_sequences (user_id, company_id, type, year, last_number)
  VALUES (auth.uid(), p_company_id, p_type, p_year, 1)
  ON CONFLICT (company_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;
  RETURN v_seq;
END;
$$;


-- ── create_app_user ───────────────────────────────────────────────────────────
-- Nouvelle signature : p_company_name est obligatoire
-- Crée l'utilisateur + le profil + l'entreprise + l'entrée company_members (admin)
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

  -- 3. Mise à jour du profil (le trigger handle_new_user l'a déjà créé)
  UPDATE public.profiles SET business_mode = p_mode WHERE id = v_user_id;

  -- 4. Création de l'entreprise
  INSERT INTO public.companies (user_id, name)
  VALUES (v_user_id, p_company_name)
  RETURNING id INTO v_company_id;

  -- 5. Ajout de l'utilisateur comme admin de l'entreprise
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'admin');

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── regularize_user_invoices ──────────────────────────────────────────────────
-- Signature mise à jour : p_company_id remplace p_user_id
-- DROP nécessaire car PostgreSQL interdit de renommer les paramètres avec CREATE OR REPLACE
DROP FUNCTION IF EXISTS public.regularize_user_invoices(uuid);
CREATE OR REPLACE FUNCTION public.regularize_user_invoices(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r          record;
  v_new_ref  text;
BEGIN
  FOR r IN (
    SELECT id,
           EXTRACT(YEAR FROM date)::int AS doc_year,
           ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM date) ORDER BY date, created_at) AS new_seq
    FROM public.documents
    WHERE company_id = p_company_id AND type = 'invoice'
  ) LOOP
    v_new_ref := 'FAC-' || r.doc_year || '-' || LPAD(r.new_seq::text, 3, '0');
    UPDATE public.documents SET number = v_new_ref WHERE id = r.id;
  END LOOP;

  INSERT INTO public.document_sequences (user_id, company_id, type, year, last_number)
  SELECT
    (SELECT user_id FROM public.companies WHERE id = p_company_id),
    p_company_id, 'invoice', t.calc_year, MAX(t.new_seq)
  FROM (
    SELECT EXTRACT(YEAR FROM date)::int AS calc_year,
           ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM date) ORDER BY date, created_at) AS new_seq
    FROM public.documents
    WHERE company_id = p_company_id AND type = 'invoice'
  ) t
  GROUP BY t.calc_year
  ON CONFLICT (company_id, type, year) DO UPDATE SET last_number = EXCLUDED.last_number;
END;
$$;


-- ── generate_demo_data ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_demo_data(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_names text[] := ARRAY['Ordinateur Portable Pro i7', 'Ecran Dell 27p 4K', 'Clavier Logitech MX', 'Souris MX Master 3S', 'Casque Bose QC45', 'Imprimante HP LaserJet', 'Bureau Motorisé Sit-Stand', 'Chaise Herman Miller Aura', 'Disque SSD Samsung 2To', 'Webcam Razer Kiyo Pro', 'Hub USB-C Satechi', 'Enceintes JBL Flip 6', 'Sac à Dos Targus Pro', 'Tapis de Souris SteelSeries', 'Support Bras Double Ecran', 'Multiprise Belkin Pro', 'Adaptateur Apple USB-C', 'Câble Cat7 Snagless 10m', 'Lampe BenQ ScreenBar', 'Clé SanDisk Extreme 256'];
    v_client_names text[] := ARRAY['Maroc Telecom Services', 'Attijari Solutions', 'BCP Logistique', 'OCP Group Distri', 'Managem Tech', 'Ciments du Maroc SARL', 'Label Vie Express', 'Cosumar Export', 'Marsa Maroc Souss', 'Royal Air Maroc Cargo', 'Afriquia Logistique', 'Saham Services', 'Akwa Group Partner', 'Alliances Bâtiment', 'Addoha Construction', 'HPS Global Trade', 'Wafa Assurance Buro', 'LafargeHolcim Maroc', 'Taqa Morocco Tech', 'Sonasid Distribution'];
    v_client_cities text[] := ARRAY['Casablanca', 'Rabat', 'Tanger', 'Marrakech', 'Agadir', 'Fès', 'Meknès', 'Oujda', 'Kénitra', 'Tétouan'];
    v_client_streets text[] := ARRAY['Boulevard Zerktouni', 'Avenue Mohammed V', 'Rue Taha Hussein', 'Quartier Gauthier', 'Sidi Maârouf', 'Technopark', 'Route d El Jadida', 'Avenue des FAR', 'Boulevard Anfa', 'Quartier de l Ocean'];
    v_supplier_names text[] := ARRAY['Tech Data Morocco', 'Disway Distribution', 'Ingram Micro Casa', 'M2M Group Supply', 'Microchoix Pro', 'Next Step IT', 'Omnishore Supply', 'Data Plus Maroc', 'Azur Systems', 'Global IT Morocco', 'Netcom Distrib', 'Sodexo Buro', 'Top Bureau Tanger', 'Office Depot Casa', 'Lydec Services IT', 'Inwi Business Solutions', 'Orange Business Maroc', 'Intelcia Tech', 'Sitel Group Supply', 'Majorel Tech Support'];

    v_product_ids uuid[];
    v_client_ids uuid[];
    v_supplier_ids uuid[];
    v_product_base_prices numeric[];

    v_company    record;
    v_company_id uuid;
    v_i int; v_j int; v_p_idx int;
    v_p_id uuid; v_c_id uuid; v_s_id uuid; v_t_id uuid; v_doc_id uuid;
    v_price numeric; v_qty int; v_total numeric; v_paid numeric;
    v_date date; v_addr text; v_ice text;
BEGIN
    SELECT * INTO v_company FROM public.companies WHERE user_id = p_user_id LIMIT 1;
    v_company_id := v_company.id;

    -- Nettoyage des données existantes de l'entreprise
    DELETE FROM public.document_items WHERE document_id IN (SELECT id FROM public.documents WHERE company_id = v_company_id);
    DELETE FROM public.documents WHERE company_id = v_company_id;
    DELETE FROM public.client_payments WHERE company_id = v_company_id;
    DELETE FROM public.supplier_payments WHERE company_id = v_company_id;
    DELETE FROM public.sale_items WHERE sale_id IN (SELECT id FROM public.sales WHERE company_id = v_company_id);
    DELETE FROM public.sales WHERE company_id = v_company_id;
    DELETE FROM public.purchase_items WHERE purchase_id IN (SELECT id FROM public.purchases WHERE company_id = v_company_id);
    DELETE FROM public.purchases WHERE company_id = v_company_id;
    DELETE FROM public.stock_movements WHERE company_id = v_company_id;
    DELETE FROM public.stock WHERE company_id = v_company_id;
    DELETE FROM public.products WHERE company_id = v_company_id;
    DELETE FROM public.clients WHERE company_id = v_company_id;
    DELETE FROM public.suppliers WHERE company_id = v_company_id;

    -- 1. Produits (20)
    FOR v_i IN 1..20 LOOP
        INSERT INTO public.products (user_id, company_id, name, type, pieces_count, stock_alert, updated_at)
        VALUES (p_user_id, v_company_id, v_product_names[v_i], 'individual', 1, 5, now() - (v_i || ' minutes')::interval)
        RETURNING id INTO v_p_id;
        v_product_ids := array_append(v_product_ids, v_p_id);
        v_price := floor(random() * 400 + 100);
        v_product_base_prices := array_append(v_product_base_prices, v_price);
        INSERT INTO public.stock (user_id, company_id, product_id, quantity, updated_at)
        VALUES (p_user_id, v_company_id, v_p_id, 100, now() - (v_i || ' minutes')::interval);
    END LOOP;

    -- 2. Clients & Fournisseurs
    FOR v_i IN 1..20 LOOP
        v_addr := v_client_streets[floor(random() * 10 + 1)] || ', ' || v_client_cities[floor(random() * 10 + 1)];
        v_ice := '00' || floor(random() * 90000000 + 10000000)::text || '0000';

        INSERT INTO public.clients (user_id, company_id, name, phone, address, ice, updated_at)
        VALUES (p_user_id, v_company_id, v_client_names[v_i], '06' || floor(random() * 90000000 + 10000000)::text, v_addr, v_ice, now() - (v_i || ' minutes')::interval)
        RETURNING id INTO v_c_id;
        v_client_ids := array_append(v_client_ids, v_c_id);

        INSERT INTO public.suppliers (user_id, company_id, name, phone, address, ice, updated_at)
        VALUES (p_user_id, v_company_id, v_supplier_names[v_i], '05' || floor(random() * 90000000 + 10000000)::text, 'Zone Industrielle, ' || v_client_cities[floor(random() * 5 + 1)], 'SUP-' || v_ice, now() - (v_i || ' minutes')::interval)
        RETURNING id INTO v_s_id;
        v_supplier_ids := array_append(v_supplier_ids, v_s_id);
    END LOOP;

    -- 3. Achats (3)
    FOR v_i IN 1..3 LOOP
        v_date := current_date - (v_i - 1 || ' days')::interval;
        v_s_id := v_supplier_ids[21-v_i];
        v_total := 0;
        INSERT INTO public.purchases (user_id, company_id, supplier_id, date, reference, status, total, paid)
        VALUES (p_user_id, v_company_id, v_s_id, v_date, 'ACH-' || floor(random()*9000+1000)::text, 'unpaid', 0, 0)
        RETURNING id INTO v_t_id;

        FOR v_j IN 1..(floor(random() * 2 + 1)) LOOP
            v_p_idx := floor(random() * 10 + 1);
            v_p_id := v_product_ids[v_p_idx];
            v_qty := floor(random() * 5 + 2);
            v_price := v_product_base_prices[v_p_idx];
            INSERT INTO public.purchase_items (purchase_id, product_id, quantity, unit_price) VALUES (v_t_id, v_p_id, v_qty, v_price);
            INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date)
            VALUES (p_user_id, v_company_id, v_p_id, 'in', v_qty, 'purchase', v_t_id, v_date);
            UPDATE public.stock SET quantity = quantity + v_qty WHERE product_id = v_p_id AND company_id = v_company_id;
            v_total := v_total + (v_qty * v_price);
        END LOOP;

        v_paid := CASE WHEN v_i = 1 THEN 0 ELSE v_total END;
        UPDATE public.purchases SET total = v_total, paid = v_paid, status = (CASE WHEN v_paid >= v_total THEN 'paid' ELSE 'unpaid' END) WHERE id = v_t_id;
        IF v_paid > 0 THEN
            INSERT INTO public.supplier_payments (user_id, company_id, purchase_id, amount, date, methode_paiement)
            VALUES (p_user_id, v_company_id, v_t_id, v_paid, v_date, 'Virement bancaire');
        END IF;
    END LOOP;

    -- 4. Ventes (11) avec factures
    FOR v_i IN 1..11 LOOP
        v_date := current_date - (v_i - 1 || ' days')::interval;
        v_c_id := v_client_ids[21-v_i];
        v_total := 0;

        INSERT INTO public.sales (user_id, company_id, client_id, date, reference, status, total, paid)
        VALUES (p_user_id, v_company_id, v_c_id, v_date, 'VEN-' || floor(random()*9000+1000)::text, 'unpaid', 0, 0)
        RETURNING id INTO v_t_id;

        SELECT address, ice, phone INTO v_addr, v_ice, v_price FROM public.clients WHERE id = v_c_id;

        INSERT INTO public.documents (
            user_id, company_id, client_id, sale_id, type, number, date, status, total, paid,
            client_name, client_address, client_ice, client_phone,
            company_name, company_address, company_phone, company_email,
            company_ice, company_if, company_rc, company_tp, company_rib,
            company_site_web, company_couleur_marque, company_logo_url, mode_paiement
        )
        VALUES (
            p_user_id, v_company_id, v_c_id, v_t_id,
            'invoice', 'FAC-' || (EXTRACT(YEAR FROM v_date)) || '-' || LPAD(v_i::text, 3, '0'), v_date, 'confirmed', 0, 0,
            v_client_names[21-v_i], v_addr, v_ice, v_price::text,
            COALESCE(v_company.name, 'Votre Société'), COALESCE(v_company.address, ''), COALESCE(v_company.phone, ''), COALESCE(v_company.email, ''),
            COALESCE(v_company.ice, ''), COALESCE(v_company.if_number, ''), COALESCE(v_company.rc, ''), COALESCE(v_company.tp_number, ''),
            COALESCE(v_company.rib, ''), COALESCE(v_company.site_web, ''), COALESCE(v_company.couleur_marque, '#4f46e5'),
            v_company.logo_url, 'Espèces'
        ) RETURNING id INTO v_doc_id;

        FOR v_j IN 1..(floor(random() * 2 + 1)) LOOP
            v_p_idx := floor(random() * 15 + 1);
            v_p_id := v_product_ids[v_p_idx];
            v_qty := floor(random() * 2 + 1);
            v_price := v_product_base_prices[v_p_idx] * 2.2;
            INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price) VALUES (v_t_id, v_p_id, v_qty, v_price);
            INSERT INTO public.document_items (document_id, product_id, product_name, quantity, unit_price) VALUES (v_doc_id, v_p_id, v_product_names[v_p_idx], v_qty, v_price);
            INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date)
            VALUES (p_user_id, v_company_id, v_p_id, 'out', v_qty, 'sale', v_t_id, v_date);
            UPDATE public.stock SET quantity = quantity - v_qty WHERE product_id = v_p_id AND company_id = v_company_id;
            v_total := v_total + (v_qty * v_price);
        END LOOP;

        v_paid := CASE WHEN v_i = 1 THEN 0 ELSE v_total END;
        UPDATE public.sales SET total = v_total, paid = v_paid, status = (CASE WHEN v_paid >= v_total THEN 'paid' ELSE 'unpaid' END) WHERE id = v_t_id;
        UPDATE public.documents SET total = v_total, paid = v_paid WHERE id = v_doc_id;
        IF v_paid > 0 THEN
            INSERT INTO public.client_payments (user_id, company_id, sale_id, amount, date, methode_paiement)
            VALUES (p_user_id, v_company_id, v_t_id, v_paid, v_date, 'Espèces');
        END IF;
    END LOOP;

    UPDATE public.clients  SET updated_at = now()           WHERE id = v_client_ids[20];
    UPDATE public.suppliers SET updated_at = now()          WHERE id = v_supplier_ids[20];
    UPDATE public.products  SET stock_alert = 5, updated_at = now() WHERE id = v_product_ids[20];
    UPDATE public.stock     SET quantity = 0, updated_at = now()    WHERE product_id = v_product_ids[20] AND company_id = v_company_id;

    RETURN 'Succès : Démo avec Logo et Données Réelles';
END;
$$;


-- ── Grants sur les nouvelles fonctions ───────────────────────────────────────
GRANT ALL ON FUNCTION public.get_my_company_id()                          TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.cancel_transaction(uuid, text)               TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.create_invoice(uuid, uuid, date, text, numeric, numeric, numeric, numeric, text, jsonb) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.create_receipt(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric, text, jsonb) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_available_years(text)                    TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_client_monthly_stats(uuid, int, int)     TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_supplier_monthly_stats(uuid, int, int)   TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_client_report(int, int)                  TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_supplier_report(int, int)                TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_clients_with_stats()                     TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_suppliers_with_stats()                   TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_stock_alert_count()                      TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_unpaid_clients_count()                   TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_unpaid_suppliers_count()                 TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_dashboard_stats(int, int)                TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_next_doc_sequence(uuid, text, int)       TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.create_app_user(text, text, text, text)      TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.regularize_user_invoices(uuid)               TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.generate_demo_data(uuid)                     TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.company_members                                  TO anon, authenticated, service_role;
