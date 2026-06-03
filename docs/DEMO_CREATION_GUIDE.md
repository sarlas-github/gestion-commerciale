# Guide de création d'une nouvelle fonction de démo

Ce guide résume toutes les règles à respecter pour créer une nouvelle variante `create_app_user_demo_<suffixe>`.  
Référence actuelle : `create_app_user_demo_revente` (IT) et `create_app_user_demo_fruits_legumes`.

---

## 1. Nommage et fichiers à créer

| Fichier | Chemin |
|---|---|
| Migration SQL | `supabase/migrations/YYYYMMDDHHMMSS_OBJETS_create_app_user_demo_<suffixe>.sql` |
| Source de vérité | `supabase/functions/create_app_user_demo_<suffixe>.sql` (copie identique de la migration) |

Règle : après chaque modification, mettre à jour `supabase/functions/` en même temps que la migration.

---

## 2. Structure de la fonction

```sql
CREATE OR REPLACE FUNCTION public.create_app_user_demo_<suffixe>(
    p_email        text,
    p_password     text DEFAULT 'Démo@123',
    p_company_name text DEFAULT 'Ma Société SARL'
)
RETURNS TABLE(out_user_id uuid, out_company_id uuid)
```

### Étapes internes (ordre obligatoire)

1. `create_app_user(...)` → crée le user + la company
2. `UPDATE companies` → patch nom, adresse, ICE, etc.
3. Cleanup idempotent (DELETE dans l'ordre FK inversé)
4. Créer les produits + initialiser le stock à 0
5. Créer les fournisseurs
6. Créer les clients
7. Créer les achats (avec stock_movements)
8. Créer les ventes + paiements + factures + reçus
9. Ajustements de stock finaux (rupture/faible/ok)

---

## 3. Règle absolue : marge brute positive

### Le problème

Le dashboard affiche `Marge = CA Ventes - Total Achats` **pour le mois courant uniquement**.  
Si les achats du mois courant > CA ventes du mois courant → marge négative (mauvaise démo).

### La solution éprouvée

Différencier les quantités par mois dans la boucle achats :

```sql
v_qty := CASE
    WHEN v_i <= 10 THEN 150 + (v_i + v_j) % 5 * 20   -- mois précédent : 150–230 unités
    ELSE                  20 + (v_i + v_j) % 4 * 10   -- mois courant   : 20–50 unités
END;
```

- **Mois précédent** (i ≤ 10) : grandes quantités → constitution du stock
- **Mois courant** (i > 10) : petites quantités → Total Achats faible
- **Ventes** : quantités modérées → le stock existant évite tout clamp

### Vérification rapide avant de finir

Estimer :
- `Total Achats mois courant` = (nb_achats_non_annulés × avg_items × avg_qty_courante × avg_prix_achat)
- `CA Ventes mois courant` = (nb_ventes_non_annulées × avg_items × avg_qty × avg_prix_vente)
- `CA Ventes > Total Achats` ? Si non → réduire `qty_courante` ou augmenter `qty_ventes`

Avec 10 achats courants et 15 ventes courantes :
- Achats : 9 non-annulés × 2 items × qty_c × prix_achat
- Ventes : 14 non-annulés × 2 items × qty_v × prix_vente

Ratio minimal requis : `qty_v × prix_vente > (9/14) × qty_c × prix_achat`

---

## 4. Règle : statuts stock diversifiés sur la page 1

### Pourquoi c'est important

La page stock trie par `created_at DESC` (requête Supabase) puis `updated_at DESC` (TanStack Table).  
Comme tous les produits sont insérés dans la même transaction, ils ont le même `created_at/updated_at`.  
→ L'ordre effectif = **ordre d'insertion inversé** : produit 20 en ligne 1, produit 11 en ligne 10.

### Page size = 10 → produits 20 à 11 sur la page 1

Répartition cible (à ajuster selon les produits du secteur) :

| Position | Produit (index) | Statut voulu |
|---|---|---|
| 1 | 20 | 🔴 Rupture |
| 2 | 19 | 🟢 Ok |
| 3 | 18 | 🟡 Faible |
| 4 | 17 | 🟢 Ok (forcé) |
| 5 | 16 | 🟢 Ok (forcé) |
| 6 | 15 | 🔴 Rupture |
| 7 | 14 | 🟢 Ok |
| 8 | 13 | 🟡 Faible |
| 9 | 12 | 🟢 Ok |
| 10 | 11 | 🟢 Ok |

### Implémentation (étape 9 de la fonction)

```sql
-- Produit 20 → rupture
v_target := 0;
IF v_stock_current[20] != v_target THEN ... END IF;

-- Produit 18 → faible (valeur entre 1 et stock_alert[18]-1)
v_target := 3;
IF v_stock_current[18] != v_target THEN ... END IF;

-- Produit 17 → ok (forcer à un niveau > stock_alert[17])
v_target := 80;
IF v_stock_current[17] != v_target THEN ... END IF;

-- Produit 16 → ok (forcer à un niveau > stock_alert[16])
v_target := 50;
IF v_stock_current[16] != v_target THEN ... END IF;

-- Produit 15 → rupture
v_target := 0;
IF v_stock_current[15] != v_target THEN ... END IF;

-- Produit 13 → faible (valeur entre 1 et stock_alert[13]-1)
v_target := 5;
IF v_stock_current[13] != v_target THEN ... END IF;
```

Adapter `v_target` aux `stock_alert` choisis pour chaque produit :
- **rupture** : `v_target = 0`
- **faible** : `v_target` entre 1 et `stock_alert - 1`
- **ok (forcé)** : `v_target > stock_alert`

---

## 5. Règle : aucune date de transaction dans le futur

### Le problème

La formule de date utilise `date_trunc('month', current_date) + v_day days`.  
`date_trunc` retourne le **1er du mois**. Ajouter `n` jours donne le **(1+n)ème** du mois.

Exemple : si aujourd'hui = 3 juin et `v_day = 3` → date = June 1 + 3 jours = **4 juin** (futur ❌)

Si un utilisateur réel crée une transaction le 3 juin, elle apparaît **avant** les données démo dans les listes triées par date → incohérent.

### La règle

Toute transaction du mois courant (`v_month_offset = 0`) doit avoir une date **strictement antérieure à aujourd'hui** (= max `current_date - 1`).

### Implémentation obligatoire

Après le calcul de `v_date`, ajouter ce bloc pour **chaque boucle** (achats et ventes) :

```sql
v_date := (date_trunc('month', current_date)
           - (v_month_offset || ' months')::interval
           + (v_day          || ' days')::interval)::date;
IF v_month_offset = 0 THEN
    v_date := LEAST(v_date, (current_date - 1));
END IF;
```

Cela clamp automatiquement toutes les dates du mois courant à hier au maximum.  
Exemple : le 3 juin → toutes les transactions du mois courant sont au max le 2 juin.  
Le 15 juin → toutes les transactions du mois courant sont au max le 14 juin.

---

## 7. Données à adapter par secteur

### Règle de nommage des produits

**Ne jamais inclure l'unité dans le nom du produit.**  
L'unité (kg, litre, botte, unité…) appartient à la description ou à un champ dédié, pas au nom.

| ❌ À éviter | ✅ Correct |
|---|---|
| `'Tomates (kg)'` | `'Tomates'` |
| `'Lait (litre)'` | `'Lait'` |
| `'Laitue (unité)'` | `'Laitue'` |

Si des noms avec unité ont été créés par erreur, utiliser le script de nettoyage :  
`supabase/migrations/20260603140000_OBJETS_cleanup_product_names_kg.sql`

---

| Élément | Ce qu'il faut changer |
|---|---|
| `v_product_names` | Noms des 20 produits du secteur (sans unité) |
| `v_product_achat` | Prix d'achat (MAD) — 20 valeurs |
| `v_product_vente` | Prix de vente (MAD) — 20 valeurs |
| `v_product_types` | `'individual'` ou `'pack'` |
| `v_product_pieces` | Nb pièces par unité (1 si individual) |
| `v_stock_alerts` | Seuils d'alerte — 20 valeurs |
| `v_supplier_names` | 10 fournisseurs du secteur |
| `v_client_names` | 15 clients du secteur |
| Company (`UPDATE companies`) | Nom, adresse, contacts représentatifs |
| `p_company_name DEFAULT` | Nom d'exemple dans la signature |

---

## 8. Déploiement — étape critique

Les fichiers SQL créés localement **ne s'appliquent pas automatiquement à Supabase**.

### Procédure obligatoire après chaque création/modification

1. Ouvrir **Supabase Dashboard → SQL Editor**
2. Coller et exécuter **entièrement** le contenu du fichier migration
3. Vérifier que la fonction s'est créée sans erreur
4. Tester avec un email dédié :
   ```sql
   SELECT * FROM public.create_app_user_demo_<suffixe>('test@demo.ma');
   ```
5. Ouvrir l'application avec cet email et vérifier :
   - Dashboard : Marge brute > 0, Trésorerie cohérente
   - Page Stock : statuts rupture/faible/ok visibles sur la page 1
   - Factures : documents générés avec les bonnes infos entreprise

### Si on modifie une fonction déjà déployée

- Créer une **nouvelle migration** (nouveau timestamp)  
- La coller dans Supabase SQL Editor (`CREATE OR REPLACE` est idempotent)
- Mettre à jour `supabase/functions/<nom_fonction>.sql`
- Relancer la fonction avec un email de test différent si l'ancien utilisateur doit garder ses données

---

## 9. Checklist finale avant de considérer la fonction terminée

```
□ Les 20 produits ont des prix achat/vente cohérents avec le secteur
□ v_stock_alerts dimensionnés pour le secteur (volumes réalistes)
□ CASE WHEN v_i <= 10 présent dans la boucle achats
□ Estimation marge mois courant vérifiée > 0 sur papier
□ 6 ajustements de stock couvrent les positions 20, 18, 17, 16, 15, 13
□ LEAST(v_date, current_date - 1) présent dans les boucles achats ET ventes (mois courant)
□ Les seuils faible/ok/rupture sont cohérents avec v_stock_alerts
□ Migration déployée dans Supabase SQL Editor
□ Test avec email dédié réalisé
□ Dashboard vérifié (marge positive, valeurs réalistes)
□ Page stock page 1 vérifiée (3 statuts différents visibles)
□ supabase/functions/<nom>.sql mis à jour
```
