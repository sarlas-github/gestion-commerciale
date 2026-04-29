# ROUTES.md — Routes & Pages

## Routes publiques
```
/login       ← connexion
/register    ← inscription
```

## Routes protégées
```
/                       → redirect /dashboard
/dashboard              ← tableau de bord
/setup                  ← config entreprise (1ère connexion)

/products               ← grille produits uniquement
/products/new           ← créer produit
/products/:id/edit      ← éditer produit

/stock/movements        ← historique mouvements stock (IN/OUT/ADJUST)

/suppliers              ← liste fournisseurs
/suppliers/new          ← créer fournisseur
/suppliers/:id          ← fiche fournisseur (onglets)
/suppliers/:id/edit     ← éditer fournisseur

/purchases              ← liste achats
/purchases/new          ← nouvel achat
/purchases/:id/edit     ← éditer achat

/clients                ← liste clients
/clients/new            ← créer client
/clients/:id            ← fiche client (onglets)
/clients/:id/edit       ← éditer client

/sales                  ← liste ventes
/sales/new              ← nouvelle vente
/sales/:id/edit         ← éditer vente

/documents              ← liste documents (Phase 2)
/documents/:id          ← détail document (Phase 2)

/payments/clients       ← grille paiements clients
/payments/suppliers     ← grille paiements fournisseurs

/reports/clients        ← état mensuel clients
/reports/suppliers      ← état mensuel fournisseurs

/settings               ← paramètres entreprise
```

---

## Pages détail

### /products
- Grille produits : Nom, Type, Pièces, Stock actuel, Seuil, Statut coloré
- Bouton correction stock (📦) par ligne → modale ADJUST
- Pas d'onglets — les mouvements ont leur propre page

### /stock/movements
- Grille historique : Date, Produit, Type (IN/OUT/ADJUST), Quantité, Référence cliquable, Note
- Filtres : Produit, Type, Période (mois/année)
- Référence cliquable → ouvre l'achat ou la vente concernée
- Export Excel

### /suppliers/:id et /clients/:id
- Onglet "Infos" : informations de base
- Onglet "Achats/Ventes" : grille transactions
- Onglet "Paiements" : grille paiements
- Onglet "État" : synthèse mensuelle avec MonthPicker

### /purchases/new et /purchases/:id/edit
- Composant réutilisable PurchaseForm.tsx
- Entête + grille produits + grille paiements

### /sales/new et /sales/:id/edit
- Composant réutilisable SaleForm.tsx
- Entête + grille produits + grille paiements
- Vérification stock en temps réel

---

## Composants partagés réutilisables

```
AppLayout          ← layout sidebar + topbar
Sidebar            ← navigation avec groupes expandables
PageHeader         ← titre + bouton action principal
DataTable          ← TanStack Table (tri + filtre + pagination + export)
StatusBadge        ← badge coloré selon statut
ConfirmDialog      ← confirmation suppression
MonthPicker        ← sélecteur mois/année avec navigation
EntityCombobox     ← autocomplete + bouton [+]
QuickCreateModal   ← modale création rapide
AmountInput        ← input numérique avec auto-select
CurrencyDisplay    ← montant formaté MAD
EmptyState         ← état vide
ErrorState         ← état erreur
```

---

## Phases

### Phase 1A — Core métier
```
/setup, /settings
/products, /stock/movements
/suppliers, /purchases
/clients, /sales
```

### Phase 1B — Présentation
```
/payments/clients
/payments/suppliers
/reports/clients
/reports/suppliers
/dashboard
```

### Phase 2 — Documents
```
/documents
/documents/:id
PDF téléchargement
```
