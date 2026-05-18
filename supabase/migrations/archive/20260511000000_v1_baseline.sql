


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


CREATE OR REPLACE FUNCTION "public"."cancel_transaction"("p_id" "uuid", "p_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cancelled  CONSTANT text := 'cancelled';
  v_uid        uuid;
  v_reference  text;
  v_date       date;
  v_paid       numeric;
  v_item       record;
  v_status     text;
BEGIN
  -- ── 0. Auth ────────────────────────────────────────────────────────────────
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- ── 1. Validation du type ──────────────────────────────────────────────────
  IF p_type NOT IN ('purchase', 'sale') THEN
    RAISE EXCEPTION 'Type invalide : %', p_type;
  END IF;

  -- ── 2. Récupère et verrouille la transaction ───────────────────────────────
  IF p_type = 'purchase' THEN
    SELECT status, reference, date, paid
      INTO v_status, v_reference, v_date, v_paid
      FROM purchases
     WHERE id = p_id AND user_id = v_uid
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Achat introuvable';
    END IF;
  ELSE
    SELECT status, reference, date, paid
      INTO v_status, v_reference, v_date, v_paid
      FROM sales
     WHERE id = p_id AND user_id = v_uid
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vente introuvable';
    END IF;
  END IF;

  -- ── 3. Vérifie que la transaction n'est pas déjà annulée ──────────────────
  IF v_status = v_cancelled THEN
    RAISE EXCEPTION 'Cette transaction est déjà annulée';
  END IF;

  -- ── 4. Vérifie qu'aucun paiement n'a été enregistré ──────────────────────
  IF v_paid > 0 THEN
    RAISE EXCEPTION 'Annulation impossible : un paiement a déjà été enregistré pour cette transaction.';
  END IF;

  -- ── 5. Mise à jour du statut ──────────────────────────────────────────────
  IF p_type = 'purchase' THEN
    UPDATE purchases
       SET status     = v_cancelled,
           updated_at = now()
     WHERE id = p_id AND user_id = v_uid;
  ELSE
    UPDATE sales
       SET status     = v_cancelled,
           updated_at = now()
     WHERE id = p_id AND user_id = v_uid;
  END IF;

  -- ── 7. Inversion du stock + mouvement d'annulation ────────────────────────
  IF p_type = 'purchase' THEN
    FOR v_item IN
      SELECT pi.product_id, pi.quantity
        FROM purchase_items pi
       WHERE pi.purchase_id = p_id
    LOOP
      UPDATE stock
         SET quantity   = quantity - v_item.quantity,
             updated_at = now()
       WHERE product_id = v_item.product_id
         AND user_id    = v_uid;

      INSERT INTO stock_movements (
        user_id, product_id, type, quantity,
        reference_type, reference_id, note, date
      ) VALUES (
        v_uid, v_item.product_id, 'out', -v_item.quantity,
        'purchase', p_id,
        'Annulation ' || COALESCE(v_reference, 'achat'),
        COALESCE(v_date, CURRENT_DATE)
      );
    END LOOP;

  ELSE
    FOR v_item IN
      SELECT si.product_id, si.quantity
        FROM sale_items si
       WHERE si.sale_id = p_id
    LOOP
      INSERT INTO stock (user_id, product_id, quantity)
        VALUES (v_uid, v_item.product_id, v_item.quantity)
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET
        quantity   = stock.quantity + v_item.quantity,
        updated_at = now();

      INSERT INTO stock_movements (
        user_id, product_id, type, quantity,
        reference_type, reference_id, note, date
      ) VALUES (
        v_uid, v_item.product_id, 'in', v_item.quantity,
        'sale', p_id,
        'Annulation ' || COALESCE(v_reference, 'vente'),
        COALESCE(v_date, CURRENT_DATE)
      );
    END LOOP;
  END IF;

END;
$$;


ALTER FUNCTION "public"."cancel_transaction"("p_id" "uuid", "p_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invoice"("p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO document_sequences (user_id, type, year, last_number)
  VALUES (v_user_id, 'invoice', v_year, 1)
  ON CONFLICT (user_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;

  v_number := 'FAC-' || v_year || '-' || LPAD(v_seq::text, 3, '0');

  v_payment_status := CASE
    WHEN p_paid >= p_total THEN 'paid'
    WHEN p_paid > 0        THEN 'partial'
    ELSE                        'unpaid'
  END;

  SELECT * INTO v_company FROM companies WHERE user_id = v_user_id LIMIT 1;
  SELECT name, address, ice, phone INTO v_client FROM clients WHERE id = p_client_id;

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


CREATE OR REPLACE FUNCTION "public"."create_receipt"("p_payment_id" "uuid", "p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM client_payments WHERE id = p_payment_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

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


ALTER FUNCTION "public"."create_receipt"("p_payment_id" "uuid", "p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_years"("p_table" "text") RETURNS integer[]
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_table = 'sales' THEN
    RETURN ARRAY(
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int
      FROM sales
      WHERE user_id = auth.uid()
      ORDER BY 1 DESC
    );
  ELSIF p_table = 'purchases' THEN
    RETURN ARRAY(
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int
      FROM purchases
      WHERE user_id = auth.uid()
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
  v_cancelled  CONSTANT text := 'cancelled';
  v_start      date;
  v_end        date;
  v_result     json;
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
  WHERE user_id   = auth.uid()
    AND client_id = p_client_id
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
    WHERE s.user_id = auth.uid()
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
    WHERE user_id = auth.uid()
      AND status != v_cancelled
    GROUP BY client_id
  ) agg ON agg.client_id = c.id
  WHERE c.user_id = auth.uid();

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
  v_produits_agg json;
  v_top5p        json;
  v_top5c        json;
  v_rpart        json;
  v_alerts       json;
BEGIN
  -- ── Date range ────────────────────────────────────────────────────────────
  IF p_month = 0 THEN
    v_start := make_date(p_year, 1, 1);
    v_end   := make_date(p_year, 12, 31);
  ELSE
    v_start := make_date(p_year, p_month, 1);
    v_end   := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;
  END IF;

  -- ── KPIs ventes (hors annulées) ───────────────────────────────────────────
  SELECT
    COALESCE(SUM(total),     0),
    COALESCE(SUM(paid),      0),
    COALESCE(SUM(remaining), 0),
    COUNT(*)
  INTO v_ca, v_enc, v_arec, v_nb
  FROM sales
  WHERE user_id = auth.uid()
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;  -- ← AJOUT : exclure les annulées

  -- ── KPIs achats (hors annulés) ────────────────────────────────────────────
  SELECT
    COALESCE(SUM(total),     0),
    COALESCE(SUM(paid),      0),
    COALESCE(SUM(remaining), 0)
  INTO v_ach, v_dec, v_apay
  FROM purchases
  WHERE user_id = auth.uid()
    AND date BETWEEN v_start AND v_end
    AND status != v_cancelled;  -- ← AJOUT : exclure les annulés

  -- ── Évolution des ventes (hors annulées) ──────────────────────────────────
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
      WHERE user_id = auth.uid()
        AND date BETWEEN v_start AND v_end
        AND status != v_cancelled  -- ← AJOUT
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
      WHERE user_id = auth.uid()
        AND date BETWEEN v_start AND v_end
        AND status != v_cancelled  -- ← AJOUT
      GROUP BY jour
    ) agg ON agg.jour = d;
  END IF;

  -- ── Produits : scan unique sale_items → top5 + répartition (hors annulées) ─
  SELECT COALESCE(json_agg(json_build_object('name', name, 'total', total)), '[]'::json)
  INTO v_produits_agg
  FROM (
    SELECT p.name, SUM(si.quantity * si.unit_price) AS total
    FROM sale_items si
    JOIN sales     s ON s.id = si.sale_id
    JOIN products  p ON p.id = si.product_id
    WHERE s.user_id = auth.uid()
      AND s.date BETWEEN v_start AND v_end
      AND s.status != v_cancelled  -- ← AJOUT
    GROUP BY p.id, p.name
    ORDER BY total DESC
    LIMIT 8
  ) t;

  -- top5Produits : 5 premiers éléments
  SELECT COALESCE(json_agg(elem), '[]'::json)
  INTO v_top5p
  FROM json_array_elements(v_produits_agg) WITH ORDINALITY AS t(elem, ord)
  WHERE ord <= 5;

  -- repartitionProduits : 8 éléments
  SELECT COALESCE(json_agg(json_build_object('name', elem->>'name', 'value', (elem->>'total')::numeric)), '[]'::json)
  INTO v_rpart
  FROM json_array_elements(v_produits_agg) AS elem;

  -- ── Top 5 clients (hors annulées) ─────────────────────────────────────────
  SELECT COALESCE(json_agg(json_build_object('name', name, 'total', total)), '[]'::json)
  INTO v_top5c
  FROM (
    SELECT c.name, SUM(s.total) AS total
    FROM sales   s
    JOIN clients c ON c.id = s.client_id
    WHERE s.user_id = auth.uid()
      AND s.date BETWEEN v_start AND v_end
      AND s.status != v_cancelled  -- ← AJOUT
    GROUP BY c.id, c.name
    ORDER BY total DESC
    LIMIT 5
  ) t;

  -- ── Alertes stock ─────────────────────────────────────────────────────────
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
  LEFT JOIN stock st ON st.product_id = p.id AND st.user_id = p.user_id
  WHERE p.user_id = auth.uid()
    AND (COALESCE(st.quantity, 0) <= 0 OR COALESCE(st.quantity, 0) <= p.stock_alert);

  -- ── Résultat final ────────────────────────────────────────────────────────
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
    'top5Produits',        v_top5p,
    'top5Clients',         v_top5c,
    'repartitionProduits', v_rpart,
    'stockAlerts',         v_alerts
  );
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats"("p_year" integer, "p_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_doc_sequence"("p_user_id" "uuid", "p_type" "text", "p_year" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_seq INTEGER;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO document_sequences (user_id, type, year, last_number)
  VALUES (p_user_id, p_type, p_year, 1)
  ON CONFLICT (user_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;
  RETURN v_seq;
END;
$$;


ALTER FUNCTION "public"."get_next_doc_sequence"("p_user_id" "uuid", "p_type" "text", "p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stock_alert_count"() RETURNS integer
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)::int
  FROM products p
  LEFT JOIN stock st ON st.product_id = p.id AND st.user_id = p.user_id
  WHERE p.user_id = auth.uid()
    AND (COALESCE(st.quantity, 0) = 0 OR COALESCE(st.quantity, 0) <= p.stock_alert);
$$;


ALTER FUNCTION "public"."get_stock_alert_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_supplier_monthly_stats"("p_supplier_id" "uuid", "p_year" integer, "p_month" integer) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cancelled  CONSTANT text := 'cancelled';
  v_start      date;
  v_end        date;
  v_result     json;
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
  WHERE user_id     = auth.uid()
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
    WHERE p.user_id = auth.uid()
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
    WHERE user_id = auth.uid()
      AND status != v_cancelled
    GROUP BY supplier_id
  ) agg ON agg.supplier_id = s.id
  WHERE s.user_id = auth.uid();

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
    WHERE user_id = auth.uid()
      AND status != 'cancelled'
    GROUP BY client_id
  ) agg ON agg.client_id = c.id
  WHERE c.user_id = auth.uid()
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
    WHERE user_id = auth.uid()
      AND status != 'cancelled'
    GROUP BY supplier_id
  ) agg ON agg.supplier_id = s.id
  WHERE s.user_id = auth.uid()
    AND COALESCE(agg.total_du, 0) > 0
    AND COALESCE(agg.has_unpaid, false) = true;
$$;


ALTER FUNCTION "public"."get_unpaid_suppliers_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regularize_user_invoices"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    r RECORD;
    v_new_ref TEXT;
BEGIN
    -- 1. MISE À JOUR des factures existantes
    -- On boucle sur les factures de l'utilisateur triées par date
    FOR r IN (
        SELECT id, 
               EXTRACT(YEAR FROM date)::INT as doc_year,
               ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM date) ORDER BY date, created_at) as new_seq
        FROM public.documents
        WHERE user_id = p_user_id AND type = 'invoice'
    ) LOOP
        v_new_ref := 'FAC-' || r.doc_year || '-' || LPAD(r.new_seq::TEXT, 3, '0');
        
        -- Mise à jour effective du numéro de facture
        UPDATE public.documents SET number = v_new_ref WHERE id = r.id;
    END LOOP;

    -- 2. MISE À JOUR du compteur global pour les prochaines factures
    -- On utilise INSERT ... ON CONFLICT pour écraser la valeur du compteur (last_number)
    INSERT INTO public.document_sequences (user_id, type, year, last_number)
    SELECT p_user_id, 'invoice', t.calc_year, MAX(t.new_seq)
    FROM (
        SELECT EXTRACT(YEAR FROM date)::INT as calc_year,
               ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM date) ORDER BY date, created_at) as new_seq
        FROM public.documents 
        WHERE user_id = p_user_id AND type = 'invoice'
    ) t
    GROUP BY t.calc_year
    ON CONFLICT (user_id, type, year) DO UPDATE SET last_number = EXCLUDED.last_number;

