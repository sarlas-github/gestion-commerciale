-- Dernière version déployée : 17-05-2026_05_multi_tenant_functions.sql

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
