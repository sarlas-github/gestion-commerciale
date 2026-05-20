-- Update create_product to handle initial stock directly in the RPC

DROP FUNCTION IF EXISTS "public"."create_product"("p_name" "text", "p_type" "text", "p_nature" "text", "p_pieces_count" integer, "p_stock_alert" integer);

CREATE OR REPLACE FUNCTION "public"."create_product"(
  "p_name" "text",
  "p_type" "text",
  "p_nature" "text",
  "p_pieces_count" integer DEFAULT 1,
  "p_stock_alert" integer DEFAULT 0,
  "p_initial_stock" integer DEFAULT 0
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_company_id uuid := get_my_company_id();
  v_product_id uuid;
  v_stock_id   uuid;
BEGIN
  INSERT INTO products (user_id, company_id, name, type, nature, pieces_count, stock_alert)
  VALUES (v_uid, v_company_id, p_name, p_type, p_nature, p_pieces_count, p_stock_alert)
  RETURNING id INTO v_product_id;

  IF p_initial_stock > 0 THEN
    INSERT INTO stock (user_id, company_id, product_id, quantity)
    VALUES (v_uid, v_company_id, v_product_id, p_initial_stock)
    RETURNING id INTO v_stock_id;

    INSERT INTO stock_movements (user_id, company_id, product_id, type, quantity, reference_type, note, date, stock_avant, stock_apres)
    VALUES (v_uid, v_company_id, v_product_id, 'in', p_initial_stock, 'manual', 'Stock initial', CURRENT_DATE, 0, p_initial_stock);
  ELSE
    INSERT INTO stock (user_id, company_id, product_id, quantity)
    VALUES (v_uid, v_company_id, v_product_id, 0);
  END IF;

  RETURN v_product_id;
END;
$$;

ALTER FUNCTION "public"."create_product"("p_name" "text", "p_type" "text", "p_nature" "text", "p_pieces_count" integer, "p_stock_alert" integer, "p_initial_stock" integer) OWNER TO "postgres";
