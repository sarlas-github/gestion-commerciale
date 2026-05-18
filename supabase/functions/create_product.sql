-- Dernière version déployée : 18-05-2026_03_product_stock_functions.sql

CREATE OR REPLACE FUNCTION public.create_product(
  p_name         text,
  p_type         text,
  p_nature       text,
  p_pieces_count int     DEFAULT 1,
  p_stock_alert  int     DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_company_id uuid := get_my_company_id();
  v_product_id uuid;
BEGIN
  INSERT INTO products (user_id, company_id, name, type, nature, pieces_count, stock_alert)
  VALUES (v_uid, v_company_id, p_name, p_type, p_nature, p_pieces_count, p_stock_alert)
  RETURNING id INTO v_product_id;

  INSERT INTO stock (user_id, company_id, product_id, quantity)
  VALUES (v_uid, v_company_id, v_product_id, 0);

  RETURN v_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_product(text, text, text, int, int)
  TO authenticated;
