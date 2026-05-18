


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."methode_paiement_type" AS ENUM (
    'Espèces',
    'Virement bancaire',
    'Chèque',
    'Effet',
    'Traite',
    'Carte bancaire'
);


ALTER TYPE "public"."methode_paiement_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_stock"("p_stock_id" "uuid", "p_product_id" "uuid", "p_type" "text", "p_quantity" integer, "p_note" "text" DEFAULT NULL::"text", "p_date" "date" DEFAULT CURRENT_DATE) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."adjust_stock"("p_stock_id" "uuid", "p_product_id" "uuid", "p_type" "text", "p_quantity" integer, "p_note" "text", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_transaction"("p_id" "uuid", "p_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."cancel_transaction"("p_id" "uuid", "p_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_app_user"("p_email" "text", "p_password" "text", "p_mode" "text" DEFAULT 'revente'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Insertion dans auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- 2. Insertion dans auth.identities
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id::text, p_email)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- 3. Mise à jour du profil avec le mode spécifié 
  -- (Note: le trigger handle_new_user l'aura déjà créé en 'revente', on fait un UPDATE)
  UPDATE public.profiles 
  SET business_mode = p_mode 
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."create_app_user"("p_email" "text", "p_password" "text", "p_mode" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_app_user"("p_email" "text", "p_password" "text", "p_company_name" "text", "p_mode" "text" DEFAULT 'revente'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id    uuid;
  v_company_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  )
  RETURNING id INTO v_user_id;

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), v_user_id::text, v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id::text, p_email)::jsonb,
    'email', now(), now(), now()
  );

  UPDATE public.profiles SET business_mode = p_mode WHERE id = v_user_id;

  INSERT INTO public.companies (user_id, name, couleur_marque)
  VALUES (v_user_id, p_company_name, '#4f46e5')
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'admin');

  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."create_app_user"("p_email" "text", "p_password" "text", "p_company_name" "text", "p_mode" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_client_payment"("p_sale_id" "uuid", "p_date" "date", "p_amount" numeric, "p_note" "text" DEFAULT NULL::"text", "p_methode_paiement" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_client_payment"("p_sale_id" "uuid", "p_date" "date", "p_amount" numeric, "p_note" "text", "p_methode_paiement" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invoice"("p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id        uuid    := auth.uid();
  v_company_id     uuid    := get_my_company_id();
  v_year           int     := EXTRACT(YEAR FROM p_date)::int;
  v_seq            int;
  v_number         text;
  v_doc_id         uuid;
  v_company        record;
  v_client         record;
  v_payment_status text;
  v_item           jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Aucune entreprise associée'; END IF;

  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND company_id = v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id AND company_id = v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO document_sequences (user_id, company_id, type, year, last_number)
  VALUES (v_user_id, v_company_id, 'invoice', v_year, 1)
  ON CONFLICT (company_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;

  v_number := 'FAC-' || v_year || '-' || LPAD(v_seq::text, 3, '0');

  v_payment_status := CASE
    WHEN p_paid >= p_total THEN 'paid'
    WHEN p_paid > 0        THEN 'partial'
    ELSE                        'unpaid'
  END;

  SELECT * INTO v_company FROM companies WHERE id = v_company_id;
  SELECT name, address, ice, phone INTO v_client FROM clients WHERE id = p_client_id;

  INSERT INTO documents (
    user_id, company_id, client_id, sale_id,
    type, number, date, status, payment_status,
    total, tva_rate, tva_amount, paid, note,
    client_name, client_address, client_ice, client_phone,
    company_name, company_address, company_phone, company_email,
    company_ice, company_if, company_rc, company_tp, company_rib,
    company_site_web, company_couleur_marque, company_logo_url,
    mode_paiement
  ) VALUES (
    v_user_id, v_company_id, p_client_id, p_sale_id,
    'invoice', v_number, p_date, 'confirmed', v_payment_status,
    p_total, p_tva_rate, p_tva_amount, p_paid, p_note,
    v_client.name, v_client.address, v_client.ice, v_client.phone,
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
      (v_item->>'quantity')::int * (v_item->>'pieces_count')::int,
      1,
      (v_item->>'unit_price')::numeric
    );
  END LOOP;

  RETURN v_doc_id;
END;
$$;


ALTER FUNCTION "public"."create_invoice"("p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_product"("p_name" "text", "p_type" "text", "p_nature" "text", "p_pieces_count" integer DEFAULT 1, "p_stock_alert" integer DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_product"("p_name" "text", "p_type" "text", "p_nature" "text", "p_pieces_count" integer, "p_stock_alert" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_purchase"("p_supplier_id" "uuid", "p_date" "date", "p_note" "text" DEFAULT NULL::"text", "p_tva_rate" numeric DEFAULT 0, "p_items" "jsonb" DEFAULT '[]'::"jsonb", "p_payments" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_purchase"("p_supplier_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_receipt"("p_payment_id" "uuid", "p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id    uuid    := auth.uid();
  v_company_id uuid    := get_my_company_id();
  v_year       int     := EXTRACT(YEAR FROM p_date)::int;
  v_seq        int;
  v_number     text;
  v_doc_id     uuid;
  v_company    record;
  v_item       jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Aucune entreprise associée'; END IF;

  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND company_id = v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM client_payments WHERE id = p_payment_id AND company_id = v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO document_sequences (user_id, company_id, type, year, last_number)
  VALUES (v_user_id, v_company_id, 'receipt', v_year, 1)
  ON CONFLICT (company_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;

  v_number := 'REC-' || v_year || '-' || LPAD(v_seq::text, 3, '0');

  SELECT * INTO v_company FROM companies WHERE id = v_company_id;

  INSERT INTO documents (
    user_id, company_id, client_id, sale_id, payment_id,
    type, number, date, status, payment_status,
    total, tva_rate, tva_amount, paid, note,
    company_name, company_address, company_phone, company_email,
    company_ice, company_if, company_rc, company_tp, company_rib,
    company_site_web, company_couleur_marque, company_logo_url,
    mode_paiement
  ) VALUES (
    v_user_id, v_company_id, p_client_id, p_sale_id, p_payment_id,
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


ALTER FUNCTION "public"."create_receipt"("p_payment_id" "uuid", "p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sale"("p_client_id" "uuid", "p_date" "date", "p_note" "text" DEFAULT NULL::"text", "p_tva_rate" numeric DEFAULT 0, "p_items" "jsonb" DEFAULT '[]'::"jsonb", "p_payments" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid        uuid    := auth.uid();
  v_company_id uuid    := get_my_company_id();
  v_year       int     := EXTRACT(YEAR FROM p_date)::int;
  v_seq        int;
  v_reference  text;
  v_total_ht   numeric := 0;
  v_tva_amount numeric;
  v_total      numeric;
  v_paid       numeric := 0;
  v_status     text;
  v_sale_id    uuid;
  v_item       jsonb;
  v_pay        jsonb;
  v_product_id uuid;
  v_qty        int;
  v_pieces     int;
  v_price      numeric;
  v_stock_id   uuid;
  v_stock_qty  numeric;
BEGIN
  INSERT INTO document_sequences (user_id, company_id, type, year, last_number)
  VALUES (v_uid, v_company_id, 'sale', v_year, 1)
  ON CONFLICT (company_id, type, year)
  DO UPDATE SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;
  v_reference := 'VEN-' || v_year || '-' || LPAD(v_seq::text, 3, '0');

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

  INSERT INTO sales (user_id, company_id, client_id, date, reference, note,
                     total, tva_rate, tva_amount, paid, status)
  VALUES (v_uid, v_company_id, p_client_id, p_date, v_reference, p_note,
          v_total, p_tva_rate, v_tva_amount, v_paid, v_status)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    v_pieces     := COALESCE((v_item->>'pieces_count')::int, 1);
    v_price      := (v_item->>'unit_price')::numeric;

    INSERT INTO sale_items (sale_id, product_id, quantity, pieces_count, unit_price)
    VALUES (v_sale_id, v_product_id, v_qty, v_pieces, v_price);

    SELECT id, quantity INTO v_stock_id, v_stock_qty
    FROM stock WHERE product_id = v_product_id AND company_id = v_company_id;

    IF FOUND THEN
      UPDATE stock SET quantity = quantity - v_qty, updated_at = now()
      WHERE id = v_stock_id;
    ELSE
      INSERT INTO stock (user_id, company_id, product_id, quantity)
      VALUES (v_uid, v_company_id, v_product_id, -v_qty)
      RETURNING id INTO v_stock_id;
      v_stock_qty := 0;
    END IF;

    INSERT INTO stock_movements (user_id, company_id, product_id, type, quantity,
                                 reference_type, reference_id, note, date,
                                 stock_avant, stock_apres)
    VALUES (v_uid, v_company_id, v_product_id, 'out', -v_qty,
            'sale', v_sale_id, 'Nouvelle vente', p_date,
            v_stock_qty, v_stock_qty - v_qty);
  END LOOP;

  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    INSERT INTO client_payments (user_id, company_id, sale_id, amount, date,
                                 note, methode_paiement)
    VALUES (v_uid, v_company_id, v_sale_id,
            (v_pay->>'amount')::numeric,
            (v_pay->>'date')::date,
            NULLIF(v_pay->>'note', ''),
            NULLIF(v_pay->>'methode_paiement', '')::methode_paiement_type);
  END LOOP;

  RETURN v_sale_id;
END;
$$;


ALTER FUNCTION "public"."create_sale"("p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_supplier_payment"("p_purchase_id" "uuid", "p_date" "date", "p_amount" numeric, "p_note" "text" DEFAULT NULL::"text", "p_methode_paiement" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_supplier_payment"("p_purchase_id" "uuid", "p_date" "date", "p_amount" numeric, "p_note" "text", "p_methode_paiement" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_demo_data"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_product_names text[] := ARRAY['Ordinateur Portable Pro i7', 'Ecran Dell 27p 4K', 'Clavier Logitech MX', 'Souris MX Master 3S', 'Casque Bose QC45', 'Imprimante HP LaserJet', 'Bureau Motorisé Sit-Stand', 'Chaise Herman Miller Aura', 'Disque SSD Samsung 2To', 'Webcam Razer Kiyo Pro', 'Hub USB-C Satechi', 'Enceintes JBL Flip 6', 'Sac à Dos Targus Pro', 'Tapis de Souris SteelSeries', 'Support Bras Double Ecran', 'Multiprise Belkin Pro', 'Adaptateur Apple USB-C', 'Câble Cat7 Snagless 10m', 'Lampe BenQ ScreenBar', 'Clé SanDisk Extreme 256'];
    v_client_names text[] := ARRAY['Maroc Telecom Services', 'Attijari Solutions', 'BCP Logistique', 'OCP Group Distri', 'Managem Tech', 'Ciments du Maroc SARL', 'Label Vie Express', 'Cosumar Export', 'Marsa Maroc Souss', 'Royal Air Maroc Cargo', 'Afriquia Logistique', 'Saham Services', 'Akwa Group Partner', 'Alliances Bâtiment', 'Addoha Construction', 'HPS Global Trade', 'Wafa Assurance Buro', 'LafargeHolcim Maroc', 'Taqa Morocco Tech', 'Sonasid Distribution'];
    v_client_cities text[] := ARRAY['Casablanca', 'Rabat', 'Tanger', 'Marrakech', 'Agadir', 'Fès', 'Meknès', 'Oujda', 'Kénitra', 'Tétouan'];
    v_client_streets text[] := ARRAY['Boulevard Zerktouni', 'Avenue Mohammed V', 'Rue Taha Hussein', 'Quartier Gauthier', 'Sidi Maârouf', 'Technopark', 'Route d El Jadida', 'Avenue des FAR', 'Boulevard Anfa', 'Quartier de l Ocean'];
    v_supplier_names text[] := ARRAY['Tech Data Morocco', 'Disway Distribution', 'Ingram Micro Casa', 'M2M Group Supply', 'Microchoix Pro', 'Next Step IT', 'Omnishore Supply', 'Data Plus Maroc', 'Azur Systems', 'Global IT Morocco', 'Netcom Distrib', 'Sodexo Buro', 'Top Bureau Tanger', 'Office Depot Casa', 'Lydec Services IT', 'Inwi Business Solutions', 'Orange Business Maroc', 'Intelcia Tech', 'Sitel Group Supply', 'Majorel Tech Support'];

    v_product_ids uuid[];
    v_client_ids uuid[];
    v_supplier_ids uuid[];
    v_product_base_prices numeric[];

    v_company    record;
    v_company_id uuid;
    v_i int; v_j int; v_p_idx int;
    v_p_id uuid; v_c_id uuid; v_s_id uuid; v_t_id uuid; v_doc_id uuid;
    v_price numeric; v_qty int; v_total numeric; v_paid numeric;
    v_date date; v_addr text; v_ice text;
BEGIN
    SELECT * INTO v_company FROM public.companies WHERE user_id = p_user_id LIMIT 1;
    v_company_id := v_company.id;

    -- Nettoyage des données existantes de l'entreprise
    DELETE FROM public.document_items WHERE document_id IN (SELECT id FROM public.documents WHERE company_id = v_company_id);
    DELETE FROM public.documents WHERE company_id = v_company_id;
    DELETE FROM public.client_payments WHERE company_id = v_company_id;
    DELETE FROM public.supplier_payments WHERE company_id = v_company_id;
    DELETE FROM public.sale_items WHERE sale_id IN (SELECT id FROM public.sales WHERE company_id = v_company_id);
    DELETE FROM public.sales WHERE company_id = v_company_id;
    DELETE FROM public.purchase_items WHERE purchase_id IN (SELECT id FROM public.purchases WHERE company_id = v_company_id);
    DELETE FROM public.purchases WHERE company_id = v_company_id;
    DELETE FROM public.stock_movements WHERE company_id = v_company_id;
    DELETE FROM public.stock WHERE company_id = v_company_id;
    DELETE FROM public.products WHERE company_id = v_company_id;
    DELETE FROM public.clients WHERE company_id = v_company_id;
    DELETE FROM public.suppliers WHERE company_id = v_company_id;

    -- 1. Produits (20)
    FOR v_i IN 1..20 LOOP
        INSERT INTO public.products (user_id, company_id, name, type, pieces_count, stock_alert, updated_at)
        VALUES (p_user_id, v_company_id, v_product_names[v_i], 'individual', 1, 5, now() - (v_i || ' minutes')::interval)
        RETURNING id INTO v_p_id;
        v_product_ids := array_append(v_product_ids, v_p_id);
        v_price := floor(random() * 400 + 100);
        v_product_base_prices := array_append(v_product_base_prices, v_price);
        INSERT INTO public.stock (user_id, company_id, product_id, quantity, updated_at)
        VALUES (p_user_id, v_company_id, v_p_id, 100, now() - (v_i || ' minutes')::interval);
    END LOOP;

    -- 2. Clients & Fournisseurs
    FOR v_i IN 1..20 LOOP
        v_addr := v_client_streets[floor(random() * 10 + 1)] || ', ' || v_client_cities[floor(random() * 10 + 1)];
        v_ice := '00' || floor(random() * 90000000 + 10000000)::text || '0000';

        INSERT INTO public.clients (user_id, company_id, name, phone, address, ice, updated_at)
        VALUES (p_user_id, v_company_id, v_client_names[v_i], '06' || floor(random() * 90000000 + 10000000)::text, v_addr, v_ice, now() - (v_i || ' minutes')::interval)
        RETURNING id INTO v_c_id;
        v_client_ids := array_append(v_client_ids, v_c_id);

        INSERT INTO public.suppliers (user_id, company_id, name, phone, address, ice, updated_at)
        VALUES (p_user_id, v_company_id, v_supplier_names[v_i], '05' || floor(random() * 90000000 + 10000000)::text, 'Zone Industrielle, ' || v_client_cities[floor(random() * 5 + 1)], 'SUP-' || v_ice, now() - (v_i || ' minutes')::interval)
        RETURNING id INTO v_s_id;
        v_supplier_ids := array_append(v_supplier_ids, v_s_id);
    END LOOP;

    -- 3. Achats (3)
    FOR v_i IN 1..3 LOOP
        v_date := current_date - (v_i - 1 || ' days')::interval;
        v_s_id := v_supplier_ids[21-v_i];
        v_total := 0;
        INSERT INTO public.purchases (user_id, company_id, supplier_id, date, reference, status, total, paid)
        VALUES (p_user_id, v_company_id, v_s_id, v_date, 'ACH-' || floor(random()*9000+1000)::text, 'unpaid', 0, 0)
        RETURNING id INTO v_t_id;

        FOR v_j IN 1..(floor(random() * 2 + 1)) LOOP
            v_p_idx := floor(random() * 10 + 1);
            v_p_id := v_product_ids[v_p_idx];
            v_qty := floor(random() * 5 + 2);
            v_price := v_product_base_prices[v_p_idx];
            INSERT INTO public.purchase_items (purchase_id, product_id, quantity, unit_price) VALUES (v_t_id, v_p_id, v_qty, v_price);
            INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date)
            VALUES (p_user_id, v_company_id, v_p_id, 'in', v_qty, 'purchase', v_t_id, v_date);
            UPDATE public.stock SET quantity = quantity + v_qty WHERE product_id = v_p_id AND company_id = v_company_id;
            v_total := v_total + (v_qty * v_price);
        END LOOP;

        v_paid := CASE WHEN v_i = 1 THEN 0 ELSE v_total END;
        UPDATE public.purchases SET total = v_total, paid = v_paid, status = (CASE WHEN v_paid >= v_total THEN 'paid' ELSE 'unpaid' END) WHERE id = v_t_id;
        IF v_paid > 0 THEN
            INSERT INTO public.supplier_payments (user_id, company_id, purchase_id, amount, date, methode_paiement)
            VALUES (p_user_id, v_company_id, v_t_id, v_paid, v_date, 'Virement bancaire');
        END IF;
    END LOOP;

    -- 4. Ventes (11) avec factures
    FOR v_i IN 1..11 LOOP
        v_date := current_date - (v_i - 1 || ' days')::interval;
        v_c_id := v_client_ids[21-v_i];
        v_total := 0;

        INSERT INTO public.sales (user_id, company_id, client_id, date, reference, status, total, paid)
        VALUES (p_user_id, v_company_id, v_c_id, v_date, 'VEN-' || floor(random()*9000+1000)::text, 'unpaid', 0, 0)
        RETURNING id INTO v_t_id;

        SELECT address, ice, phone INTO v_addr, v_ice, v_price FROM public.clients WHERE id = v_c_id;

        INSERT INTO public.documents (
            user_id, company_id, client_id, sale_id, type, number, date, status, total, paid,
            client_name, client_address, client_ice, client_phone,
            company_name, company_address, company_phone, company_email,
            company_ice, company_if, company_rc, company_tp, company_rib,
            company_site_web, company_couleur_marque, company_logo_url, mode_paiement
        )
        VALUES (
            p_user_id, v_company_id, v_c_id, v_t_id,
            'invoice', 'FAC-' || (EXTRACT(YEAR FROM v_date)) || '-' || LPAD(v_i::text, 3, '0'), v_date, 'confirmed', 0, 0,
            v_client_names[21-v_i], v_addr, v_ice, v_price::text,
            COALESCE(v_company.name, 'Votre Société'), COALESCE(v_company.address, ''), COALESCE(v_company.phone, ''), COALESCE(v_company.email, ''),
            COALESCE(v_company.ice, ''), COALESCE(v_company.if_number, ''), COALESCE(v_company.rc, ''), COALESCE(v_company.tp_number, ''),
            COALESCE(v_company.rib, ''), COALESCE(v_company.site_web, ''), COALESCE(v_company.couleur_marque, '#4f46e5'),
            v_company.logo_url, 'Espèces'
        ) RETURNING id INTO v_doc_id;

        FOR v_j IN 1..(floor(random() * 2 + 1)) LOOP
            v_p_idx := floor(random() * 15 + 1);
            v_p_id := v_product_ids[v_p_idx];
            v_qty := floor(random() * 2 + 1);
            v_price := v_product_base_prices[v_p_idx] * 2.2;
            INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price) VALUES (v_t_id, v_p_id, v_qty, v_price);
            INSERT INTO public.document_items (document_id, product_id, product_name, quantity, unit_price) VALUES (v_doc_id, v_p_id, v_product_names[v_p_idx], v_qty, v_price);
            INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date)
            VALUES (p_user_id, v_company_id, v_p_id, 'out', v_qty, 'sale', v_t_id, v_date);
            UPDATE public.stock SET quantity = quantity - v_qty WHERE product_id = v_p_id AND company_id = v_company_id;
            v_total := v_total + (v_qty * v_price);
        END LOOP;

        v_paid := CASE WHEN v_i = 1 THEN 0 ELSE v_total END;
        UPDATE public.sales SET total = v_total, paid = v_paid, status = (CASE WHEN v_paid >= v_total THEN 'paid' ELSE 'unpaid' END) WHERE id = v_t_id;
        UPDATE public.documents SET total = v_total, paid = v_paid WHERE id = v_doc_id;
        IF v_paid > 0 THEN
            INSERT INTO public.client_payments (user_id, company_id, sale_id, amount, date, methode_paiement)
            VALUES (p_user_id, v_company_id, v_t_id, v_paid, v_date, 'Espèces');
        END IF;
    END LOOP;

    UPDATE public.clients  SET updated_at = now()           WHERE id = v_client_ids[20];
    UPDATE public.suppliers SET updated_at = now()          WHERE id = v_supplier_ids[20];
    UPDATE public.products  SET stock_alert = 5, updated_at = now() WHERE id = v_product_ids[20];
    UPDATE public.stock     SET quantity = 0, updated_at = now()    WHERE product_id = v_product_ids[20] AND company_id = v_company_id;

    RETURN 'Succès : Démo avec Logo et Données Réelles';
END;
$$;


ALTER FUNCTION "public"."generate_demo_data"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_years"("p_table" "text") RETURNS integer[]
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_table = 'sales' THEN
    RETURN ARRAY(
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int
      FROM sales
      WHERE company_id = get_my_company_id()
      ORDER BY 1 DESC
    );
  ELSIF p_table = 'purchases' THEN
    RETURN ARRAY(
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int
      FROM purchases
      WHERE company_id = get_my_company_id()
      ORDER BY 1 DESC
    );
  END IF;
  RETURN '{}';
END;
$$;


ALTER FUNCTION "public"."get_available_years"("p_table" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_client_monthly_stats"("p_client_id" "uuid", "p_year" integer, "p_month" integer) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_start     date;
  v_end       date;
  v_result    json;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;

  SELECT json_build_object(
    'totalVentes', COALESCE(SUM(total),     0),
    'totalPaye',   COALESCE(SUM(paid),      0),
    'resteAPayer', COALESCE(SUM(remaining), 0)
  )
  INTO v_result
  FROM sales
  WHERE company_id = get_my_company_id()
    AND client_id  = p_client_id
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_client_monthly_stats"("p_client_id" "uuid", "p_year" integer, "p_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_client_report"("p_year" integer, "p_month" integer) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_start  date;
  v_end    date;
  v_rows   json;
  v_totals json;
BEGIN
  IF p_month = 0 THEN
    v_start := make_date(p_year, 1, 1);
    v_end   := make_date(p_year, 12, 31);
  ELSE
    v_start := make_date(p_year, p_month, 1);
    v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'client_id',    client_id,
    'client_name',  client_name,
    'total_ventes', total_ventes,
    'total_paye',   total_paye,
    'reste',        reste
  ) ORDER BY lower(client_name)), '[]'::json)
  INTO v_rows
  FROM (
    SELECT
      c.id          AS client_id,
      c.name        AS client_name,
      SUM(s.total)     AS total_ventes,
      SUM(s.paid)      AS total_paye,
      SUM(s.remaining) AS reste
    FROM sales s
    JOIN clients c ON c.id = s.client_id
    WHERE s.company_id = get_my_company_id()
      AND s.date BETWEEN v_start AND v_end
      AND s.status != v_cancelled
    GROUP BY c.id, c.name
  ) t;

  SELECT json_build_object(
    'total_ventes', COALESCE(SUM((r->>'total_ventes')::numeric), 0),
    'total_paye',   COALESCE(SUM((r->>'total_paye')::numeric),   0),
    'reste',        COALESCE(SUM((r->>'reste')::numeric),        0)
  )
  INTO v_totals
  FROM json_array_elements(v_rows) AS r;

  RETURN json_build_object('rows', v_rows, 'totals', v_totals);
END;
$$;


ALTER FUNCTION "public"."get_client_report"("p_year" integer, "p_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_clients_with_stats"() RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_result    json;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id',            c.id,
    'user_id',       c.user_id,
    'company_id',    c.company_id,
    'name',          c.name,
    'phone',         c.phone,
    'address',       c.address,
    'ice',           c.ice,
    'created_at',    c.created_at,
    'updated_at',    c.updated_at,
    'totalDu',       COALESCE(agg.total_du, 0),
    'paymentStatus', CASE
                       WHEN COALESCE(agg.total_du, 0) = 0 THEN 'ok'
                       WHEN COALESCE(agg.has_unpaid, false) THEN 'unpaid'
                       ELSE 'partial'
                     END
  ) ORDER BY c.created_at DESC), '[]'::json)
  INTO v_result
  FROM clients c
  LEFT JOIN (
    SELECT
      client_id,
      SUM(remaining)                           AS total_du,
      bool_or(status IN ('unpaid', 'partial')) AS has_unpaid
    FROM sales
    WHERE company_id = get_my_company_id()
      AND status != v_cancelled
    GROUP BY client_id
  ) agg ON agg.client_id = c.id
  WHERE c.company_id = get_my_company_id();

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_clients_with_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"("p_year" integer, "p_month" integer) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cancelled    CONSTANT text := 'cancelled';
  v_start        date;
  v_end          date;
  v_ca           numeric := 0;
  v_enc          numeric := 0;
  v_arec         numeric := 0;
  v_nb           bigint  := 0;
  v_ach          numeric := 0;
  v_dec          numeric := 0;
  v_apay         numeric := 0;
  v_vpj          json;
  v_apj          json;
  v_produits_agg json;
  v_top5p        json;
  v_top5c        json;
  v_rpart        json;
  v_alerts       json;
BEGIN
  IF p_month = 0 THEN
    v_start := make_date(p_year, 1, 1);
    v_end   := make_date(p_year, 12, 31);
  ELSE
    v_start := make_date(p_year, p_month, 1);
    v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;
  END IF;

  SELECT
    COALESCE(SUM(total),     0),
    COALESCE(SUM(paid),      0),
    COALESCE(SUM(remaining), 0),
    COUNT(*)
  INTO v_ca, v_enc, v_arec, v_nb
  FROM sales
  WHERE company_id = get_my_company_id()
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  SELECT
    COALESCE(SUM(total),     0),
    COALESCE(SUM(paid),      0),
    COALESCE(SUM(remaining), 0)
  INTO v_ach, v_dec, v_apay
  FROM purchases
  WHERE company_id = get_my_company_id()
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  IF p_month = 0 THEN
    SELECT json_agg(
      json_build_object('day', day_label, 'total', COALESCE(agg.total, 0))
      ORDER BY m
    )
    INTO v_vpj
    FROM generate_series(1, 12) AS m
    CROSS JOIN LATERAL (
      SELECT CASE m
        WHEN 1  THEN 'Jan' WHEN 2  THEN 'Fév' WHEN 3  THEN 'Mar'
        WHEN 4  THEN 'Avr' WHEN 5  THEN 'Mai' WHEN 6  THEN 'Jui'
        WHEN 7  THEN 'Jul' WHEN 8  THEN 'Aoû' WHEN 9  THEN 'Sep'
        WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Déc'
      END AS day_label
    ) lbl
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM date)::int AS mois, SUM(total) AS total
      FROM sales
      WHERE company_id = get_my_company_id() AND date BETWEEN v_start AND v_end
        AND status != v_cancelled
      GROUP BY mois
    ) agg ON agg.mois = m;
  ELSE
    SELECT json_agg(
      json_build_object('day', d::text, 'total', COALESCE(agg.total, 0))
      ORDER BY d
    )
    INTO v_vpj
    FROM generate_series(1, EXTRACT(DAY FROM v_end)::int) AS d
    LEFT JOIN (
      SELECT EXTRACT(DAY FROM date)::int AS jour, SUM(total) AS total
      FROM sales
      WHERE company_id = get_my_company_id() AND date BETWEEN v_start AND v_end
        AND status != v_cancelled
      GROUP BY jour
    ) agg ON agg.jour = d;
  END IF;

  IF p_month = 0 THEN
    SELECT json_agg(
      json_build_object('day', day_label, 'total', COALESCE(agg.total, 0))
      ORDER BY m
    )
    INTO v_apj
    FROM generate_series(1, 12) AS m
    CROSS JOIN LATERAL (
      SELECT CASE m
        WHEN 1  THEN 'Jan' WHEN 2  THEN 'Fév' WHEN 3  THEN 'Mar'
        WHEN 4  THEN 'Avr' WHEN 5  THEN 'Mai' WHEN 6  THEN 'Jui'
        WHEN 7  THEN 'Jul' WHEN 8  THEN 'Aoû' WHEN 9  THEN 'Sep'
        WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Déc'
      END AS day_label
    ) lbl
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM date)::int AS mois, SUM(total) AS total
      FROM purchases
      WHERE company_id = get_my_company_id() AND date BETWEEN v_start AND v_end
        AND status != v_cancelled
      GROUP BY mois
    ) agg ON agg.mois = m;
  ELSE
    SELECT json_agg(
      json_build_object('day', d::text, 'total', COALESCE(agg.total, 0))
      ORDER BY d
    )
    INTO v_apj
    FROM generate_series(1, EXTRACT(DAY FROM v_end)::int) AS d
    LEFT JOIN (
      SELECT EXTRACT(DAY FROM date)::int AS jour, SUM(total) AS total
      FROM purchases
      WHERE company_id = get_my_company_id() AND date BETWEEN v_start AND v_end
        AND status != v_cancelled
      GROUP BY jour
    ) agg ON agg.jour = d;
  END IF;

  SELECT COALESCE(json_agg(json_build_object('name', name, 'total', total)), '[]'::json)
  INTO v_produits_agg
  FROM (
    SELECT p.name, SUM(si.quantity * si.unit_price) AS total
    FROM sale_items si
    JOIN sales     s ON s.id = si.sale_id
    JOIN products  p ON p.id = si.product_id
    WHERE s.company_id = get_my_company_id()
      AND s.date BETWEEN v_start AND v_end
      AND s.status != v_cancelled
    GROUP BY p.id, p.name
    ORDER BY total DESC
    LIMIT 8
  ) t;

  SELECT COALESCE(json_agg(elem), '[]'::json)
  INTO v_top5p
  FROM json_array_elements(v_produits_agg) WITH ORDINALITY AS t(elem, ord)
  WHERE ord <= 5;

  SELECT COALESCE(json_agg(json_build_object('name', elem->>'name', 'value', (elem->>'total')::numeric)), '[]'::json)
  INTO v_rpart
  FROM json_array_elements(v_produits_agg) AS elem;

  SELECT COALESCE(json_agg(json_build_object('name', name, 'total', total)), '[]'::json)
  INTO v_top5c
  FROM (
    SELECT c.name, SUM(s.total) AS total
    FROM sales   s
    JOIN clients c ON c.id = s.client_id
    WHERE s.company_id = get_my_company_id()
      AND s.date BETWEEN v_start AND v_end
      AND s.status != v_cancelled
    GROUP BY c.id, c.name
    ORDER BY total DESC
    LIMIT 5
  ) t;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id',          p.id,
      'name',        p.name,
      'quantity',    COALESCE(st.quantity, 0),
      'stock_alert', COALESCE(p.stock_alert, 0),
      'status',      CASE WHEN COALESCE(st.quantity, 0) <= 0 THEN 'rupture' ELSE 'faible' END
    )
    ORDER BY COALESCE(st.quantity, 0)
  ), '[]'::json)
  INTO v_alerts
  FROM products p
  LEFT JOIN stock st ON st.product_id = p.id AND st.company_id = p.company_id
  WHERE p.company_id = get_my_company_id()
    AND (COALESCE(st.quantity, 0) <= 0 OR COALESCE(st.quantity, 0) <= p.stock_alert);

  RETURN json_build_object(
    'ca',                  v_ca,
    'encaisse',            v_enc,
    'aRecevoir',           v_arec,
    'nbVentes',            v_nb,
    'totalAchats',         v_ach,
    'decaisse',            v_dec,
    'aPayer',              v_apay,
    'marge',               v_ca - v_ach,
    'panierMoyen',         CASE WHEN v_nb > 0 THEN v_ca / v_nb ELSE 0 END,
    'ventesParJour',       COALESCE(v_vpj, '[]'::json),
    'achatsParJour',       COALESCE(v_apj, '[]'::json),
    'top5Produits',        v_top5p,
    'top5Clients',         v_top5c,
    'repartitionProduits', v_rpart,
    'stockAlerts',         v_alerts
  );
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats"("p_year" integer, "p_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_company_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT company_id
  FROM public.company_members
  WHERE user_id = auth.uid()
  ORDER BY created_at
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_company_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_doc_sequence"("p_company_id" "uuid", "p_type" "text", "p_year" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_seq integer;
BEGIN
  IF p_company_id NOT IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO document_sequences (user_id, company_id, type, year, last_number)
  VALUES (auth.uid(), p_company_id, p_type, p_year, 1)
  ON CONFLICT (company_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;
  RETURN v_seq;
END;
$$;


ALTER FUNCTION "public"."get_next_doc_sequence"("p_company_id" "uuid", "p_type" "text", "p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stock_alert_count"() RETURNS integer
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)::int
  FROM products p
  LEFT JOIN stock st ON st.product_id = p.id AND st.company_id = p.company_id
  WHERE p.company_id = get_my_company_id()
    AND (COALESCE(st.quantity, 0) = 0 OR COALESCE(st.quantity, 0) <= p.stock_alert);
$$;


ALTER FUNCTION "public"."get_stock_alert_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_supplier_monthly_stats"("p_supplier_id" "uuid", "p_year" integer, "p_month" integer) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_start     date;
  v_end       date;
  v_result    json;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;

  SELECT json_build_object(
    'totalAchats', COALESCE(SUM(total),     0),
    'totalPaye',   COALESCE(SUM(paid),      0),
    'resteAPayer', COALESCE(SUM(remaining), 0)
  )
  INTO v_result
  FROM purchases
  WHERE company_id  = get_my_company_id()
    AND supplier_id = p_supplier_id
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_supplier_monthly_stats"("p_supplier_id" "uuid", "p_year" integer, "p_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_supplier_report"("p_year" integer, "p_month" integer) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_start  date;
  v_end    date;
  v_rows   json;
  v_totals json;
BEGIN
  IF p_month = 0 THEN
    v_start := make_date(p_year, 1, 1);
    v_end   := make_date(p_year, 12, 31);
  ELSE
    v_start := make_date(p_year, p_month, 1);
    v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'supplier_id',   supplier_id,
    'supplier_name', supplier_name,
    'total_achats',  total_achats,
    'total_paye',    total_paye,
    'reste',         reste
  ) ORDER BY lower(supplier_name)), '[]'::json)
  INTO v_rows
  FROM (
    SELECT
      su.id          AS supplier_id,
      su.name        AS supplier_name,
      SUM(p.total)      AS total_achats,
      SUM(p.paid)       AS total_paye,
      SUM(p.remaining)  AS reste
    FROM purchases p
    JOIN suppliers su ON su.id = p.supplier_id
    WHERE p.company_id = get_my_company_id()
      AND p.date BETWEEN v_start AND v_end
      AND p.status != v_cancelled
    GROUP BY su.id, su.name
  ) t;

  SELECT json_build_object(
    'total_achats', COALESCE(SUM((r->>'total_achats')::numeric), 0),
    'total_paye',   COALESCE(SUM((r->>'total_paye')::numeric),   0),
    'reste',        COALESCE(SUM((r->>'reste')::numeric),        0)
  )
  INTO v_totals
  FROM json_array_elements(v_rows) AS r;

  RETURN json_build_object('rows', v_rows, 'totals', v_totals);
