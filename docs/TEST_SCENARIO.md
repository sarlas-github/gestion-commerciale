# Plan de Test & Validation des Calculs

Ce document vous servira de guide étape par étape pour saisir manuellement un scénario de test précis dans l'application. En suivant ces étapes, vous pourrez valider immédiatement si tous vos tableaux de bord, états spécifiques et gestions de stock renvoient les valeurs mathématiques exactes attendues.

---

## Mois 4 — Avril 2026

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
- **Date** : 01/04/2026
- **Ligne Produit** : 10 `PC Portable Dell` à 5 000 MAD l'unité.
- **Paiement** : Ajoutez un paiement de **50 000 MAD**.
> **Vérification immédiate :** L'achat doit s'afficher avec un Total de 50 000 MAD, un Reste de 0 MAD, et le statut 🟢 **Payé**.

### Achat 2 (Partiellement payé)
- **Fournisseur** : `Grossiste MegaStore`
- **Date** : 02/04/2026
- **Ligne Produit** : 10 `Pack Bureau (Écran + Clavier + Souris)` à 300 MAD l'unité.
- **Paiement** : Ajoutez un paiement de **1 000 MAD**.
> **Vérification immédiate :** L'achat doit s'afficher avec un Total de 3 000 MAD, un Reste de 2 000 MAD, et le statut 🟡 **Partiel**.

---

## Étape 3 : Saisie des Ventes (Génère du CA et déduit du Stock)

Saisissez exactement ces deux ventes depuis la page **Ventes > Nouvelle Vente**.

### Vente 1 (Totalement payée)
- **Client** : `Entreprise Alpha`
- **Date** : 05/04/2026
- **Ligne Produit** : 2 `PC Portable Dell` à 8 000 MAD l'unité.
- **Paiement** : Ajoutez un paiement de **16 000 MAD**.
> **Vérification immédiate :** La vente doit s'afficher avec un Total de 16 000 MAD, un Reste de 0 MAD, et le statut 🟢 **Payé**.

### Vente 2 (Non payée)
- **Client** : `Boutique Beta`
- **Date** : 06/04/2026
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

### 2. État Spécifique (Détail par Tiers — Avril 2026)

**Clients :**
| Client | Total Ventes | Total Encaissé | Reste à Payer |
|---|---|---|---|
| **Entreprise Alpha** | 16 000 MAD | 16 000 MAD | **0 MAD** |
| **Boutique Beta** | 1 500 MAD | 0 MAD | **1 500 MAD** 🔴 |

**Fournisseurs :**
| Fournisseur | Total Achats | Total Payé | Reste à Payer |
|---|---|---|---|
| **Fournisseur GlobalTech** | 50 000 MAD | 50 000 MAD | **0 MAD** |
| **Grossiste MegaStore** | 3 000 MAD | 1 000 MAD | **2 000 MAD** 🔴 |

### 3. Gestion de Stock
- **Produit "PC Portable Dell"** :
  - Doit afficher un **Stock Actuel de 8**. (10 entrés - 2 sortis)
- **Produit "Pack Bureau (Écran + Clavier + Souris)"** :
  - Doit afficher un **Stock Actuel de 9**. (10 entrés - 1 sorti)
  
