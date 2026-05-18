-- Dernière version déployée : 20260518000007_adjust_stock_nullable_stock_id.sql

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_stock_id    uuid,   -- NULL si le produit n'a encore aucune ligne dans stock
  p_product_id  uuid,
  p_type        text,
  p_quantity    int,
  p_note        text DEFAULT NULL,
  p_date        date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid    := auth.uid();
  v_company_id   uuid    := get_my_company_id();
  v_current_qty  numeric;
  v_signed_delta int;
  v_new_qty      numeric;
  v_stock_id     uuid    := p_stock_id;
BEGIN
  IF v_stock_id IS NOT NULL THEN
    SELECT quantity INTO v_current_qty
    FROM stock WHERE id = v_stock_id AND company_id = v_company_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stock introuvable ou accès refusé'; END IF;
  ELSE
    -- Aucune ligne stock : on la crée à 0 avant d'appliquer le delta
    v_current_qty := 0;
    INSERT INTO stock (user_id, company_id, product_id, quantity)
    VALUES (v_uid, v_company_id, p_product_id, 0)
    RETURNING id INTO v_stock_id;
  END IF;

  v_signed_delta := CASE WHEN p_type = 'in' THEN p_quantity ELSE -p_quantity END;
  v_new_qty      := v_current_qty + v_signed_delta;

  UPDATE stock SET quantity = v_new_qty, updated_at = now()
  WHERE id = v_stock_id;

  INSERT INTO stock_movements (user_id, company_id, product_id, type, quantity,
                               reference_type, note, date, stock_avant, stock_apres)
  VALUES (v_uid, v_company_id, p_product_id, p_type, v_signed_delta,
          'manual', NULLIF(p_note, ''), p_date, v_current_qty, v_new_qty);
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, uuid, text, int, text, date)
  TO authenticated;
