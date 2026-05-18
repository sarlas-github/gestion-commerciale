-- Dernière version déployée : 17-05-2026_05_multi_tenant_functions.sql

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