END;
$$;


ALTER FUNCTION "public"."get_supplier_report"("p_year" integer, "p_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_suppliers_with_stats"() RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cancelled CONSTANT text := 'cancelled';
  v_result    json;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id',            s.id,
    'user_id',       s.user_id,
    'company_id',    s.company_id,
    'name',          s.name,
    'phone',         s.phone,
    'address',       s.address,
    'ice',           s.ice,
    'created_at',    s.created_at,
    'updated_at',    s.updated_at,
    'totalDu',       COALESCE(agg.total_du, 0),
    'paymentStatus', CASE
                       WHEN COALESCE(agg.total_du, 0) = 0 THEN 'ok'
                       WHEN COALESCE(agg.has_unpaid, false) THEN 'unpaid'
                       ELSE 'partial'
                     END
  ) ORDER BY s.created_at DESC), '[]'::json)
  INTO v_result
  FROM suppliers s
  LEFT JOIN (
    SELECT
      supplier_id,
      SUM(remaining)                           AS total_du,
      bool_or(status IN ('unpaid', 'partial')) AS has_unpaid
    FROM purchases
    WHERE company_id = get_my_company_id()
      AND status != v_cancelled
    GROUP BY supplier_id
  ) agg ON agg.supplier_id = s.id
  WHERE s.company_id = get_my_company_id();

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_suppliers_with_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unpaid_clients_count"() RETURNS integer
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)::int
  FROM clients c
  LEFT JOIN (
    SELECT
      client_id,
      SUM(remaining)                           AS total_du,
      bool_or(status IN ('unpaid', 'partial')) AS has_unpaid
    FROM sales
    WHERE company_id = get_my_company_id()
      AND status != 'cancelled'
    GROUP BY client_id
  ) agg ON agg.client_id = c.id
  WHERE c.company_id = get_my_company_id()
    AND COALESCE(agg.total_du, 0) > 0
    AND COALESCE(agg.has_unpaid, false) = true;
