-- Ajout de achatsParJour dans get_dashboard_stats
-- pour afficher la courbe achats vs ventes sur le même graphe

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_year int, p_month int)
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
  -- ── Date range ────────────────────────────────────────────────────────────
  IF p_month = 0 THEN
    v_start := make_date(p_year, 1, 1);
    v_end   := make_date(p_year, 12, 31);
  ELSE
    v_start := make_date(p_year, p_month, 1);
    v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;
  END IF;

  -- ── KPIs ventes (hors annulées) ─────────────────────────────────────────────
  SELECT
    COALESCE(SUM(total),     0),
    COALESCE(SUM(paid),      0),
    COALESCE(SUM(remaining), 0),
    COUNT(*)
  INTO v_ca, v_enc, v_arec, v_nb
  FROM sales
  WHERE user_id = auth.uid()
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  -- ── KPIs achats (hors annulés) ─────────────────────────────────────────────
  SELECT
    COALESCE(SUM(total),     0),
    COALESCE(SUM(paid),      0),
    COALESCE(SUM(remaining), 0)
  INTO v_ach, v_dec, v_apay
  FROM purchases
  WHERE user_id = auth.uid()
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  -- ── Évolution des ventes ──────────────────────────────────────────────────
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
      WHERE user_id = auth.uid() AND date BETWEEN v_start AND v_end
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
      WHERE user_id = auth.uid() AND date BETWEEN v_start AND v_end
        AND status != v_cancelled
      GROUP BY jour
    ) agg ON agg.jour = d;
  END IF;

  -- ── Évolution des achats ──────────────────────────────────────────────────
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
      WHERE user_id = auth.uid() AND date BETWEEN v_start AND v_end
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
      WHERE user_id = auth.uid() AND date BETWEEN v_start AND v_end
        AND status != v_cancelled
      GROUP BY jour
    ) agg ON agg.jour = d;
  END IF;

  -- ── Produits : scan unique sale_items → top5 + répartition ──────────────
  SELECT COALESCE(json_agg(json_build_object('name', name, 'total', total)), '[]'::json)
  INTO v_produits_agg
  FROM (
    SELECT p.name, SUM(si.quantity * si.unit_price) AS total
    FROM sale_items si
    JOIN sales     s ON s.id = si.sale_id
    JOIN products  p ON p.id = si.product_id
    WHERE s.user_id = auth.uid()
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

  -- ── Top 5 clients ─────────────────────────────────────────────────────────
  SELECT COALESCE(json_agg(json_build_object('name', name, 'total', total)), '[]'::json)
  INTO v_top5c
  FROM (
    SELECT c.name, SUM(s.total) AS total
    FROM sales   s
    JOIN clients c ON c.id = s.client_id
    WHERE s.user_id = auth.uid()
      AND s.date BETWEEN v_start AND v_end
      AND s.status != v_cancelled
    GROUP BY c.id, c.name
    ORDER BY total DESC
    LIMIT 5
  ) t;

  -- ── Alertes stock ─────────────────────────────────────────────────────────
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
  LEFT JOIN stock st ON st.product_id = p.id AND st.user_id = p.user_id
  WHERE p.user_id = auth.uid()
    AND (COALESCE(st.quantity, 0) <= 0 OR COALESCE(st.quantity, 0) <= p.stock_alert);

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
    'achatsParJour',       COALESCE(v_apj, '[]'::json),
    'top5Produits',        v_top5p,
    'top5Clients',         v_top5c,
    'repartitionProduits', v_rpart,
    'stockAlerts',         v_alerts
  );
END;
$$;
