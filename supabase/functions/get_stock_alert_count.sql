-- Dernière version déployée : 20260501_02_app_optimization.sql

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
