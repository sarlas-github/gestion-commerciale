-- Dernière version déployée : 20260509_04_exclude_cancelled_from_stats.sql

CREATE OR REPLACE FUNCTION get_supplier_report(p_year int, p_month int)
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
    WHERE p.user_id = auth.uid()
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
