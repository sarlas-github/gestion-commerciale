-- Dernière version déployée : 20260518000005_fix_methode_paiement_cast.sql

CREATE OR REPLACE FUNCTION public.create_client_payment(
  p_sale_id         uuid,
  p_date            date,
  p_amount          numeric,
  p_note            text    DEFAULT NULL,
  p_methode_paiement text   DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid    := auth.uid();
  v_company_id  uuid    := get_my_company_id();
  v_sale_total  numeric;
  v_paid        numeric;
  v_status      text;
  v_payment_id  uuid;
BEGIN
  SELECT total INTO v_sale_total
  FROM sales WHERE id = p_sale_id AND company_id = v_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vente introuvable ou accès refusé'; END IF;

  INSERT INTO client_payments (user_id, company_id, sale_id, amount, date, note, methode_paiement)
  VALUES (v_uid, v_company_id, p_sale_id, p_amount, p_date,
          NULLIF(p_note, ''), NULLIF(p_methode_paiement, '')::methode_paiement_type)
  RETURNING id INTO v_payment_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM client_payments WHERE sale_id = p_sale_id;

  v_status := CASE
    WHEN v_sale_total <= 0      THEN 'unpaid'
    WHEN v_paid >= v_sale_total THEN 'paid'
    WHEN v_paid > 0             THEN 'partial'
    ELSE 'unpaid'
  END;

  UPDATE sales SET paid = v_paid, status = v_status, updated_at = now()
  WHERE id = p_sale_id;

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_payment(uuid, date, numeric, text, text)
  TO authenticated;
