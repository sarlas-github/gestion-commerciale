-- Dernière version déployée : 17-05-2026_05_multi_tenant_functions.sql

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
