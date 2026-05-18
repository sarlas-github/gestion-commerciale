-- Index partiels sur les lignes actives (status != 'cancelled')
-- Optimise toutes les requêtes du dashboard et des rapports
-- qui filtrent systématiquement par (user_id, date, status != 'cancelled')

-- Remplace les index généraux (user_id, date) pour les requêtes filtrées sur status
-- Le planificateur PostgreSQL choisira l'index partiel quand la condition WHERE est présente

CREATE INDEX IF NOT EXISTS idx_sales_user_date_active
  ON sales (user_id, date)
  WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_purchases_user_date_active
  ON purchases (user_id, date)
  WHERE status != 'cancelled';

-- Index partiel sur sale_items via la jointure avec sales
-- Utile pour les agrégations top5 produits / répartition
CREATE INDEX IF NOT EXISTS idx_sale_items_sale
  ON sale_items (sale_id)
  WHERE sale_id IS NOT NULL;
