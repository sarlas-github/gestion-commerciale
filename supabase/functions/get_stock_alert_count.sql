-- Dernière version déployée : 17-05-2026_05_multi_tenant_functions.sql

CREATE OR REPLACE FUNCTION public.get_stock_alert_count()
RETURNS int
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM products p
  LEFT JOIN stock st ON st.product_id = p.id AND st.company_id = p.company_id
  WHERE p.company_id = get_my_company_id()
    AND (COALESCE(st.quantity, 0) = 0 OR COALESCE(st.quantity, 0) <= p.stock_alert);
$$;
