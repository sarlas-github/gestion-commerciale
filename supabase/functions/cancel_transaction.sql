-- Dernière version déployée : 20260509_01_cancel_transaction.sql
-- Ce fichier = source de vérité. Toute modif passe par un script dans migrations/
-- puis on met à jour ce fichier en même temps.

-- Annulation sécurisée et atomique d'un achat ou d'une vente.
-- Vérifie le stock (pour les achats), met le statut à 'annulé',
-- inverse le mouvement de stock, et insère un stock_movement d'annulation.

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
  v_item       record;
  v_stock_qty  numeric;
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
    SELECT status, reference, date
      INTO v_status, v_reference, v_date
      FROM purchases
     WHERE id = p_id AND user_id = v_uid
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Achat introuvable';
    END IF;
  ELSE
    SELECT status, reference, date
      INTO v_status, v_reference, v_date
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

  -- ── 4. Pré-validation stock (ACHAT uniquement) ────────────────────────────
  -- Un achat a augmenté le stock ; l'annuler va soustraire les quantités.
  -- On vérifie que chaque produit a suffisamment de stock.
  IF p_type = 'purchase' THEN
    FOR v_item IN
      SELECT pi.product_id, pi.quantity
        FROM purchase_items pi
       WHERE pi.purchase_id = p_id
    LOOP
      SELECT COALESCE(quantity, 0)
        INTO v_stock_qty
        FROM stock
       WHERE product_id = v_item.product_id
         AND user_id    = v_uid;

      IF v_stock_qty - v_item.quantity < 0 THEN
        RAISE EXCEPTION
          'Stock insuffisant pour annuler cet achat : le produit "%" a un stock de % unité(s), mais l''annulation nécessite de retirer % unité(s). Des produits de cet achat ont peut-être déjà été vendus.',
          (SELECT name FROM products WHERE id = v_item.product_id),
          v_stock_qty,
          v_item.quantity;
      END IF;
    END LOOP;
  END IF;

  -- ── 5. Mise à jour du statut ───────────────────────────────────────────────
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
      UPDATE stock
         SET quantity   = quantity - v_item.quantity,
             updated_at = now()
       WHERE product_id = v_item.product_id
         AND user_id    = v_uid;

      INSERT INTO stock_movements (
        user_id, product_id, type, quantity,
        reference_type, reference_id,
        note, date
      ) VALUES (
        v_uid,
        v_item.product_id,
        'out',
        -v_item.quantity,
        'purchase',
        p_id,
        'Annulation ' || COALESCE(v_reference, 'achat'),
        COALESCE(v_date, CURRENT_DATE)
      );
    END LOOP;

  ELSE
    -- Vente annulée → réajoute au stock (inverse du -)
    FOR v_item IN
      SELECT si.product_id, si.quantity
        FROM sale_items si
       WHERE si.sale_id = p_id
    LOOP
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
        note, date
      ) VALUES (
        v_uid,
        v_item.product_id,
        'in',
        v_item.quantity,
        'sale',
        p_id,
        'Annulation ' || COALESCE(v_reference, 'vente'),
        COALESCE(v_date, CURRENT_DATE)
      );
    END LOOP;
  END IF;

END;
$$;
