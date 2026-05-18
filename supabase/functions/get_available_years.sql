-- Dernière version déployée : 17-05-2026_05_multi_tenant_functions.sql

CREATE OR REPLACE FUNCTION public.get_available_years(p_table text)
RETURNS int[]
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_table = 'sales' THEN
    RETURN ARRAY(
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int
      FROM sales
      WHERE company_id = get_my_company_id()
      ORDER BY 1 DESC
    );
  ELSIF p_table = 'purchases' THEN
    RETURN ARRAY(
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int
      FROM purchases
      WHERE company_id = get_my_company_id()
      ORDER BY 1 DESC
    );
  END IF;
  RETURN '{}';
END;
$$;
