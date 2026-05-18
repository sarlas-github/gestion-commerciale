-- Dernière version déployée : 17-05-2026_05_multi_tenant_functions.sql

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
