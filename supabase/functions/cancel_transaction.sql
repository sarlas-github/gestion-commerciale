-- Dernière version déployée : 17-05-2026_05_multi_tenant_functions.sql

CREATE OR REPLACE FUNCTION public.cancel_transaction(
  p_id   uuid,
  p_type text  -- 'purchase' | 'sale'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancelled  CONSTANT text := 'cancelled';
  v_uid        uuid;
  v_company_id uuid;
  v_reference  text;
  v_date       date;
  v_paid       numeric;
  v_item       record;
  v_status     text;
  v_stock_avant integer;
BEGIN
  v_uid        := auth.uid();
  v_company_id := get_my_company_id();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Aucune entreprise associée';
  END IF;
  IF p_type NOT IN ('purchase', 'sale') THEN
    RAISE EXCEPTION 'Type invalide : %', p_type;
  END IF;

  IF p_type = 'purchase' THEN
    SELECT status, reference, date, paid
      INTO v_status, v_reference, v_date, v_paid
      FROM purchases
     WHERE id = p_id AND company_id = v_company_id
       FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Achat introuvable'; END IF;
  ELSE
    SELECT status, reference, date, paid
      INTO v_status, v_reference, v_date, v_paid
      FROM sales
     WHERE id = p_id AND company_id = v_company_id
       FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Vente introuvable'; END IF;
  END IF;

  IF v_status = v_cancelled THEN
    RAISE EXCEPTION 'Cette transaction est déjà annulée';
  END IF;

  IF v_paid > 0 THEN
    RAISE EXCEPTION 'Annulation impossible : un paiement a déjà été enregistré pour cette transaction.';
  END IF;

  IF p_type = 'sale' THEN
    IF EXISTS (
      SELECT 1 FROM documents
       WHERE sale_id = p_id AND company_id = v_company_id AND type = 'invoice'
    ) THEN
      RAISE EXCEPTION 'Annulation impossible : une facture a déjà été générée pour cette vente.';
    END IF;
  END IF;

  IF p_type = 'purchase' THEN
    UPDATE purchases
       SET status = v_cancelled, updated_at = now()
     WHERE id = p_id AND company_id = v_company_id;
  ELSE
    UPDATE sales
       SET status = v_cancelled, updated_at = now()
     WHERE id = p_id AND company_id = v_company_id;
  END IF;

  IF p_type = 'purchase' THEN
    FOR v_item IN
      SELECT pi.product_id, pi.quantity
        FROM purchase_items pi WHERE pi.purchase_id = p_id
    LOOP
      SELECT COALESCE(quantity, 0) INTO v_stock_avant
        FROM stock WHERE product_id = v_item.product_id AND company_id = v_company_id;

      UPDATE stock
         SET quantity = quantity - v_item.quantity, updated_at = now()
       WHERE product_id = v_item.product_id AND company_id = v_company_id;

      INSERT INTO stock_movements (
        user_id, company_id, product_id, type, quantity,
        reference_type, reference_id, note, date, stock_avant, stock_apres
      ) VALUES (
        v_uid, v_company_id, v_item.product_id, 'out', -v_item.quantity,
        'purchase', p_id,
        'Annulation ' || COALESCE(v_reference, 'achat'),
        COALESCE(v_date, CURRENT_DATE),
        v_stock_avant, v_stock_avant - v_item.quantity
      );
    END LOOP;

  ELSE
    FOR v_item IN
      SELECT si.product_id, si.quantity
        FROM sale_items si WHERE si.sale_id = p_id
    LOOP
      SELECT COALESCE(quantity, 0) INTO v_stock_avant
        FROM stock WHERE product_id = v_item.product_id AND company_id = v_company_id;

      INSERT INTO stock (user_id, company_id, product_id, quantity)
        VALUES (v_uid, v_company_id, v_item.product_id, v_item.quantity)
      ON CONFLICT (company_id, product_id)
      DO UPDATE SET quantity = stock.quantity + v_item.quantity, updated_at = now();

      INSERT INTO stock_movements (
        user_id, company_id, product_id, type, quantity,
        reference_type, reference_id, note, date, stock_avant, stock_apres
      ) VALUES (
        v_uid, v_company_id, v_item.product_id, 'in', v_item.quantity,
        'sale', p_id,
        'Annulation ' || COALESCE(v_reference, 'vente'),
        COALESCE(v_date, CURRENT_DATE),
        v_stock_avant, v_stock_avant + v_item.quantity
      );
    END LOOP;
  END IF;
END;
$$;