END;
$$;


ALTER FUNCTION "public"."regularize_user_invoices"("p_user_id" "uuid") OWNER TO "postgres";


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
    "methode_paiement" "public"."methode_paiement_type"
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
    "updated_at" timestamp with time zone DEFAULT "now"()
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
    "last_number" integer DEFAULT 0
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
    CONSTRAINT "products_type_check" CHECK (("type" = ANY (ARRAY['individual'::"text", 'pack'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "purchase_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "subtotal" numeric(12,2) GENERATED ALWAYS AS ((("quantity")::numeric * "unit_price")) STORED
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
    CONSTRAINT "sales_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'partial'::"text", 'unpaid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
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
    "methode_paiement" "public"."methode_paiement_type"
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
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."client_payments"
    ADD CONSTRAINT "client_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_items"
    ADD CONSTRAINT "document_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_sequences"
    ADD CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_sequences"
    ADD CONSTRAINT "document_sequences_user_id_type_year_key" UNIQUE ("user_id", "type", "year");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_user_id_reference_key" UNIQUE ("user_id", "reference");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_user_id_reference_key" UNIQUE ("user_id", "reference");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_user_id_name_key" UNIQUE ("user_id", "name");



CREATE INDEX "idx_client_pay_sale" ON "public"."client_payments" USING "btree" ("sale_id");



CREATE INDEX "idx_client_pay_user" ON "public"."client_payments" USING "btree" ("user_id");



CREATE INDEX "idx_clients_user" ON "public"."clients" USING "btree" ("user_id");



CREATE INDEX "idx_doc_items_doc" ON "public"."document_items" USING "btree" ("document_id");



CREATE UNIQUE INDEX "idx_document_sequences_user_type_year" ON "public"."document_sequences" USING "btree" ("user_id", "type", "year");



CREATE INDEX "idx_documents_client" ON "public"."documents" USING "btree" ("client_id");



CREATE INDEX "idx_documents_parent" ON "public"."documents" USING "btree" ("parent_id");



CREATE INDEX "idx_documents_payment" ON "public"."documents" USING "btree" ("payment_id");



CREATE INDEX "idx_documents_sale" ON "public"."documents" USING "btree" ("sale_id");



CREATE INDEX "idx_documents_type" ON "public"."documents" USING "btree" ("type");



CREATE INDEX "idx_documents_user" ON "public"."documents" USING "btree" ("user_id");



CREATE INDEX "idx_products_user" ON "public"."products" USING "btree" ("user_id");



CREATE INDEX "idx_purchase_items_purch" ON "public"."purchase_items" USING "btree" ("purchase_id");



CREATE INDEX "idx_purchases_date" ON "public"."purchases" USING "btree" ("date");



CREATE INDEX "idx_purchases_supplier" ON "public"."purchases" USING "btree" ("supplier_id");



CREATE INDEX "idx_purchases_user" ON "public"."purchases" USING "btree" ("user_id");



CREATE INDEX "idx_purchases_user_date" ON "public"."purchases" USING "btree" ("user_id", "date");



CREATE INDEX "idx_purchases_user_supplier" ON "public"."purchases" USING "btree" ("user_id", "supplier_id");



CREATE INDEX "idx_sale_items_product" ON "public"."sale_items" USING "btree" ("product_id");



CREATE INDEX "idx_sale_items_sale" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sale_items_sale_id" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sales_client" ON "public"."sales" USING "btree" ("client_id");



CREATE INDEX "idx_sales_date" ON "public"."sales" USING "btree" ("date");



CREATE INDEX "idx_sales_user" ON "public"."sales" USING "btree" ("user_id");



CREATE INDEX "idx_sales_user_client" ON "public"."sales" USING "btree" ("user_id", "client_id");



CREATE INDEX "idx_sales_user_client_date" ON "public"."sales" USING "btree" ("user_id", "client_id", "date");



CREATE INDEX "idx_sales_user_date" ON "public"."sales" USING "btree" ("user_id", "date");



CREATE INDEX "idx_stock_mov_product" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "idx_stock_mov_user" ON "public"."stock_movements" USING "btree" ("user_id");



CREATE INDEX "idx_stock_product" ON "public"."stock" USING "btree" ("product_id");



CREATE INDEX "idx_stock_product_user" ON "public"."stock" USING "btree" ("product_id", "user_id");



CREATE INDEX "idx_stock_user" ON "public"."stock" USING "btree" ("user_id");



CREATE INDEX "idx_supplier_pay_purch" ON "public"."supplier_payments" USING "btree" ("purchase_id");



CREATE INDEX "idx_supplier_pay_user" ON "public"."supplier_payments" USING "btree" ("user_id");



CREATE INDEX "idx_suppliers_user" ON "public"."suppliers" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_purchases_updated_at" BEFORE UPDATE ON "public"."purchases" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sales_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."client_payments"
    ADD CONSTRAINT "client_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_payments"
    ADD CONSTRAINT "client_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_items"
    ADD CONSTRAINT "document_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_items"
    ADD CONSTRAINT "document_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."document_sequences"
    ADD CONSTRAINT "document_sequences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."client_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."client_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_client_payments" ON "public"."client_payments" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_clients" ON "public"."clients" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_companies" ON "public"."companies" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_document_items" ON "public"."document_items" USING (("document_id" IN ( SELECT "documents"."id"
   FROM "public"."documents"
  WHERE ("documents"."user_id" = "auth"."uid"()))));



CREATE POLICY "user_document_sequences" ON "public"."document_sequences" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_documents" ON "public"."documents" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_products" ON "public"."products" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_purchase_items" ON "public"."purchase_items" USING (("purchase_id" IN ( SELECT "purchases"."id"
   FROM "public"."purchases"
  WHERE ("purchases"."user_id" = "auth"."uid"()))));