$$;


ALTER FUNCTION "public"."get_unpaid_clients_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unpaid_suppliers_count"() RETURNS integer
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)::int
  FROM suppliers s
  LEFT JOIN (
    SELECT
      supplier_id,
      SUM(remaining)                           AS total_du,
      bool_or(status IN ('unpaid', 'partial')) AS has_unpaid
    FROM purchases
    WHERE company_id = get_my_company_id()
      AND status != 'cancelled'
    GROUP BY supplier_id
  ) agg ON agg.supplier_id = s.id
  WHERE s.company_id = get_my_company_id()
    AND COALESCE(agg.total_du, 0) > 0
    AND COALESCE(agg.has_unpaid, false) = true;
$$;


ALTER FUNCTION "public"."get_unpaid_suppliers_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, business_mode)
  VALUES (new.id, 'revente')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regularize_user_invoices"("p_company_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  r          record;
  v_new_ref  text;
BEGIN
  FOR r IN (
    SELECT id,
           EXTRACT(YEAR FROM date)::int AS doc_year,
           ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM date) ORDER BY date, created_at) AS new_seq
    FROM public.documents
    WHERE company_id = p_company_id AND type = 'invoice'
  ) LOOP
    v_new_ref := 'FAC-' || r.doc_year || '-' || LPAD(r.new_seq::text, 3, '0');
    UPDATE public.documents SET number = v_new_ref WHERE id = r.id;
  END LOOP;

  INSERT INTO public.document_sequences (user_id, company_id, type, year, last_number)
  SELECT
    (SELECT user_id FROM public.companies WHERE id = p_company_id),
    p_company_id, 'invoice', t.calc_year, MAX(t.new_seq)
  FROM (
    SELECT EXTRACT(YEAR FROM date)::int AS calc_year,
           ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM date) ORDER BY date, created_at) AS new_seq
    FROM public.documents
    WHERE company_id = p_company_id AND type = 'invoice'
  ) t
  GROUP BY t.calc_year
  ON CONFLICT (company_id, type, year) DO UPDATE SET last_number = EXCLUDED.last_number;
