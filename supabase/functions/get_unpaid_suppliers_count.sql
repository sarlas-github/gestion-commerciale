-- Dernière version déployée : 20260506_01_unpaid_counts.sql

CREATE OR REPLACE FUNCTION get_unpaid_suppliers_count()
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
    WHERE user_id = auth.uid()
    GROUP BY supplier_id
  ) agg ON agg.supplier_id = s.id
  WHERE s.user_id = auth.uid()
    AND COALESCE(agg.total_du, 0) > 0
    AND COALESCE(agg.has_unpaid, false) = true;
$$;
