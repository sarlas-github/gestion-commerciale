# Checklist de validation — Migration Multi-Tenant + Refactor Atomique

Migrations concernées (à déployer dans cet ordre dans Supabase SQL Editor) :
1. `17-05-2026_03_multi_tenant_schema.sql`
2. `17-05-2026_04_multi_tenant_rls.sql`
3. `17-05-2026_05_multi_tenant_functions.sql`
4. `18-05-2026_01_atomic_transactions.sql`
5. `18-05-2026_02_payment_functions.sql`
6. `18-05-2026_03_product_stock_functions.sql`

---

## 0 — Déploiement SQL

- [ ] Migration 1 exécutée sans erreur (`17-05-2026_03_multi_tenant_schema.sql`)
- [ ] Migration 2 exécutée sans erreur (`17-05-2026_04_multi_tenant_rls.sql`)
- [ ] Migration 3 exécutée sans erreur (`17-05-2026_05_multi_tenant_functions.sql`)
- [ ] Migration 4 exécutée sans erreur (`18-05-2026_01_atomic_transactions.sql`)
- [ ] Migration 5 exécutée sans erreur (`18-05-2026_02_payment_functions.sql`)
- [ ] Migration 6 exécutée sans erreur (`18-05-2026_03_product_stock_functions.sql`)

---

## 1 — SQL : intégrité des données

### 1.1 — Aucun enregistrement sans company_id

Coller dans SQL Editor :

```sql
SELECT 'clients'             AS t, COUNT(*) FROM clients             WHERE company_id IS NULL
UNION ALL
SELECT 'suppliers',                COUNT(*) FROM suppliers               WHERE company_id IS NULL
UNION ALL
SELECT 'products',                 COUNT(*) FROM products                WHERE company_id IS NULL
UNION ALL
SELECT 'sales',                    COUNT(*) FROM sales                   WHERE company_id IS NULL
UNION ALL
SELECT 'purchases',                COUNT(*) FROM purchases               WHERE company_id IS NULL
UNION ALL
SELECT 'stock',                    COUNT(*) FROM stock                   WHERE company_id IS NULL
UNION ALL
SELECT 'stock_movements',          COUNT(*) FROM stock_movements         WHERE company_id IS NULL
UNION ALL
SELECT 'client_payments',          COUNT(*) FROM client_payments         WHERE company_id IS NULL
UNION ALL
SELECT 'supplier_payments',        COUNT(*) FROM supplier_payments       WHERE company_id IS NULL
UNION ALL
SELECT 'documents',                COUNT(*) FROM documents               WHERE company_id IS NULL
UNION ALL
SELECT 'document_sequences',       COUNT(*) FROM document_sequences      WHERE company_id IS NULL;
```

- [ ] Toutes les valeurs retournées sont **0**

### 1.2 — Chaque utilisateur existant est dans company_members

```sql
SELECT co.user_id, co.name, cm.id AS member_id
FROM companies co
LEFT JOIN company_members cm ON cm.company_id = co.id AND cm.user_id = co.user_id
WHERE cm.id IS NULL;
```

- [ ] **0 ligne** retournée

### 1.3 — RPC create_product

```sql
SELECT create_product('Test Audit', 'produit', 'neuf', 1, 5);
```

```sql
-- Remplacer <uuid> par l'UUID retourné ci-dessus
SELECT p.id, p.name, s.quantity
FROM products p JOIN stock s ON s.product_id = p.id
WHERE p.name = 'Test Audit';
```

- [ ] La fonction retourne un UUID
- [ ] La ligne produit existe avec `quantity = 0`

### 1.4 — RPC adjust_stock

```sql
-- Récupérer les IDs (remplacer dans le SELECT suivant)
SELECT p.id AS product_id, s.id AS stock_id
FROM products p JOIN stock s ON s.product_id = p.id
WHERE p.name = 'Test Audit';
```

```sql
-- Remplacer <stock_id> et <product_id>
SELECT adjust_stock('<stock_id>', '<product_id>', 'in', 10, 'Test audit', CURRENT_DATE);
```

```sql
SELECT quantity FROM stock WHERE product_id = '<product_id>';
SELECT type, quantity, stock_avant, stock_apres
FROM stock_movements WHERE product_id = '<product_id>'
ORDER BY created_at DESC LIMIT 1;
```

- [ ] `quantity = 10` dans stock
- [ ] Mouvement : `type='in'`, `quantity=10`, `stock_avant=0`, `stock_apres=10`

### 1.5 — RPC create_client_payment

```sql
-- Trouver une vente non soldée
SELECT id, total, paid, status FROM sales WHERE status != 'paid' LIMIT 1;
```

```sql
-- Remplacer <sale_id>
SELECT create_client_payment('<sale_id>', CURRENT_DATE, 100, 'test audit', 'virement');
```

```sql
SELECT paid, status FROM sales WHERE id = '<sale_id>';
```