END;
$$;


ALTER FUNCTION "public"."regularize_user_invoices"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_purchase"("p_id" "uuid", "p_supplier_id" "uuid", "p_date" "date", "p_note" "text" DEFAULT NULL::"text", "p_tva_rate" numeric DEFAULT 0, "p_items" "jsonb" DEFAULT '[]'::"jsonb", "p_payments" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid         uuid    := auth.uid();
  v_company_id  uuid    := get_my_company_id();
  v_reference   text;
  v_total_ht    numeric := 0;
  v_tva_amount  numeric;
  v_total       numeric;
  v_paid        numeric := 0;
  v_status      text;
  v_item        jsonb;
  v_pay         jsonb;
  v_product_id  uuid;
  v_qty         int;
  v_pieces      int;
  v_price       numeric;
  v_stock_id    uuid;
  v_stock_qty   numeric;
BEGIN
  SELECT reference INTO v_reference
  FROM purchases WHERE id = p_id AND company_id = v_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Achat introuvable ou accès refusé'; END IF;

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

  UPDATE purchases SET
    supplier_id = p_supplier_id,
    date        = p_date,
    note        = p_note,
    total       = v_total,
    tva_rate    = p_tva_rate,
    tva_amount  = v_tva_amount,
    paid        = v_paid,
    status      = v_status,
    updated_at  = now()
  WHERE id = p_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    v_pieces     := COALESCE((v_item->>'pieces_count')::int, 1);
    v_price      := (v_item->>'unit_price')::numeric;

    IF (v_item->>'original_id') IS NOT NULL
       AND (v_item->>'original_id') <> 'null' THEN
      UPDATE purchase_items
      SET unit_price = v_price, pieces_count = v_pieces
      WHERE id = (v_item->>'original_id')::uuid;
    ELSE
      INSERT INTO purchase_items (purchase_id, product_id, quantity, pieces_count, unit_price)
      VALUES (p_id, v_product_id, v_qty, v_pieces, v_price);

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
              'purchase', p_id, 'Ajout nouvel article à l''achat', p_date,
              v_stock_qty, v_stock_qty + v_qty);
    END IF;
  END LOOP;

  DELETE FROM supplier_payments WHERE purchase_id = p_id;
  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    INSERT INTO supplier_payments (user_id, company_id, purchase_id, amount, date,
                                   note, methode_paiement)
    VALUES (v_uid, v_company_id, p_id,
            (v_pay->>'amount')::numeric,
            (v_pay->>'date')::date,
            NULLIF(v_pay->>'note', ''),
            NULLIF(v_pay->>'methode_paiement', '')::methode_paiement_type);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_purchase"("p_id" "uuid", "p_supplier_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sale"("p_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text" DEFAULT NULL::"text", "p_tva_rate" numeric DEFAULT 0, "p_items" "jsonb" DEFAULT '[]'::"jsonb", "p_payments" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid        uuid    := auth.uid();
  v_company_id uuid    := get_my_company_id();
  v_reference  text;
  v_total_ht   numeric := 0;
  v_tva_amount numeric;
  v_total      numeric;
  v_paid       numeric := 0;
  v_status     text;
  v_item       jsonb;
  v_pay        jsonb;
  v_product_id uuid;
  v_qty        int;
  v_pieces     int;
  v_price      numeric;
  v_stock_id   uuid;
  v_stock_qty  numeric;
