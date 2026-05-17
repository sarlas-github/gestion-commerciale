# REGLES_METIER.md — Règles métier de l'application

Ce document décrit les règles métier de l'application de gestion commerciale. Il s'adresse aux développeurs qui rejoignent le projet : à la fin de la lecture, vous devez comprendre ce que fait le SaaS, pour qui, et comment chaque entité/flux/règle fonctionne. Les informations présentes ici peuvent être dupliquées dans d'autres fichiers — c'est intentionnel pour que ce document soit auto-suffisant.

---

## 1. Vue d'ensemble

**Pour qui** : TPE et PME marocaines — artisans, commerçants, grossistes, petits industriels.

**Ce que fait le SaaS** :
- Gérer un catalogue de produits avec niveaux de stock et alertes
- Enregistrer les achats fournisseurs (entrées de stock)
- Enregistrer les ventes clients (sorties de stock)
- Générer des documents commerciaux : factures, reçus, devis, bons de commande, bons de livraison
- Suivre les paiements reçus (clients) et versés (fournisseurs)
- Offrir un tableau de bord avec KPIs, alertes stock et graphiques mensuels
- Produire des relevés clients et fournisseurs

**Architecture** : multi-utilisateurs, isolation complète par `user_id` via RLS Supabase. Chaque utilisateur ne voit que ses propres données.

---

## 2. Modes d'exploitation

L'application supporte deux modes, configurés au niveau du profil (`companies.business_mode`).

### Mode Revente (`business_mode = 'revente'`)

Le cas standard : l'entreprise achète des produits finis et les revend.

- Tous les produits ont `nature = 'revente'`
- Flux : Achat fournisseur → stock → Vente client
- Pas de distinction entre types de produits

### Mode Production (`business_mode = 'production'`)

L'entreprise fabrique ses produits à partir de matières premières.

- Les produits ont deux natures : `'matiere_premiere'` (MP) et `'produit_fini'` (PF)
- **Achats** : limités aux matières premières (MP)
- **Ventes** : limitées aux produits finis (PF)
- **Transformation MP → PF** : déclarée manuellement via l'écran "Mouvements de stock" (consommation de MP = sortie manuelle, production de PF = entrée manuelle). Il n'y a pas de lien automatique entre les deux — l'application gère la traçabilité, pas la recette de fabrication.

---

## 3. Entités principales

| Entité | Rôle |
|---|---|
| `products` | Catalogue produits : prix d'achat/vente, unité, nb de pièces par unité (`pieces_count`), alerte de stock, nature |
| `clients` | Clients (acheteurs) : nom, adresse, ICE |
| `suppliers` | Fournisseurs : nom, adresse |
| `purchases` | En-tête d'un achat fournisseur : date, référence, total, paid, remaining, statut |
| `purchase_items` | Lignes d'un achat : produit, quantité, prix unitaire, pieces_count (snapshoté), subtotal |
| `sales` | En-tête d'une vente client : date, référence, total, paid, remaining, statut |
| `sale_items` | Lignes d'une vente : produit, quantité, prix unitaire, pieces_count (snapshoté), subtotal |
| `documents` | Documents commerciaux générés : facture (invoice), reçu (receipt), devis (quote), BC (purchase_order), BL (delivery_note). Contient les snapshots entreprise + client |
| `document_items` | Lignes d'un document |
| `client_payments` | Paiements reçus d'un client, liés à une vente |
| `supplier_payments` | Paiements versés à un fournisseur, liés à un achat |
| `stock` | Stock actuel : une ligne par produit, `quantity` = quantité en stock |
| `stock_movements` | Journal de tous les mouvements de stock avec snapshots avant/après |
| `document_sequences` | Compteurs auto-incrémentés par type de document et par année |
| `companies` | Paramètres de l'entreprise : nom, adresse, identifiants fiscaux, logo, couleur de marque, mode d'exploitation |

---

## 4. Flux métier principal

### Achat fournisseur
```
Création d'un achat
  → purchases + purchase_items (avec pieces_count snapshoté)
  → stock.quantity + quantité_achetée (pour chaque ligne)
  → stock_movements [type='in', stock_avant et stock_apres snapshotés]
  → supplier_payments (si acompte saisi à la création)
```

