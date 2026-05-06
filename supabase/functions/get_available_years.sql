-- Dernière version déployée : 20260501_01_dashboard_optimization.sql

CREATE OR REPLACE FUNCTION get_available_years(p_table text)
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
      WHERE user_id = auth.uid()
      ORDER BY 1 DESC
    );
  ELSIF p_table = 'purchases' THEN
    RETURN ARRAY(
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int
      FROM purchases
      WHERE user_id = auth.uid()
      ORDER BY 1 DESC
    );
  END IF;
  RETURN '{}';
END;
$$;