- [ ] `paid` augmenté de 100
- [ ] `status` recalculé (`partial` ou `paid` selon le total)

### 1.6 — RPC create_supplier_payment

```sql
SELECT id, total, paid, status FROM purchases WHERE status != 'paid' LIMIT 1;
```

```sql
SELECT create_supplier_payment('<purchase_id>', CURRENT_DATE, 100, 'test audit', 'virement');
```

```sql
SELECT paid, status FROM purchases WHERE id = '<purchase_id>';
```

- [ ] `paid` augmenté de 100
- [ ] `status` recalculé

### 1.7 — RLS isolation (critique)

```sql
-- Exécuter en tant qu'utilisateur connecté (pas service_role)
SELECT get_my_company_id();
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM products;
```

- [ ] `get_my_company_id()` retourne un UUID non-null
- [ ] Les SELECT ne retournent que les données de sa propre entreprise

---

## 2 — Tests automatiques (terminal)

```bash
npm run audit:types    # Zéro erreur TypeScript
npm run audit:atomic   # Zéro mutation non-atomique
```

- [ ] `audit:types` — exit 0, aucune erreur
- [ ] `audit:atomic` — "✅ aucune mutation non-atomique détectée"

---

## 3 — Tests fonctionnels UI

### 3.1 — Produits

- [ ] Créer un produit → apparaît dans la liste, stock = 0
- [ ] Créer un produit avec le même nom → message d'erreur unicité
- [ ] Ajuster le stock (+) → quantité mise à jour, mouvement visible dans l'historique
- [ ] Ajuster le stock (−) → quantité mise à jour, badge alerte si sous le seuil
- [ ] Modifier un produit → modifications persistées
- [ ] Supprimer un produit sans mouvements → supprimé
- [ ] Supprimer un produit avec mouvements → message d'erreur de protection

### 3.2 — Clients

- [ ] Créer un client → apparaît dans la liste
- [ ] Créer un client avec le même nom → erreur unicité
- [ ] Ouvrir la fiche client → ventes et paiements chargés
- [ ] Ajouter un paiement depuis la fiche client → toast "Paiement enregistré", statut de la vente mis à jour, total payé recalculé
- [ ] Paiement qui solde la vente → statut passe à "payé"

### 3.3 — Fournisseurs

- [ ] Créer un fournisseur → apparaît dans la liste
- [ ] Créer un fournisseur avec le même nom → erreur unicité
- [ ] Ouvrir la fiche fournisseur → achats et paiements chargés
- [ ] Ajouter un paiement depuis la fiche fournisseur → statut de l'achat mis à jour

### 3.4 — Ventes

- [ ] Créer une vente avec paiement partiel → stock diminué, mouvement créé, statut "partiel"
- [ ] Créer une vente entièrement soldée → statut "payé"
- [ ] Modifier une vente → stock re-ajusté (delta), mouvements mis à jour
- [ ] Supprimer une vente → supprimée (stock non restitué, comportement normal)
- [ ] Annuler une vente → stock restitué, mouvement "retour", statut "annulé"

### 3.5 — Achats

- [ ] Créer un achat avec paiement partiel → stock augmenté, mouvement créé, statut "partiel"
- [ ] Créer un achat entièrement soldé → statut "payé"
- [ ] Modifier un achat → stock re-ajusté
- [ ] Annuler un achat → stock restitué, statut "annulé"

### 3.6 — Page Paiements clients

- [ ] Liste filtrée par mois courant → données du mois uniquement
- [ ] Ajouter un paiement → apparaît dans la liste, statut de la vente mis à jour

### 3.7 — Page Paiements fournisseurs

- [ ] Liste filtrée par mois courant → données du mois uniquement
- [ ] Ajouter un paiement → apparaît dans la liste, statut de l'achat mis à jour

### 3.8 — Dashboard

- [ ] Chiffres cohérents avec les données saisies
- [ ] Après création d'une vente → stats rafraîchies
- [ ] Badge "impayés clients" dans la sidebar → correspond au nombre réel

### 3.9 — Documents (factures / reçus)

- [ ] Générer une facture → PDF généré sans erreur, données entreprise présentes
- [ ] Ouvrir une facture existante → affiche les données snapshotées au moment de la création
- [ ] Modifier les infos entreprise → rouvrir une ancienne facture → données **inchangées**

---

## 4 — Test multi-tenant (si 2 comptes disponibles)

- [ ] Compte A : créer un client "Client Exclusif A"
- [ ] Se connecter en Compte B
- [ ] "Client Exclusif A" n'apparaît **pas** dans la liste clients de B
- [ ] `SELECT * FROM clients` en SQL Editor en tant que B ne retourne pas les données de A

---

## Nettoyage après tests

```sql
-- Supprimer le produit de test créé en 1.3
DELETE FROM products WHERE name = 'Test Audit';
```

- [ ] Produit "Test Audit" supprimé