> *(Note : En cliquant sur un produit pour voir son historique, vous devriez voir la ligne "in" issue de l'achat et la ligne "out" issue de la vente, confirmant le calcul).*

---

## Mois 5 — Mai 2026

> Le catalogue (produits, fournisseurs, clients) reste identique à l'Étape 1. Reprenez directement depuis les achats.

---

### Étape 2 (Mai) : Saisie des Achats

#### Achat 3 (Partiellement payé)
- **Fournisseur** : `Fournisseur GlobalTech`
- **Date** : 05/05/2026
- **Ligne Produit** : 5 `PC Portable Dell` à 5 500 MAD l'unité.
- **Paiement** : Ajoutez un paiement de **10 000 MAD**.
> **Vérification immédiate :** Total de 27 500 MAD, Reste de 17 500 MAD, statut 🟡 **Partiel**.

#### Achat 4 (Totalement payé)
- **Fournisseur** : `Grossiste MegaStore`
- **Date** : 07/05/2026
- **Ligne Produit** : 20 `Pack Bureau (Écran + Clavier + Souris)` à 350 MAD l'unité.
- **Paiement** : Ajoutez un paiement de **7 000 MAD**.
> **Vérification immédiate :** Total de 7 000 MAD, Reste de 0 MAD, statut 🟢 **Payé**.

---

### Étape 3 (Mai) : Saisie des Ventes

#### Vente 3 (Partiellement payée)
- **Client** : `Entreprise Alpha`
- **Date** : 12/05/2026
- **Ligne Produit** : 3 `PC Portable Dell` à 8 500 MAD l'unité.
- **Paiement** : Ajoutez un paiement de **15 000 MAD**.
> **Vérification immédiate :** Total de 25 500 MAD, Reste de 10 500 MAD, statut 🟡 **Partiel**.

#### Vente 4 (Totalement payée)
- **Client** : `Boutique Beta`
- **Date** : 15/05/2026
- **Ligne Produit** : 5 `Pack Bureau (Écran + Clavier + Souris)` à 1 800 MAD l'unité.
- **Paiement** : Ajoutez un paiement de **9 000 MAD**.
> **Vérification immédiate :** Total de 9 000 MAD, Reste de 0 MAD, statut 🟢 **Payé**.

---

### Étape 4 (Mai) : Résultats Attendus pour Mai 2026

**Tableau de Bord (filtré sur Mai 2026) :**

**Première ligne (Ventes) :**
- **CA Ventes** : `34 500 MAD` (25 500 + 9 000)
- **ENCAISSÉ** : `24 000 MAD` (15 000 + 9 000)
- **À RECEVOIR** : `10 500 MAD`

**Deuxième ligne (Achats) :**
- **Total Achats** : `34 500 MAD` (27 500 + 7 000)
- **Décaissé** : `17 000 MAD` (10 000 + 7 000)
- **À PAYER** : `17 500 MAD`

**Troisième ligne (Performance) :**
- **MARGE** : `0 MAD` (34 500 - 34 500)
- **Nb. Ventes** : `2`
- **Panier Moyen** : `17 250 MAD` (34 500 / 2 ventes)

**État des Tiers (Mai 2026) :**

Clients :
| Client | Total Ventes | Total Encaissé | Reste à Payer |
|---|---|---|---|
| **Entreprise Alpha** | 25 500 MAD | 15 000 MAD | **10 500 MAD** 🔴 |
| **Boutique Beta** | 9 000 MAD | 9 000 MAD | **0 MAD** |

Fournisseurs :
| Fournisseur | Total Achats | Total Payé | Reste à Payer |
|---|---|---|---|
| **Fournisseur GlobalTech** | 27 500 MAD | 10 000 MAD | **17 500 MAD** 🔴 |
| **Grossiste MegaStore** | 7 000 MAD | 7 000 MAD | **0 MAD** |

**Gestion de Stock (après Mai) :**
- **PC Portable Dell** : Stock Actuel **10**. (8 après avril + 5 entrés - 3 sortis)
- **Pack Bureau** : Stock Actuel **24**. (9 après avril + 20 entrés - 5 sortis)

---

## Récapitulatif Cumulé — Avril + Mai 2026

> Cette section vous permet de vérifier rapidement les totaux toutes périodes confondues dans l'application (sans filtre de mois, ou en sélectionnant les deux mois).

### Tableau de Bord (Cumul Avril + Mai)

**Première ligne (Ventes) :**
| Indicateur | Avril | Mai | **Cumul** |
|---|---|---|---|
| CA Ventes | 17 500 MAD | 34 500 MAD | **52 000 MAD** |
| ENCAISSÉ | 16 000 MAD | 24 000 MAD | **40 000 MAD** |
| À RECEVOIR | 1 500 MAD | 10 500 MAD | **12 000 MAD** |

**Deuxième ligne (Achats) :**
| Indicateur | Avril | Mai | **Cumul** |
|---|---|---|---|
| Total Achats | 53 000 MAD | 34 500 MAD | **87 500 MAD** |
| Décaissé | 51 000 MAD | 17 000 MAD | **68 000 MAD** |
| À PAYER | 2 000 MAD | 17 500 MAD | **19 500 MAD** |

**Troisième ligne (Performance) :**
| Indicateur | Avril | Mai | **Cumul** |
|---|---|---|---|
| MARGE | -35 500 MAD | 0 MAD | **-35 500 MAD** |
| Nb. Ventes | 2 | 2 | **4** |
| Panier Moyen | 8 750 MAD | 17 250 MAD | **13 000 MAD** *(52 000 / 4)* |

### Stock Final (après Avril + Mai)
- **PC Portable Dell** : **10 unités** en stock.
  - Entrées : 10 (avril) + 5 (mai) = 15 | Sorties : 2 (avril) + 3 (mai) = 5 | Net : **10**
- **Pack Bureau (Écran + Clavier + Souris)** : **24 unités** en stock.
  - Entrées : 10 (avril) + 20 (mai) = 30 | Sorties : 1 (avril) + 5 (mai) = 6 | Net : **24**

### État Cumulé des Tiers (Avril + Mai)

**Clients :**
| Client | Avril (ventes) | Mai (ventes) | Total Cumulé | Total Encaissé | **Reste à Payer** |
|---|---|---|---|---|---|
| **Entreprise Alpha** | 16 000 MAD | 25 500 MAD | 41 500 MAD | 31 000 MAD | **10 500 MAD** 🔴 |
| **Boutique Beta** | 1 500 MAD | 9 000 MAD | 10 500 MAD | 9 000 MAD | **1 500 MAD** 🔴 |

**Fournisseurs :**
| Fournisseur | Avril (achats) | Mai (achats) | Total Cumulé | Total Payé | **Reste à Payer** |
|---|---|---|---|---|---|
| **Fournisseur GlobalTech** | 50 000 MAD | 27 500 MAD | 77 500 MAD | 60 000 MAD | **17 500 MAD** 🔴 |
| **Grossiste MegaStore** | 3 000 MAD | 7 000 MAD | 10 000 MAD | 8 000 MAD | **2 000 MAD** 🔴 |
