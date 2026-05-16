-- Mise à jour cancel_transaction : ajoute stock_avant et stock_apres
-- dans les mouvements compensatoires générés lors d'une annulation.

CREATE OR REPLACE FUNCTION cancel_transaction(
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
  v_reference  text;
  v_date       date;
  v_paid       numeric;
  v_item       record;
  v_status     text;
  v_stock_avant integer;
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
     WHERE id      = p_id
       AND user_id = v_uid;
  ELSE
    UPDATE sales
       SET status     = v_cancelled,
           updated_at = now()
     WHERE id      = p_id
       AND user_id = v_uid;
  END IF;

  -- ── 6. Inversion du stock + mouvement d'annulation ────────────────────────
  IF p_type = 'purchase' THEN
    -- Achat annulé → soustrait du stock (inverse du +)
    FOR v_item IN
      SELECT pi.product_id, pi.quantity
        FROM purchase_items pi
       WHERE pi.purchase_id = p_id
    LOOP
      -- Snapshot stock avant
      SELECT COALESCE(quantity, 0) INTO v_stock_avant
        FROM stock
       WHERE product_id = v_item.product_id AND user_id = v_uid;

      UPDATE stock
         SET quantity   = quantity - v_item.quantity,
             updated_at = now()
       WHERE product_id = v_item.product_id
         AND user_id    = v_uid;

      INSERT INTO stock_movements (
        user_id, product_id, type, quantity,
        reference_type, reference_id,
        note, date,
        stock_avant, stock_apres
      ) VALUES (
        v_uid,
        v_item.product_id,
        'out',
        -v_item.quantity,
        'purchase',
        p_id,
        'Annulation ' || COALESCE(v_reference, 'achat'),
        COALESCE(v_date, CURRENT_DATE),
        v_stock_avant,
        v_stock_avant - v_item.quantity
      );
    END LOOP;

  ELSE
    -- Vente annulée → réajoute au stock (inverse du -)
    FOR v_item IN
      SELECT si.product_id, si.quantity
        FROM sale_items si
       WHERE si.sale_id = p_id
    LOOP
      -- Snapshot stock avant (0 si pas de ligne stock existante)
      SELECT COALESCE(quantity, 0) INTO v_stock_avant
        FROM stock
       WHERE product_id = v_item.product_id AND user_id = v_uid;

      -- Upsert stock : si la ligne n'existe pas (vente sans stock préalable)
      INSERT INTO stock (user_id, product_id, quantity)
        VALUES (v_uid, v_item.product_id, v_item.quantity)
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET
        quantity   = stock.quantity + v_item.quantity,
        updated_at = now();

      INSERT INTO stock_movements (
        user_id, product_id, type, quantity,
        reference_type, reference_id,
        note, date,
        stock_avant, stock_apres
      ) VALUES (
        v_uid,
        v_item.product_id,
        'in',
        v_item.quantity,
        'sale',
        p_id,
        'Annulation ' || COALESCE(v_reference, 'vente'),
        COALESCE(v_date, CURRENT_DATE),
        v_stock_avant,
        v_stock_avant + v_item.quantity
      );
    END LOOP;
  END IF;

END;
$$;