### Vente client
```
Création d'une vente
  → sales + sale_items (avec pieces_count snapshoté)
  → stock.quantity − quantité_vendue (pour chaque ligne)
  → stock_movements [type='out', stock_avant et stock_apres snapshotés]
  → documents [type='invoice', facture auto-générée avec snapshot entreprise + client]
  → client_payments (si acompte saisi à la création)
```

### Paiement client
```
Enregistrement d'un paiement
  → client_payments INSERT
  → sales.paid mis à jour (somme des paiements)
  → sales.status recalculé
  → documents [type='receipt', reçu de paiement avec snapshot entreprise + client]
```

### Paiement fournisseur
```
Enregistrement d'un paiement
  → supplier_payments INSERT
  → purchases.paid mis à jour
  → purchases.status recalculé
```

> **Règle absolue** : toute opération touchant plusieurs tables passe par une fonction PostgreSQL appelée via `supabase.rpc()`. Jamais d'`await` séquentiels pour des opérations liées. Un échec d'une étape entraîne le rollback complet.

Fonctions RPC existantes : `create_purchase`, `create_sale`, `create_client_payment`, `create_supplier_payment`, `cancel_transaction`.

---

## 5. Règles de calcul

### Colonnes générées (ne jamais insérer ces valeurs)
- `purchase_items.subtotal` = `quantity × unit_price` (colonne générée PostgreSQL)
- `sale_items.subtotal` = `quantity × unit_price` (colonne générée PostgreSQL)
- `purchases.remaining` = `total − paid` (colonne générée PostgreSQL)
- `sales.remaining` = `total − paid` (colonne générée PostgreSQL)

Tenter d'insérer une valeur dans ces colonnes provoque une erreur Supabase.

### Statut de paiement
| Condition | Statut |
|---|---|
| `paid = 0` | `'unpaid'` |
| `0 < paid < total` | `'partial'` |
| `paid = total` | `'paid'` |
| annulé manuellement | `'cancelled'` |

### Statut du stock d'un produit
| Condition | Statut |
|---|---|
| `quantity = 0` | `'rupture'` |
| `quantity ≤ stock_alert` | `'faible'` |
| `quantity > stock_alert` | `'ok'` |

---

## 6. Snapshot pieces_count

Chaque produit a un champ `pieces_count` : le nombre de pièces unitaires contenues dans une unité vendue (ex. : une boîte de 12 pièces → `pieces_count = 12`).

**Règle** : au moment de la création d'un achat ou d'une vente, `pieces_count` est copié (snapshoté) dans `purchase_items.pieces_count` et `sale_items.pieces_count`. Si le produit est modifié ultérieurement, les transactions historiques restent correctes.

**À l'édition** : utiliser le `pieces_count` snapshoté dans l'item, **jamais** la valeur live du produit (`i.pieces_count ?? i.products?.pieces_count ?? 1`).

---

## 7. Immutabilité des documents

Les documents générés (factures, reçus, devis, BC, BL) sont **immuables** : ils doivent afficher exactement les informations du moment de leur génération, même si l'entreprise ou le client modifie ses données plus tard.

### Snapshot à la génération

Lors de la création d'un document, tous les champs entreprise et client sont copiés dans la table `documents` :

```
Entreprise : company_name, company_address, company_phone, company_email,
             company_ice, company_if, company_rc, company_tp, company_rib,
             company_couleur_marque, company_logo_url

Client :     client_name, client_address, client_ice
```

### Règle d'affichage

```tsx
// ✅ CORRECT — snapshot figé
couleur_marque: existingDocument.company_couleur_marque ?? '#1e40af'

// ❌ INTERDIT — donnée live
couleur_marque: company?.couleur_marque ?? '#1e40af'
```

Toujours lire depuis `existingDocument.*`, jamais depuis les données live.

---

## 8. Numérotation des documents

Chaque type de document a sa propre séquence par année, gérée dans `document_sequences` :

| Type | Format |
|---|---|
| Facture (`invoice`) | `FAC-YYYY-NNN` |
| Reçu (`receipt`) | `REC-YYYY-NNN` |
| Devis (`quote`) | `DEV-YYYY-NNN` |
| Bon de commande (`purchase_order`) | `BC-YYYY-NNN` |
| Bon de livraison (`delivery_note`) | `BL-YYYY-NNN` |

**Règle absolue** : un numéro consommé n'est jamais réutilisé, même si la transaction est annulée. Une vente annulée conserve sa référence. Les séquences sont monotoniquement croissantes — aucun trou n'est comblé.

---

## 9. Règles d'annulation

