-- Dernière version déployée : 20260518000005_fix_methode_paiement_cast.sql

CREATE OR REPLACE FUNCTION public.create_purchase(
  p_supplier_id uuid,
  p_date        date,
  p_note        text    DEFAULT NULL,
  p_tva_rate    numeric DEFAULT 0,
  p_items       jsonb   DEFAULT '[]',
  p_payments    jsonb   DEFAULT '[]'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid    := auth.uid();
  v_company_id  uuid    := get_my_company_id();
  v_year        int     := EXTRACT(YEAR FROM p_date)::int;
  v_seq         int;
  v_reference   text;
  v_total_ht    numeric := 0;
  v_tva_amount  numeric;
  v_total       numeric;
  v_paid        numeric := 0;
  v_status      text;
  v_purchase_id uuid;
  v_item        jsonb;
  v_pay         jsonb;
  v_product_id  uuid;
  v_qty         int;
  v_pieces      int;
  v_price       numeric;
  v_stock_id    uuid;
  v_stock_qty   numeric;
BEGIN
  INSERT INTO document_sequences (user_id, company_id, type, year, last_number)
  VALUES (v_uid, v_company_id, 'purchase', v_year, 1)
  ON CONFLICT (company_id, type, year)
  DO UPDATE SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;
  v_reference := 'ACH-' || v_year || '-' || LPAD(v_seq::text, 3, '0');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty    := (v_item->>'quantity')::int;
    v_pieces := COALESCE((v_item->>'pieces_count')::int, 1);
    v_price  := (v_item->>'unit_price')::numeric;
    v_total_ht := v_total_ht + v_qty * v_pieces * v_price;
  END LOOP;
  v_tva_amount := v_total_ht * p_tva_rate / 100;
  v_total      := v_total_ht + v_tva_amount;
  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    v_paid := v_paid + (v_pay->>'amount')::numeric;
  END LOOP;
  v_status := CASE
    WHEN v_total <= 0      THEN 'unpaid'
    WHEN v_paid >= v_total THEN 'paid'
    WHEN v_paid > 0        THEN 'partial'
    ELSE 'unpaid'
  END;

  INSERT INTO purchases (user_id, company_id, supplier_id, date, reference, note,
                         total, tva_rate, tva_amount, paid, status)
  VALUES (v_uid, v_company_id, p_supplier_id, p_date, v_reference, p_note,
          v_total, p_tva_rate, v_tva_amount, v_paid, v_status)
  RETURNING id INTO v_purchase_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    v_pieces     := COALESCE((v_item->>'pieces_count')::int, 1);
    v_price      := (v_item->>'unit_price')::numeric;

    INSERT INTO purchase_items (purchase_id, product_id, quantity, pieces_count, unit_price)
    VALUES (v_purchase_id, v_product_id, v_qty, v_pieces, v_price);

    SELECT id, quantity INTO v_stock_id, v_stock_qty
    FROM stock WHERE product_id = v_product_id AND company_id = v_company_id;

    IF FOUND THEN
      UPDATE stock SET quantity = quantity + v_qty, updated_at = now()
      WHERE id = v_stock_id;
    ELSE
      INSERT INTO stock (user_id, company_id, product_id, quantity)
      VALUES (v_uid, v_company_id, v_product_id, v_qty)
      RETURNING id INTO v_stock_id;
      v_stock_qty := 0;
    END IF;

    INSERT INTO stock_movements (user_id, company_id, product_id, type, quantity,
                                 reference_type, reference_id, note, date,
                                 stock_avant, stock_apres)
    VALUES (v_uid, v_company_id, v_product_id, 'in', v_qty,
            'purchase', v_purchase_id, 'Nouvel achat', p_date,
            v_stock_qty, v_stock_qty + v_qty);
  END LOOP;

  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    INSERT INTO supplier_payments (user_id, company_id, purchase_id, amount, date,
                                   note, methode_paiement)
    VALUES (v_uid, v_company_id, v_purchase_id,
            (v_pay->>'amount')::numeric,
            (v_pay->>'date')::date,
            NULLIF(v_pay->>'note', ''),
            NULLIF(v_pay->>'methode_paiement', '')::methode_paiement_type);
  END LOOP;

  RETURN v_purchase_id;
END;
$$;