CREATE POLICY "user_purchases" ON "public"."purchases" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_sale_items" ON "public"."sale_items" USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."user_id" = "auth"."uid"()))));



CREATE POLICY "user_sales" ON "public"."sales" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_stock" ON "public"."stock" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_stock_movements" ON "public"."stock_movements" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_supplier_payments" ON "public"."supplier_payments" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_suppliers" ON "public"."suppliers" USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."cancel_transaction"("p_id" "uuid", "p_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_transaction"("p_id" "uuid", "p_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_transaction"("p_id" "uuid", "p_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invoice"("p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invoice"("p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invoice"("p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_note" "text", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_receipt"("p_payment_id" "uuid", "p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_receipt"("p_payment_id" "uuid", "p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_receipt"("p_payment_id" "uuid", "p_sale_id" "uuid", "p_client_id" "uuid", "p_date" "date", "p_total" numeric, "p_paid" numeric, "p_tva_rate" numeric, "p_tva_amount" numeric, "p_mode_paiement" "text", "p_items" "jsonb") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_next_doc_sequence"("p_user_id" "uuid", "p_type" "text", "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_doc_sequence"("p_user_id" "uuid", "p_type" "text", "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_doc_sequence"("p_user_id" "uuid", "p_type" "text", "p_year" integer) TO "service_role";



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



GRANT ALL ON FUNCTION "public"."regularize_user_invoices"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."regularize_user_invoices"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regularize_user_invoices"("p_user_id" "uuid") TO "service_role";



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































