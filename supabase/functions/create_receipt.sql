-- Dernière version déployée : 20260507_03_create_receipt_function.sql

CREATE OR REPLACE FUNCTION create_receipt(
  p_payment_id    uuid,
  p_sale_id       uuid,
  p_client_id     uuid,
  p_date          date,
  p_total         numeric,
  p_paid          numeric,
  p_tva_rate      numeric,
  p_tva_amount    numeric,
  p_mode_paiement text,
  p_items         jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid    := auth.uid();
  v_year      int     := EXTRACT(YEAR FROM p_date)::int;
  v_seq       int;
  v_number    text;
  v_doc_id    uuid;
  v_company   record;
  v_item      jsonb;
BEGIN
  INSERT INTO document_sequences (user_id, type, year, last_number)
  VALUES (v_user_id, 'receipt', v_year, 1)
  ON CONFLICT (user_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;

  v_number := 'REC-' || v_year || '-' || LPAD(v_seq::text, 3, '0');

  SELECT * INTO v_company FROM companies WHERE user_id = v_user_id LIMIT 1;

  INSERT INTO documents (
    user_id, client_id, sale_id, payment_id,
    type, number, date, status, payment_status,
    total, tva_rate, tva_amount, paid, note,
    company_name, company_address, company_phone, company_email,
    company_ice, company_if, company_rc, company_tp, company_rib,
    company_site_web, company_couleur_marque, company_logo_url,
    mode_paiement
  ) VALUES (
    v_user_id, p_client_id, p_sale_id, p_payment_id,
    'receipt', v_number, p_date, 'confirmed', 'paid',
    p_total, p_tva_rate, p_tva_amount, p_paid, NULL,
    v_company.name, v_company.address, v_company.phone, v_company.email,
    v_company.ice, v_company.if_number, v_company.rc, v_company.tp_number, v_company.rib,
    v_company.site_web, v_company.couleur_marque, v_company.logo_url,
    p_mode_paiement
  )
  RETURNING id INTO v_doc_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO document_items (document_id, product_id, product_name, quantity, pieces_count, unit_price)
    VALUES (
      v_doc_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::int,
      1,
      (v_item->>'unit_price')::numeric
    );
  END LOOP;

  RETURN v_doc_id;
END;
$$;