BEGIN
  SELECT reference INTO v_reference
  FROM sales WHERE id = p_id AND company_id = v_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vente introuvable ou accès refusé'; END IF;

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

  UPDATE sales SET
    client_id  = p_client_id,
    date       = p_date,
    note       = p_note,
    total      = v_total,
    tva_rate   = p_tva_rate,
    tva_amount = v_tva_amount,
    paid       = v_paid,
    status     = v_status,
    updated_at = now()
  WHERE id = p_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    v_pieces     := COALESCE((v_item->>'pieces_count')::int, 1);
    v_price      := (v_item->>'unit_price')::numeric;

    IF (v_item->>'original_id') IS NOT NULL
       AND (v_item->>'original_id') <> 'null' THEN
      UPDATE sale_items
      SET unit_price = v_price, pieces_count = v_pieces
      WHERE id = (v_item->>'original_id')::uuid;
    ELSE
      INSERT INTO sale_items (sale_id, product_id, quantity, pieces_count, unit_price)
      VALUES (p_id, v_product_id, v_qty, v_pieces, v_price);

      SELECT id, quantity INTO v_stock_id, v_stock_qty
      FROM stock WHERE product_id = v_product_id AND company_id = v_company_id;

      IF FOUND THEN
        UPDATE stock SET quantity = quantity - v_qty, updated_at = now()
        WHERE id = v_stock_id;
      ELSE
        INSERT INTO stock (user_id, company_id, product_id, quantity)
        VALUES (v_uid, v_company_id, v_product_id, -v_qty)
        RETURNING id INTO v_stock_id;
        v_stock_qty := 0;
      END IF;

      INSERT INTO stock_movements (user_id, company_id, product_id, type, quantity,
                                   reference_type, reference_id, note, date,
                                   stock_avant, stock_apres)
      VALUES (v_uid, v_company_id, v_product_id, 'out', -v_qty,
              'sale', p_id, 'Ajout nouvel article à la vente', p_date,
              v_stock_qty, v_stock_qty - v_qty);
    END IF;
  END LOOP;

  DELETE FROM client_payments WHERE sale_id = p_id;
  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    INSERT INTO client_payments (user_id, company_id, sale_id, amount, date,
                                 note, methode_paiement)
    VALUES (v_uid, v_company_id, p_id,
            (v_pay->>'amount')::numeric,
            (v_pay->>'date')::date,
            NULLIF(v_pay->>'note', ''),
            NULLIF(v_pay->>'methode_paiement', '')::methode_paiement_type);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_sale"("p_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."client_payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "methode_paiement" "public"."methode_paiement_type",
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "public"."client_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "address" "text",
    "ice" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "phone" "text",
    "email" "text",
    "ice" "text",
    "rc" "text",
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "forme_juridique" "text",
    "site_web" "text",
    "tva_number" "text",
    "taux_tva_defaut" numeric(5,2) DEFAULT 0,
    "if_number" "text",
    "tp_number" "text",
    "couleur_marque" "text" DEFAULT '#000000'::"text",
    "rib" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "company_members_role_check" CHECK (("role" = 'admin'::"text"))
);


