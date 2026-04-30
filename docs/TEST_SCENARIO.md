# Plan de Test & Validation des Calculs

Ce document vous servira de guide étape par étape pour saisir manuellement un scénario de test précis dans l'application. En suivant ces étapes, vous pourrez valider immédiatement si tous vos tableaux de bord, états spécifiques et gestions de stock renvoient les valeurs mathématiques exactes attendues.

---

## Étape 1 : Saisie du Catalogue (Données de Base)

Allez dans chaque section respective et créez les éléments suivants :

### Produits
1. **Produit A** : `PC Portable Dell` (Type: Individuel, Pièces: 1)
2. **Produit B** : `Pack Bureau (Écran + Clavier + Souris)` (Type: Pack, Pièces: 3)

### Fournisseurs
1. **Fournisseur A** : `Fournisseur GlobalTech`
2. **Fournisseur B** : `Grossiste MegaStore`

### Clients
1. **Client X** : `Entreprise Alpha`
2. **Client Y** : `Boutique Beta`

---

## Étape 2 : Saisie des Achats (Génère du Stock et des Dépenses)

Saisissez exactement ces deux achats depuis la page **Achats > Nouvel Achat**.

### Achat 1 (Totalement payé)
- **Fournisseur** : `Fournisseur GlobalTech`
- **Date** : 01/05/2026
- **Ligne Produit** : 10 `PC Portable Dell` à 5 000 MAD l'unité.
- **Paiement** : Ajoutez un paiement de **50 000 MAD**.
> **Vérification immédiate :** L'achat doit s'afficher avec un Total de 50 000 MAD, un Reste de 0 MAD, et le statut 🟢 **Payé**.

### Achat 2 (Partiellement payé)
- **Fournisseur** : `Grossiste MegaStore`
- **Date** : 02/05/2026
- **Ligne Produit** : 10 `Pack Bureau (Écran + Clavier + Souris)` à 300 MAD l'unité.
- **Paiement** : Ajoutez un paiement de **1 000 MAD**.
> **Vérification immédiate :** L'achat doit s'afficher avec un Total de 3 000 MAD, un Reste de 2 000 MAD, et le statut 🟡 **Partiel**.

---

## Étape 3 : Saisie des Ventes (Génère du CA et déduit du Stock)

Saisissez exactement ces deux ventes depuis la page **Ventes > Nouvelle Vente**.

### Vente 1 (Totalement payée)
- **Client** : `Entreprise Alpha`
- **Date** : 05/05/2026
- **Ligne Produit** : 2 `PC Portable Dell` à 8 000 MAD l'unité.
- **Paiement** : Ajoutez un paiement de **16 000 MAD**.
> **Vérification immédiate :** La vente doit s'afficher avec un Total de 16 000 MAD, un Reste de 0 MAD, et le statut 🟢 **Payé**.

### Vente 2 (Non payée)
- **Client** : `Boutique Beta`
- **Date** : 06/05/2026
- **Ligne Produit** : 1 `Pack Bureau (Écran + Clavier + Souris)` à 1 500 MAD l'unité.
- **Paiement** : Aucun paiement (0 MAD).
> **Vérification immédiate :** La vente doit s'afficher avec un Total de 1 500 MAD, un Reste de 1 500 MAD, et le statut 🔴 **Impayé**.

---

## Étape 4 : Résultats Attendus (A valider dans l'interface)

Une fois les données ci-dessus saisies, naviguez dans l'application pour vérifier que les chiffres correspondent **exactement** à ces résultats.

### 1. Tableau de Bord (Global)

> **Formules de calcul des 9 indicateurs (à partager avec le client) :**
> * **Ligne 1 (Ventes)**
>   * `CA Ventes` = Somme de tous les totaux des factures de vente (quel que soit le paiement).
>   * `ENCAISSÉ` = Somme de tous les paiements reçus des clients (les encaissements réels).
>   * `À RECEVOIR` = `CA Ventes` - `ENCAISSÉ` (ou la somme des restes à payer de chaque facture client).
> * **Ligne 2 (Achats)**
>   * `Total Achats` = Somme de tous les totaux des bons d'achats fournisseurs.
>   * `Décaissé` = Somme de tous les paiements envoyés aux fournisseurs.
>   * `À PAYER` = `Total Achats` - `Décaissé` (ou la somme des dettes fournisseurs restantes).
> * **Ligne 3 (Performance)**
>   * `MARGE` = `CA Ventes` - `Total Achats`. *(Indique la rentabilité brute)*.
>   * `Nb. Ventes` = Nombre total de documents de vente créés.
>   * `Panier Moyen` = `CA Ventes` ÷ `Nb. Ventes`. *(Valeur moyenne d'une vente)*.

**Validation avec notre scénario de test :**
**Première ligne (Ventes) :**
- **CA Ventes** : `17 500 MAD` (16 000 + 1 500)
- **ENCAISSÉ** : `16 000 MAD`
- **À RECEVOIR** : `1 500 MAD`

**Deuxième ligne (Achats) :**
- **Total Achats** : `53 000 MAD` (50 000 + 3 000)
- **Décaissé** : `51 000 MAD` (50 000 + 1 000)
- **À PAYER** : `2 000 MAD`

**Troisième ligne (Performance) :**
- **MARGE** : `-35 500 MAD` (17 500 - 53 000)
- **Nb. Ventes** : `2`
- **Panier Moyen** : `8 750 MAD` (17 500 / 2 ventes)

### 2. État Spécifique (Détail par Tiers)
- **État du Client : Boutique Beta** :
  - Doit afficher un Total des ventes de `1 500 MAD`.
  - Un Reste à payer de `1 500 MAD`.
- **État du Fournisseur : Grossiste MegaStore** :
  - Doit afficher un Total des achats de `3 000 MAD`.
  - Un Reste à payer de `2 000 MAD`.

### 3. Gestion de Stock
- **Produit "PC Portable Dell"** :
  - Doit afficher un **Stock Actuel de 8**. (10 entrés - 2 sortis)
- **Produit "Pack Bureau (Écran + Clavier + Souris)"** :
  - Doit afficher un **Stock Actuel de 9**. (10 entrés - 1 sorti)
  
> *(Note : En cliquant sur un produit pour voir son historique, vous devriez voir la ligne "in" issue de l'achat et la ligne "out" issue de la vente, confirmant le calcul).*
