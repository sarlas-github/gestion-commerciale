-- Fonction atomique create_invoice
-- Même principe que create_receipt : séquence + document + items dans une seule transaction.
-- Si l'INSERT documents ou document_items échoue → rollback complet,
-- y compris le UPDATE document_sequences (aucun trou dans la numérotation FAC-).
--
-- p_items : JSONB array d'objets { product_id, product_name, quantity, pieces_count, unit_price }

CREATE OR REPLACE FUNCTION create_invoice(
  p_sale_id       uuid,
  p_client_id     uuid,
  p_date          date,
  p_note          text,
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
  v_user_id        uuid    := auth.uid();
  v_year           int     := EXTRACT(YEAR FROM p_date)::int;
  v_seq            int;
  v_number         text;
  v_doc_id         uuid;
  v_company        record;
  v_client         record;
  v_payment_status text;
  v_item           jsonb;
BEGIN
  -- 1. Incrément séquentiel atomique (inline — même transaction que les inserts)
  INSERT INTO document_sequences (user_id, type, year, last_number)
  VALUES (v_user_id, 'invoice', v_year, 1)
  ON CONFLICT (user_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;

  v_number := 'FAC-' || v_year || '-' || LPAD(v_seq::text, 3, '0');

  -- 2. Statut de paiement
  v_payment_status := CASE
    WHEN p_paid >= p_total THEN 'paid'
    WHEN p_paid > 0        THEN 'partial'
    ELSE                        'unpaid'
  END;

  -- 3. Snapshots entreprise + client
  SELECT * INTO v_company FROM companies WHERE user_id = v_user_id LIMIT 1;
  SELECT name, address, ice, phone INTO v_client FROM clients WHERE id = p_client_id;

  -- 4. Insertion document
  INSERT INTO documents (
    user_id, client_id, sale_id,
    type, number, date, status, payment_status,
    total, tva_rate, tva_amount, paid, note,
    client_name, client_address, client_ice, client_phone,
    company_name, company_address, company_phone, company_email,
    company_ice, company_if, company_rc, company_tp, company_rib,
    company_site_web, company_couleur_marque, company_logo_url,
    mode_paiement
  ) VALUES (
    v_user_id, p_client_id, p_sale_id,
    'invoice', v_number, p_date, 'confirmed', v_payment_status,
    p_total, p_tva_rate, p_tva_amount, p_paid, p_note,
    v_client.name, v_client.address, v_client.ice, v_client.phone,
    v_company.name, v_company.address, v_company.phone, v_company.email,
    v_company.ice, v_company.if_number, v_company.rc, v_company.tp_number, v_company.rib,
    v_company.site_web, v_company.couleur_marque, v_company.logo_url,
    p_mode_paiement
  )
  RETURNING id INTO v_doc_id;

  -- 5. Insertion lignes (quantity = qty * pieces_count, comme le comportement actuel)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO document_items (document_id, product_id, product_name, quantity, pieces_count, unit_price)
    VALUES (
      v_doc_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::int * (v_item->>'pieces_count')::int,
      1,
      (v_item->>'unit_price')::numeric
    );
  END LOOP;

  RETURN v_doc_id;
END;
$$;
