-- Migration : 18-05-2026_03_product_stock_functions.sql
-- Rend atomiques : création produit (products + stock) et ajustement stock (stock + stock_movements)

-- ─────────────────────────────────────────────────────────────────────────────
-- create_product
-- INSERT products + INSERT stock en une transaction
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- adjust_stock
-- UPDATE stock + INSERT stock_movements en une transaction
-- Lit la quantité actuelle depuis la DB (source de vérité, évite les races)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_stock_id    uuid,
  p_product_id  uuid,
  p_type        text,           -- 'in' | 'out'
  p_quantity    int,            -- delta positif
  p_note        text DEFAULT NULL,
  p_date        date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid    := auth.uid();
  v_company_id  uuid    := get_my_company_id();
  v_current_qty numeric;
  v_signed_delta int;
  v_new_qty     numeric;
BEGIN
  SELECT quantity INTO v_current_qty
  FROM stock WHERE id = p_stock_id AND company_id = v_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock introuvable ou accès refusé'; END IF;

  v_signed_delta := CASE WHEN p_type = 'in' THEN p_quantity ELSE -p_quantity END;
  v_new_qty      := v_current_qty + v_signed_delta;

  UPDATE stock SET quantity = v_new_qty, updated_at = now()
  WHERE id = p_stock_id;

  INSERT INTO stock_movements (user_id, company_id, product_id, type, quantity,
                               reference_type, note, date, stock_avant, stock_apres)
  VALUES (v_uid, v_company_id, p_product_id, p_type, v_signed_delta,
          'manual', NULLIF(p_note, ''), p_date, v_current_qty, v_new_qty);
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, uuid, text, int, text, date)
  TO authenticated;
