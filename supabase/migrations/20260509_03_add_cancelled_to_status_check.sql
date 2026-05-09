-- ══════════════════════════════════════════════════════════════════════════════
-- Migration : Ajouter 'cancelled' à la contrainte CHECK du champ status
-- Tables : purchases, sales
-- ══════════════════════════════════════════════════════════════════════════════

-- purchases
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_status_check;
ALTER TABLE purchases ADD CONSTRAINT purchases_status_check
  CHECK (status IN ('paid', 'partial', 'unpaid', 'cancelled'));

-- sales
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE sales ADD CONSTRAINT sales_status_check
  CHECK (status IN ('paid', 'partial', 'unpaid', 'cancelled'));
