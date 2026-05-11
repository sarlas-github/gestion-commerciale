-- ══════════════════════════════════════════════════════════════════════════════
-- Migration : Annulation sécurisée des achats et ventes
-- Crée la fonction cancel_transaction() + met à jour get_dashboard_stats()
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ajouter la valeur 'annulé' au type PaymentStatus (si c'est un ENUM)
--    En Supabase, status est stocké en TEXT avec contrainte CHECK, donc on
--    doit mettre à jour la contrainte CHECK existante si elle existe,
--    ou simplement documenter que le champ accepte 'annulé'.
--    NB : Dans ce projet, status est TEXT sans enum natif → pas de migration
--    de type nécessaire, la valeur sera simplement insérée.

-- 2. Fonction atomique d'annulation
-- ──────────────────────────────────────────────────────────────────────────────
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

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Mise à jour de get_dashboard_stats() pour exclure les transactions annulées
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_year int, p_month int)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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
