-- =============================================================================
-- App-wide optimization: server-side aggregation for all heavy queries
-- Run this in the Supabase SQL Editor (after 20260501_dashboard_optimization.sql)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Additional indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_purchases_user_supplier ON purchases(user_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_client_date  ON sales(user_id, client_id, date);

-- ---------------------------------------------------------------------------
-- 1. get_clients_with_stats()
--    Replaces: SELECT *, sales(total, paid, remaining, status) + JS reduce
--    Returns all clients with totalDu and paymentStatus computed in DB
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_clients_with_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id',            c.id,
    'user_id',       c.user_id,
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
    WHERE user_id = auth.uid()
    GROUP BY client_id
  ) agg ON agg.client_id = c.id
  WHERE c.user_id = auth.uid();

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. get_suppliers_with_stats()
--    Replaces: SELECT *, purchases(total, paid, remaining, status) + JS reduce
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_suppliers_with_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id',            s.id,
    'user_id',       s.user_id,
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
    WHERE user_id = auth.uid()
    GROUP BY supplier_id
  ) agg ON agg.supplier_id = s.id
  WHERE s.user_id = auth.uid();

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. get_client_monthly_stats(p_client_id, p_year, p_month)
--    Replaces: SELECT total/paid/remaining WHERE client+date + 3x JS reduce
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_client_monthly_stats(
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
  v_start  date;
  v_end    date;
  v_result json;
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
  WHERE user_id   = auth.uid()
    AND client_id = p_client_id
    AND date BETWEEN v_start AND v_end;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. get_supplier_monthly_stats(p_supplier_id, p_year, p_month)
--    Replaces: SELECT total/paid/remaining WHERE supplier+date + 3x JS reduce
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_supplier_monthly_stats(
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
  v_start  date;
  v_end    date;
  v_result json;
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
  WHERE user_id     = auth.uid()
    AND supplier_id = p_supplier_id
    AND date BETWEEN v_start AND v_end;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. get_client_report(p_year, p_month)
--    Replaces: SELECT sales+clients join + JS Map+reduce
--    Returns { rows: ClientReportRow[], totals: {...} }
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_client_report(p_year int, p_month int)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
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

  -- Aggregation groupée par client (1 query DB)
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
    WHERE s.user_id = auth.uid()
      AND s.date BETWEEN v_start AND v_end
    GROUP BY c.id, c.name
  ) t;

  -- Totaux calculés depuis le JSON (en mémoire, sans retour DB)
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

-- ---------------------------------------------------------------------------
-- 6. get_supplier_report(p_year, p_month)
--    Replaces: SELECT purchases+suppliers join + JS Map+reduce
--    Returns { rows: SupplierReportRow[], totals: {...} }
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_supplier_report(p_year int, p_month int)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
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

  -- Aggregation groupée par fournisseur (1 query DB)
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
    WHERE p.user_id = auth.uid()
      AND p.date BETWEEN v_start AND v_end
    GROUP BY su.id, su.name
  ) t;

  -- Totaux calculés depuis le JSON (en mémoire, sans retour DB)
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

-- ---------------------------------------------------------------------------
-- 7. get_stock_alert_count()
--    Replaces: SELECT products+stock + JS filter().length
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_stock_alert_count()
RETURNS int
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM products p
  LEFT JOIN stock st ON st.product_id = p.id AND st.user_id = p.user_id
  WHERE p.user_id = auth.uid()
    AND (COALESCE(st.quantity, 0) = 0 OR COALESCE(st.quantity, 0) <= p.stock_alert);
$$;