ALTER TABLE "public"."company_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "pieces_count" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "subtotal" numeric(12,2) GENERATED ALWAYS AS ((("quantity")::numeric * "unit_price")) STORED,
    "product_name" "text"
);


ALTER TABLE "public"."document_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_sequences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "year" integer NOT NULL,
    "last_number" integer DEFAULT 0,
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "public"."document_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "sale_id" "uuid",
    "parent_id" "uuid",
    "type" "text" NOT NULL,
    "number" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "paid" numeric(12,2) DEFAULT 0 NOT NULL,
    "remaining" numeric(12,2) GENERATED ALWAYS AS (("total" - "paid")) STORED,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_id" "uuid",
    "client_name" "text",
    "client_address" "text",
    "client_ice" "text",
    "company_name" "text",
    "company_address" "text",
    "company_ice" "text",
    "company_if" "text",
    "company_rc" "text",
    "company_tp" "text",
    "company_logo_url" "text",
    "company_phone" "text",
    "company_email" "text",
    "company_rib" "text",
    "tva_rate" numeric DEFAULT 0 NOT NULL,
    "tva_amount" numeric DEFAULT 0 NOT NULL,
    "company_couleur_marque" "text",
    "company_site_web" "text",
    "client_phone" "text",
    "mode_paiement" "text",
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "documents_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['paid'::"text", 'partial'::"text", 'unpaid'::"text"]))),
    CONSTRAINT "documents_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'confirmed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "documents_type_check" CHECK (("type" = ANY (ARRAY['quote'::"text", 'order'::"text", 'delivery'::"text", 'invoice'::"text", 'receipt'::"text"])))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "pieces_count" integer DEFAULT 1 NOT NULL,
    "stock_alert" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nature" "text" DEFAULT 'revente'::"text",
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "products_nature_check" CHECK (("nature" = ANY (ARRAY['revente'::"text", 'matiere_premiere'::"text", 'produit_fini'::"text"]))),
    CONSTRAINT "products_type_check" CHECK (("type" = ANY (ARRAY['individual'::"text", 'pack'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."nature" IS 'Nature du produit : revente (standard), matiere_premiere ou produit_fini (pour mode production)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "business_mode" "text" DEFAULT 'revente'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_business_mode_check" CHECK (("business_mode" = ANY (ARRAY['revente'::"text", 'production'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Profils utilisateurs stockant les préférences globales comme le business_mode';



CREATE TABLE IF NOT EXISTS "public"."purchase_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "purchase_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "subtotal" numeric(12,2) GENERATED ALWAYS AS ((("quantity")::numeric * "unit_price")) STORED,
    "pieces_count" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."purchase_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "reference" "text",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "paid" numeric(12,2) DEFAULT 0 NOT NULL,
    "remaining" numeric(12,2) GENERATED ALWAYS AS (("total" - "paid")) STORED,
    "status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tva_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "tva_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "purchases_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'partial'::"text", 'unpaid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "pieces_count" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "subtotal" numeric(12,2) GENERATED ALWAYS AS ((("quantity")::numeric * "unit_price")) STORED
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "paid" numeric(12,2) DEFAULT 0 NOT NULL,
    "remaining" numeric(12,2) GENERATED ALWAYS AS (("total" - "paid")) STORED,
    "status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reference" "text",
    "tva_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "tva_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "sales_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'partial'::"text", 'unpaid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "public"."stock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "reference_type" "text",
    "reference_id" "uuid",
    "note" "text",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stock_avant" integer,
    "stock_apres" integer,
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "stock_movements_reference_type_check" CHECK (("reference_type" = ANY (ARRAY['purchase'::"text", 'sale'::"text", 'manual'::"text"]))),
    CONSTRAINT "stock_movements_type_check" CHECK (("type" = ANY (ARRAY['in'::"text", 'out'::"text", 'adjust'::"text"])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "purchase_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "methode_paiement" "public"."methode_paiement_type",
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "public"."supplier_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "address" "text",
    "ice" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."client_payments"
    ADD CONSTRAINT "client_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_company_id_name_key" UNIQUE ("company_id", "name");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_company_id_user_id_key" UNIQUE ("company_id", "user_id");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_items"
    ADD CONSTRAINT "document_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_sequences"
    ADD CONSTRAINT "document_sequences_company_id_type_year_key" UNIQUE ("company_id", "type", "year");



ALTER TABLE ONLY "public"."document_sequences"
    ADD CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_company_id_name_key" UNIQUE ("company_id", "name");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_company_id_reference_key" UNIQUE ("company_id", "reference");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_company_id_reference_key" UNIQUE ("company_id", "reference");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_company_id_product_id_key" UNIQUE ("company_id", "product_id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_company_id_name_key" UNIQUE ("company_id", "name");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_client_pay_sale" ON "public"."client_payments" USING "btree" ("sale_id");



CREATE INDEX "idx_client_pay_user" ON "public"."client_payments" USING "btree" ("user_id");



CREATE INDEX "idx_client_payments_company" ON "public"."client_payments" USING "btree" ("company_id");



CREATE INDEX "idx_clients_company" ON "public"."clients" USING "btree" ("company_id");



CREATE INDEX "idx_clients_user" ON "public"."clients" USING "btree" ("user_id");



CREATE INDEX "idx_company_members_company" ON "public"."company_members" USING "btree" ("company_id");



CREATE INDEX "idx_company_members_user" ON "public"."company_members" USING "btree" ("user_id");



CREATE INDEX "idx_doc_items_doc" ON "public"."document_items" USING "btree" ("document_id");



CREATE INDEX "idx_documents_client" ON "public"."documents" USING "btree" ("client_id");



CREATE INDEX "idx_documents_company" ON "public"."documents" USING "btree" ("company_id");



CREATE INDEX "idx_documents_parent" ON "public"."documents" USING "btree" ("parent_id");



CREATE INDEX "idx_documents_payment" ON "public"."documents" USING "btree" ("payment_id");



CREATE INDEX "idx_documents_sale" ON "public"."documents" USING "btree" ("sale_id");



CREATE INDEX "idx_documents_type" ON "public"."documents" USING "btree" ("type");



CREATE INDEX "idx_documents_user" ON "public"."documents" USING "btree" ("user_id");



CREATE INDEX "idx_products_company" ON "public"."products" USING "btree" ("company_id");



CREATE INDEX "idx_products_user" ON "public"."products" USING "btree" ("user_id");



CREATE INDEX "idx_purchase_items_purch" ON "public"."purchase_items" USING "btree" ("purchase_id");



CREATE INDEX "idx_purchases_company" ON "public"."purchases" USING "btree" ("company_id");



CREATE INDEX "idx_purchases_date" ON "public"."purchases" USING "btree" ("date");



CREATE INDEX "idx_purchases_supplier" ON "public"."purchases" USING "btree" ("supplier_id");



CREATE INDEX "idx_purchases_user" ON "public"."purchases" USING "btree" ("user_id");



CREATE INDEX "idx_purchases_user_date" ON "public"."purchases" USING "btree" ("user_id", "date");



CREATE INDEX "idx_purchases_user_date_active" ON "public"."purchases" USING "btree" ("user_id", "date") WHERE ("status" <> 'cancelled'::"text");



CREATE INDEX "idx_purchases_user_supplier" ON "public"."purchases" USING "btree" ("user_id", "supplier_id");



CREATE INDEX "idx_sale_items_product" ON "public"."sale_items" USING "btree" ("product_id");



CREATE INDEX "idx_sale_items_sale" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sale_items_sale_id" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sales_client" ON "public"."sales" USING "btree" ("client_id");



CREATE INDEX "idx_sales_company" ON "public"."sales" USING "btree" ("company_id");



CREATE INDEX "idx_sales_date" ON "public"."sales" USING "btree" ("date");



CREATE INDEX "idx_sales_user" ON "public"."sales" USING "btree" ("user_id");



CREATE INDEX "idx_sales_user_client" ON "public"."sales" USING "btree" ("user_id", "client_id");



CREATE INDEX "idx_sales_user_client_date" ON "public"."sales" USING "btree" ("user_id", "client_id", "date");



CREATE INDEX "idx_sales_user_date" ON "public"."sales" USING "btree" ("user_id", "date");



CREATE INDEX "idx_sales_user_date_active" ON "public"."sales" USING "btree" ("user_id", "date") WHERE ("status" <> 'cancelled'::"text");



CREATE INDEX "idx_stock_company" ON "public"."stock" USING "btree" ("company_id");



CREATE INDEX "idx_stock_mov_product" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "idx_stock_mov_user" ON "public"."stock_movements" USING "btree" ("user_id");



CREATE INDEX "idx_stock_movements_company" ON "public"."stock_movements" USING "btree" ("company_id");



CREATE INDEX "idx_stock_product" ON "public"."stock" USING "btree" ("product_id");



CREATE INDEX "idx_stock_product_user" ON "public"."stock" USING "btree" ("product_id", "user_id");



CREATE INDEX "idx_stock_user" ON "public"."stock" USING "btree" ("user_id");



CREATE INDEX "idx_supplier_pay_purch" ON "public"."supplier_payments" USING "btree" ("purchase_id");



CREATE INDEX "idx_supplier_pay_user" ON "public"."supplier_payments" USING "btree" ("user_id");



CREATE INDEX "idx_supplier_payments_company" ON "public"."supplier_payments" USING "btree" ("company_id");



CREATE INDEX "idx_suppliers_company" ON "public"."suppliers" USING "btree" ("company_id");



CREATE INDEX "idx_suppliers_user" ON "public"."suppliers" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_purchases_updated_at" BEFORE UPDATE ON "public"."purchases" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sales_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."client_payments"
    ADD CONSTRAINT "client_payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_payments"
    ADD CONSTRAINT "client_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_payments"
    ADD CONSTRAINT "client_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_items"
    ADD CONSTRAINT "document_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_items"
    ADD CONSTRAINT "document_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_sequences"
    ADD CONSTRAINT "document_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_sequences"
    ADD CONSTRAINT "document_sequences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."client_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can manage their own profile" ON "public"."profiles" TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."client_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_client_payments" ON "public"."client_payments" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



CREATE POLICY "company_clients" ON "public"."clients" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



CREATE POLICY "company_document_items" ON "public"."document_items" USING (("document_id" IN ( SELECT "documents"."id"
   FROM "public"."documents"
  WHERE ("documents"."company_id" = "public"."get_my_company_id"()))));



CREATE POLICY "company_document_sequences" ON "public"."document_sequences" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



CREATE POLICY "company_documents" ON "public"."documents" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



ALTER TABLE "public"."company_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_products" ON "public"."products" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



CREATE POLICY "company_purchase_items" ON "public"."purchase_items" USING (("purchase_id" IN ( SELECT "purchases"."id"
   FROM "public"."purchases"
  WHERE ("purchases"."company_id" = "public"."get_my_company_id"()))));



CREATE POLICY "company_purchases" ON "public"."purchases" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



CREATE POLICY "company_sale_items" ON "public"."sale_items" USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" = "public"."get_my_company_id"()))));



CREATE POLICY "company_sales" ON "public"."sales" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



CREATE POLICY "company_stock" ON "public"."stock" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



CREATE POLICY "company_stock_movements" ON "public"."stock_movements" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



CREATE POLICY "company_supplier_payments" ON "public"."supplier_payments" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



CREATE POLICY "company_suppliers" ON "public"."suppliers" USING (("company_id" = "public"."get_my_company_id"())) WITH CHECK (("company_id" = "public"."get_my_company_id"()));



ALTER TABLE "public"."document_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_companies" ON "public"."companies" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_company_members" ON "public"."company_members" USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."adjust_stock"("p_stock_id" "uuid", "p_product_id" "uuid", "p_type" "text", "p_quantity" integer, "p_note" "text", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_stock"("p_stock_id" "uuid", "p_product_id" "uuid", "p_type" "text", "p_quantity" integer, "p_note" "text", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_stock"("p_stock_id" "uuid", "p_product_id" "uuid", "p_type" "text", "p_quantity" integer, "p_note" "text", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_transaction"("p_id" "uuid", "p_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_transaction"("p_id" "uuid", "p_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_transaction"("p_id" "uuid", "p_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_app_user"("p_email" "text", "p_password" "text", "p_mode" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_app_user"("p_email" "text", "p_password" "text", "p_mode" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_app_user"("p_email" "text", "p_password" "text", "p_mode" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_app_user"("p_email" "text", "p_password" "text", "p_company_name" "text", "p_mode" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_app_user"("p_email" "text", "p_password" "text", "p_company_name" "text", "p_mode" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_app_user"("p_email" "text", "p_password" "text", "p_company_name" "text", "p_mode" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_client_payment"("p_sale_id" "uuid", "p_date" "date", "p_amount" numeric, "p_note" "text", "p_methode_paiement" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_client_payment"("p_sale_id" "uuid", "p_date" "date", "p_amount" numeric, "p_note" "text", "p_methode_paiement" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_client_payment"("p_sale_id" "uuid", "p_date" "date", "p_amount" numeric, "p_note" "text", "p_methode_paiement" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invoice"("p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invoice"("p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invoice"("p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_product"("p_name" "text", "p_type" "text", "p_nature" "text", "p_pieces_count" integer, "p_stock_alert" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_product"("p_name" "text", "p_type" "text", "p_nature" "text", "p_pieces_count" integer, "p_stock_alert" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_product"("p_name" "text", "p_type" "text", "p_nature" "text", "p_pieces_count" integer, "p_stock_alert" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_purchase"("p_supplier_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_purchase"("p_supplier_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_purchase"("p_supplier_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_receipt"("p_payment_id" "uuid", "p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_receipt"("p_payment_id" "uuid", "p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_receipt"("p_payment_id" "uuid", "p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_sale"("p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_sale"("p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sale"("p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_supplier_payment"("p_purchase_id" "uuid", "p_date" "date", "p_amount" numeric, "p_note" "text", "p_methode_paiement" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_supplier_payment"("p_purchase_id" "uuid", "p_date" "date", "p_amount" numeric, "p_note" "text", "p_methode_paiement" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_supplier_payment"("p_purchase_id" "uuid", "p_date" "date", "p_amount" numeric, "p_note" "text", "p_methode_paiement" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_demo_data"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_demo_data"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_demo_data"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_years"("p_table" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_years"("p_table" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_years"("p_table" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_monthly_stats"("p_client_id" "uuid", "p_year" integer, "p_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_monthly_stats"("p_client_id" "uuid", "p_year" integer, "p_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_monthly_stats"("p_client_id" "uuid", "p_year" integer, "p_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_report"("p_year" integer, "p_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_report"("p_year" integer, "p_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_report"("p_year" integer, "p_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_clients_with_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_clients_with_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_clients_with_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_stats"("p_year" integer, "p_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"("p_year" integer, "p_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"("p_year" integer, "p_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_company_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_doc_sequence"("p_company_id" "uuid", "p_type" "text", "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_doc_sequence"("p_company_id" "uuid", "p_type" "text", "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_doc_sequence"("p_company_id" "uuid", "p_type" "text", "p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stock_alert_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_stock_alert_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stock_alert_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_supplier_monthly_stats"("p_supplier_id" "uuid", "p_year" integer, "p_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_supplier_monthly_stats"("p_supplier_id" "uuid", "p_year" integer, "p_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_supplier_monthly_stats"("p_supplier_id" "uuid", "p_year" integer, "p_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_supplier_report"("p_year" integer, "p_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_supplier_report"("p_year" integer, "p_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_supplier_report"("p_year" integer, "p_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_suppliers_with_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_suppliers_with_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_suppliers_with_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unpaid_clients_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_unpaid_clients_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unpaid_clients_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unpaid_suppliers_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_unpaid_suppliers_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unpaid_suppliers_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regularize_user_invoices"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."regularize_user_invoices"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regularize_user_invoices"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_purchase"("p_id" "uuid", "p_supplier_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_purchase"("p_id" "uuid", "p_supplier_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_purchase"("p_id" "uuid", "p_supplier_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sale"("p_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_sale"("p_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sale"("p_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_tva_rate" numeric, "p_items" "jsonb", "p_payments" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."client_payments" TO "anon";
GRANT ALL ON TABLE "public"."client_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."client_payments" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_members" TO "anon";
GRANT ALL ON TABLE "public"."company_members" TO "authenticated";
GRANT ALL ON TABLE "public"."company_members" TO "service_role";



GRANT ALL ON TABLE "public"."document_items" TO "anon";
GRANT ALL ON TABLE "public"."document_items" TO "authenticated";
GRANT ALL ON TABLE "public"."document_items" TO "service_role";



GRANT ALL ON TABLE "public"."document_sequences" TO "anon";
GRANT ALL ON TABLE "public"."document_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."document_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_items" TO "service_role";



GRANT ALL ON TABLE "public"."purchases" TO "anon";
GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."stock" TO "anon";
GRANT ALL ON TABLE "public"."stock" TO "authenticated";
GRANT ALL ON TABLE "public"."stock" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_payments" TO "anon";
GRANT ALL ON TABLE "public"."supplier_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_payments" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