L'annulation est gérée par la fonction PostgreSQL atomique `cancel_transaction(p_id uuid, p_type text)` (source de vérité : `supabase/functions/cancel_transaction.sql`).

### Conditions de blocage

| Condition | Achat | Vente |
|---|---|---|
| Déjà annulé (`status = 'cancelled'`) | ❌ bloqué | ❌ bloqué |
| Paiement enregistré (`paid > 0`) | ❌ bloqué | ❌ bloqué |
| Facture générée (`documents.type = 'invoice'`) | — (n/a) | ❌ bloqué |

Les mêmes contrôles sont appliqués côté UI (bouton désactivé + tooltip explicatif) et côté PostgreSQL (RAISE EXCEPTION dans la fonction).

### Effets d'une annulation
1. Statut → `'cancelled'`
2. Stock **inversé** atomiquement :
   - Achat annulé → stock soustrait (remet en état avant l'achat)
   - Vente annulée → stock réajouté (remet en état avant la vente)
3. Un `stock_movements` d'annulation est inséré avec `stock_avant` et `stock_apres` snapshotés

---

## 10. Traçabilité du stock

### Table `stock`

Source de vérité pour le stock actuel : `stock.quantity`. Une ligne par produit. Toutes les mutations (achats, ventes, ajustements, annulations) mettent à jour cette table.

### Table `stock_movements`

Journal d'audit de tous les mouvements. Chaque ligne contient :
- `type` : `'in'` (entrée) ou `'out'` (sortie)
- `quantity` : valeur signée (positive pour `in`, négative pour certains cas d'annulation)
- `stock_avant` : quantité en stock **avant** le mouvement (snapshot à l'insertion)
- `stock_apres` : quantité en stock **après** le mouvement (snapshot à l'insertion)
- `reference_type` + `reference_id` : lien vers `'purchase'`, `'sale'`, ou `'manual'`
- `note` : libellé libre (ex. : `"Annulation VTE-2026-001"`)

**Invariant** : `stock_avant + quantity = stock_apres` sur tout mouvement récent.

La dernière ligne d'un produit doit avoir `stock_apres` = valeur visible dans la page Produits (table `stock`).

> Les snapshots dans `stock_movements` sont pour l'audit et l'affichage uniquement. Ne pas recalculer le stock courant à partir des mouvements — utiliser `stock.quantity`.

---

## 11. Règles d'édition des formulaires

### Achat fournisseur

| Champ | Condition de blocage |
|---|---|
| Tout le formulaire | Annulé (`status = 'cancelled'`) |
| `unit_price`, `pieces_count` | Annulé |
| Bouton "Ajouter ligne" | Annulé |

Un achat peut être modifié librement tant qu'il n'est pas annulé. Les paiements fournisseurs n'entraînent pas de verrouillage de l'édition (pas de document officiel côté achat).

### Vente client

| Champ | Condition de blocage |
|---|---|
| Tout le formulaire | Annulé (`status = 'cancelled'`) |
| `unit_price`, `pieces_count` | Annulé OU facture générée OU paiement enregistré |
| Bouton "Ajouter ligne" | Annulé OU facture générée OU paiement enregistré |

Une vente est figée dès qu'une facture est générée ou qu'un paiement est enregistré — les montants ne doivent plus pouvoir changer.

---

## 12. Règles Supabase / RLS

- Chaque table a RLS activé : `ALTER TABLE xxx ENABLE ROW LEVEL SECURITY`
- Chaque table a une policy `FOR ALL USING (user_id = auth.uid())`
- Dans le code React : toujours passer explicitement `user_id: user!.id` dans les INSERT (RLS ne l'injecte pas automatiquement)
- Les SELECT/UPDATE/DELETE sont filtrés automatiquement par RLS

---

## 13. Filtrage par période (optimisation egress)

Pour les tables volumineuses (ventes, achats, paiements, mouvements de stock), le filtrage par mois/année se fait **côté serveur** dans les requêtes Supabase :

- **Par défaut** : mois en cours
- **"Tous les mois"** : interdit sur les tables transactionnelles pour éviter de charger des milliers de lignes côté client
- **Exception** : les rapports et agrégations (dashboard, état clients/fournisseurs) peuvent utiliser "tous les mois" car les données sont déjà agrégées par le serveur

Les catalogues (clients, fournisseurs, produits) sont chargés en totalité au démarrage pour permettre la recherche instantanée.
