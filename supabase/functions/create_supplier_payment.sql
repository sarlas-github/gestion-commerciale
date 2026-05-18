-- Dernière version déployée : 20260518000005_fix_methode_paiement_cast.sql

CREATE OR REPLACE FUNCTION public.create_supplier_payment(
  p_purchase_id      uuid,
  p_date             date,
  p_amount           numeric,
  p_note             text    DEFAULT NULL,
  p_methode_paiement text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           uuid    := auth.uid();
  v_company_id    uuid    := get_my_company_id();
  v_purchase_total numeric;
  v_paid          numeric;
  v_status        text;
  v_payment_id    uuid;
BEGIN
  SELECT total INTO v_purchase_total
  FROM purchases WHERE id = p_purchase_id AND company_id = v_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Achat introuvable ou accès refusé'; END IF;

  INSERT INTO supplier_payments (user_id, company_id, purchase_id, amount, date, note, methode_paiement)
  VALUES (v_uid, v_company_id, p_purchase_id, p_amount, p_date,
          NULLIF(p_note, ''), NULLIF(p_methode_paiement, '')::methode_paiement_type)
  RETURNING id INTO v_payment_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM supplier_payments WHERE purchase_id = p_purchase_id;

  v_status := CASE
    WHEN v_purchase_total <= 0      THEN 'unpaid'
    WHEN v_paid >= v_purchase_total THEN 'paid'
    WHEN v_paid > 0                 THEN 'partial'
    ELSE 'unpaid'
  END;

  UPDATE purchases SET paid = v_paid, status = v_status, updated_at = now()
  WHERE id = p_purchase_id;

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_supplier_payment(uuid, date, numeric, text, text)
  TO authenticated;
