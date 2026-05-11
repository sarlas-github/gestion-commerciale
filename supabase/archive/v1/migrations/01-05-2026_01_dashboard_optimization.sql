-- =============================================================================
-- Dashboard optimization: server-side aggregation functions + indexes
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Indexes for fast date-range and join queries
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_sales_user_date      ON sales(user_id, date);
CREATE INDEX IF NOT EXISTS idx_purchases_user_date  ON purchases(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sales_user_client    ON sales(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id   ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product   ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_product_user   ON stock(product_id, user_id);
CREATE INDEX IF NOT EXISTS idx_products_user        ON products(user_id);

-- ---------------------------------------------------------------------------
-- 2. get_available_years(p_table) → int[]
--    Returns distinct years that have data for the given table.
--    Replaces: SELECT date FROM sales (fetches all rows)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_available_years(p_table text)
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
      WHERE user_id = auth.uid()
      ORDER BY 1 DESC
    );
  ELSIF p_table = 'purchases' THEN
    RETURN ARRAY(
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int
      FROM purchases
      WHERE user_id = auth.uid()
      ORDER BY 1 DESC
    );
  END IF;
  RETURN '{}';
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. get_dashboard_stats(p_year, p_month) → json
--    p_month = 0 → vue annuelle (tous les mois)
--    p_month = 1..12 → vue mensuelle (jours du mois)
--
--    Returns all dashboard data in ONE round trip:
--    KPIs ventes + KPIs achats + évolution + top5 produits + top5 clients
--    + répartition produits + alertes stock
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_year int, p_month int)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_start  date;
  v_end    date;
  v_ca     numeric := 0;
  v_enc    numeric := 0;
  v_arec   numeric := 0;
  v_nb     bigint  := 0;
  v_ach    numeric := 0;
  v_dec    numeric := 0;
  v_apay   numeric := 0;
  v_vpj          json;
  v_produits_agg json;
  v_top5p        json;
  v_top5c        json;
  v_rpart        json;
  v_alerts       json;
BEGIN
  -- ── Date range ────────────────────────────────────────────────────────────
  IF p_month = 0 THEN
    v_start := make_date(p_year, 1, 1);
    v_end   := make_date(p_year, 12, 31);
  ELSE
    v_start := make_date(p_year, p_month, 1);
    v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;
  END IF;

  -- ── KPIs ventes (1 query) ─────────────────────────────────────────────────
  SELECT
    COALESCE(SUM(total),     0),
    COALESCE(SUM(paid),      0),
    COALESCE(SUM(remaining), 0),
    COUNT(*)
  INTO v_ca, v_enc, v_arec, v_nb
  FROM sales
  WHERE user_id = auth.uid()
    AND date BETWEEN v_start AND v_end;

  -- ── KPIs achats (1 query) ─────────────────────────────────────────────────
  SELECT
    COALESCE(SUM(total),     0),
    COALESCE(SUM(paid),      0),
    COALESCE(SUM(remaining), 0)
  INTO v_ach, v_dec, v_apay
  FROM purchases
  WHERE user_id = auth.uid()
    AND date BETWEEN v_start AND v_end;

  -- ── Évolution des ventes ──────────────────────────────────────────────────
  IF p_month = 0 THEN
    -- Vue annuelle : 12 points (un par mois), toujours présents même sans ventes
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
      WHERE user_id = auth.uid() AND date BETWEEN v_start AND v_end
      GROUP BY mois
    ) agg ON agg.mois = m;
  ELSE
    -- Vue mensuelle : un point par jour du mois
    SELECT json_agg(
      json_build_object('day', d::text, 'total', COALESCE(agg.total, 0))
      ORDER BY d
    )
    INTO v_vpj
    FROM generate_series(1, EXTRACT(DAY FROM v_end)::int) AS d
    LEFT JOIN (
      SELECT EXTRACT(DAY FROM date)::int AS jour, SUM(total) AS total
      FROM sales
      WHERE user_id = auth.uid() AND date BETWEEN v_start AND v_end
      GROUP BY jour
    ) agg ON agg.jour = d;
  END IF;

  -- ── Produits : scan unique sale_items → top5 + répartition ──────────────
  -- Une seule agrégation LIMIT 8 couvre les deux widgets (top5 ⊂ top8)
  SELECT COALESCE(json_agg(json_build_object('name', name, 'total', total)), '[]'::json)
  INTO v_produits_agg
  FROM (
    SELECT p.name, SUM(si.quantity * si.unit_price) AS total
    FROM sale_items si
    JOIN sales     s ON s.id = si.sale_id
    JOIN products  p ON p.id = si.product_id
    WHERE s.user_id = auth.uid()
      AND s.date BETWEEN v_start AND v_end
    GROUP BY p.id, p.name
    ORDER BY total DESC
    LIMIT 8
  ) t;

  -- top5Produits : 5 premiers éléments, champ 'total'
  SELECT COALESCE(json_agg(elem), '[]'::json)
  INTO v_top5p
  FROM json_array_elements(v_produits_agg) WITH ORDINALITY AS t(elem, ord)
  WHERE ord <= 5;

  -- repartitionProduits : 8 éléments, champ renommé 'value'
  SELECT COALESCE(json_agg(json_build_object('name', elem->>'name', 'value', (elem->>'total')::numeric)), '[]'::json)
  INTO v_rpart
  FROM json_array_elements(v_produits_agg) AS elem;

  -- ── Top 5 clients ─────────────────────────────────────────────────────────
  SELECT COALESCE(json_agg(json_build_object('name', name, 'total', total)), '[]'::json)
  INTO v_top5c
  FROM (
    SELECT c.name, SUM(s.total) AS total
    FROM sales   s
    JOIN clients c ON c.id = s.client_id
    WHERE s.user_id = auth.uid()
      AND s.date BETWEEN v_start AND v_end
    GROUP BY c.id, c.name
    ORDER BY total DESC
    LIMIT 5
  ) t;

  -- ── Alertes stock (filtrées en DB) ────────────────────────────────────────
  SELECT COALESCE(json_agg(
    json_build_object(
      'id',          p.id,
      'name',        p.name,
      'quantity',    COALESCE(st.quantity, 0),
      'stock_alert', COALESCE(p.stock_alert, 0),
      'status',      CASE WHEN COALESCE(st.quantity, 0) = 0 THEN 'rupture' ELSE 'faible' END
    )
    ORDER BY COALESCE(st.quantity, 0)
  ), '[]'::json)
  INTO v_alerts
  FROM products p
  LEFT JOIN stock st ON st.product_id = p.id AND st.user_id = p.user_id
  WHERE p.user_id = auth.uid()
    AND (COALESCE(st.quantity, 0) = 0 OR COALESCE(st.quantity, 0) <= p.stock_alert);

  -- ── Résultat final ────────────────────────────────────────────────────────
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
    'top5Produits',        v_top5p,
    'top5Clients',         v_top5c,
    'repartitionProduits', v_rpart,
    'stockAlerts',         v_alerts
  );
END;
$$;
