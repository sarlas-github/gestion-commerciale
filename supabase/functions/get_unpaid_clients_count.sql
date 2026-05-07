-- Dernière version déployée : 20260506_01_unpaid_counts.sql

CREATE OR REPLACE FUNCTION get_unpaid_clients_count()
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
    WHERE user_id = auth.uid()
    GROUP BY client_id
  ) agg ON agg.client_id = c.id
  WHERE c.user_id = auth.uid()
    AND COALESCE(agg.total_du, 0) > 0
    AND COALESCE(agg.has_unpaid, false) = true;
$$;
