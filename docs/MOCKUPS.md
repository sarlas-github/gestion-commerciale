# MOCKUPS.md — Maquettes Interfaces

## ⚠️ Important
Ces maquettes définissent exactement l'interface à implémenter.
Respecter la structure, les colonnes, les actions et les comportements décrits.

---

## 1. SIDEBAR

```
┌─────────────────────────┐
│  🏢 [Logo] Nom Entreprise│
├─────────────────────────┤
│  📊 Dashboard           │
│                         │
│  — CATALOGUE ────────── │
│  📦 Produits            │
│  📈 Mouvements stock    │
│                         │
│  — ACHATS ────────────  │
│  🏭 Fournisseurs        │
│  🛒 Achats              │
│                         │
│  — VENTES ────────────  │
│  👤 Clients             │
│  💰 Ventes              │
│  📄 Documents           │
│                         │
│  — FINANCES ──────────  │
│  💳 Paiements     ▼     │
│      └ Clients          │
│      └ Fournisseurs     │
│  📊 États         ▼     │
│      └ État clients     │
│      └ État fournisseurs│
│                         │
│  — ADMIN ─────────────  │
│  ⚙️  Paramètres         │
└─────────────────────────┘
```

Règles sidebar :
- Groupes avec titre en petit texte gris
- Paiements et États sont expandables (▼)
- Item actif → fond coloré
- Badge 🔴 sur Produits si alertes stock actives
- Mobile → drawer depuis hamburger

---

## 2. PRODUITS — Grille produits (/products)

```
┌─────────────────────────────────────────────────────────────────┐
│  PRODUITS                                    [+ Nouveau produit]│
├─────────────────────────────────────────────────────────────────┤
│  🔍 [Rechercher...  ]                          [Export Excel]   │
├──────────────┬───────────┬──────────┬───────┬──────┬───────────┤
│ Nom ▲▼       │ Type ▲▼   │ Pièces▲▼ │Stock▲▼│Seuil▲▼│ Actions  │
├──────────────┼───────────┼──────────┼───────┼───────┼──────────┤
│ Huile Olive  │ Pack      │ 12       │ 50    │ 10    │ ✏️ 📦 🗑️ │
│ Savon        │ Individuel│ 1        │ 3  🟡 │ 5     │ ✏️ 📦 🗑️ │
│ Café 250g    │ Pack      │ 24       │ 0  🔴 │ 10    │ ✏️ 📦 🗑️ │
├──────────────┴───────────┴──────────┴───────┴───────┴──────────┤
│  Affichage 1-10 sur 24   [← Préc]  1  2  3  [Suiv →]          │
└─────────────────────────────────────────────────────────────────┘
```

Stock coloré :
- Stock > seuil → 🟢 (vert)
- Stock <= seuil → 🟡 (orange)
- Stock = 0 → 🔴 (rouge)

Actions par ligne :
- ✏️ Éditer le produit
- 📦 Correction stock (modale ADJUST)
- 🗑️ Supprimer (avec confirmation)

⚠️ Pas d'onglets — les mouvements sont sur /stock/movements

---

## 3. PRODUITS — Formulaire création/édition

```
┌─────────────────────────────┐
│  NOUVEAU PRODUIT            │
├─────────────────────────────┤
│  Nom *                      │
│  [___________________]      │
│                             │
│  Type *                     │
│  ○ Individuel  ○ Pack       │
│                             │
│  Nombre de pièces *         │
│  (visible si Pack)          │
│  [___]                      │
│                             │
│  Seuil alerte stock         │
│  [___]                      │
│                             │
│  [Annuler]  [Enregistrer]   │
└─────────────────────────────┘
```

---

## 4. MOUVEMENTS STOCK — Page dédiée (/stock/movements)

```
┌──────────────────────────────────────────────────────────────────────┐
│  MOUVEMENTS STOCK                                  [Export Excel]    │
├──────────────────────────────────────────────────────────────────────┤
│  🔍 [Rechercher...] Produit:[Tous▼] Type:[Tous▼] Période:[Avr▼][2025▼]│
├────────────┬─────────────┬─────────┬──────────┬────────────┬────────┤
│ Date ▲▼    │ Produit ▲▼  │ Type ▲▼ │Quantité▲▼│ Référence▲▼│ Note▲▼ │
├────────────┼─────────────┼─────────┼──────────┼────────────┼────────┤
│ 28/04/2025 │ Huile Olive │🟢 IN    │ +10      │ ACH-001 🔗 │        │
│ 27/04/2025 │ Savon       │🔴 OUT   │ -5       │ VNT-002 🔗 │        │
│ 26/04/2025 │ Café 250g   │🔵 ADJUST│ +20      │ Manuel     │Correction│
└────────────┴─────────────┴─────────┴──────────┴────────────┴────────┘
│  Affichage 1-10 sur 50   [← Préc]  1  2  3  [Suiv →]               │
└──────────────────────────────────────────────────────────────────────┘
```

Référence cliquable (🔗) → ouvre l'achat ou la vente concernée.
Pas de bouton "Nouveau" — les mouvements sont créés via Achats/Ventes/Correction stock.

---

## 5. CORRECTION STOCK — Modale

```
┌─────────────────────────────┐
│  CORRECTION STOCK           │
├─────────────────────────────┤
│  Produit *                  │
│  [autocomplete       ]      │
│                             │
│  Type *                     │
│  ○ IN (ajouter)             │
│  ○ OUT (retirer)            │
│                             │
│  Quantité *                 │
│  [___]                      │
│                             │
│  Note * (obligatoire)       │
│  [___________________]      │
│                             │
│  Stock actuel  : 50         │
│  Stock après   : 70 ✅      │
│                             │
│  [Annuler]  [Enregistrer]   │
└─────────────────────────────┘
```

---

## 6. FOURNISSEURS — Grille

```
┌──────────────────────────────────────────────────────────────────┐
│  FOURNISSEURS                              [+ Nouveau fournisseur]│
├──────────────────────────────────────────────────────────────────┤
│  🔍 [Rechercher...  ]                           [Export Excel]   │
├──────────────┬────────────┬─────────────┬──────────┬────────┬───┤
│ Nom ▲▼       │Téléphone▲▼ │ Adresse ▲▼  │Total dû▲▼│Statut▲▼│Act│
├──────────────┼────────────┼─────────────┼──────────┼────────┼───┤
│ Fournisseur A│ 06XXXXXXXX │ Casablanca  │ 500 MAD  │🔴Impayé│👁️✏️🗑️│
│ Fournisseur B│ 06XXXXXXXX │ Rabat       │   0 MAD  │🟢OK    │👁️✏️🗑️│
└──────────────┴────────────┴─────────────┴──────────┴────────┴───┘
│  Affichage 1-10 sur 12   [← Préc]  1  2  [Suiv →]              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. FOURNISSEUR — Fiche détail (onglets)

```
┌─────────────────────────────────────────┐
│  FOURNISSEUR : Atlas SARL      [Éditer] │
├─────────────────────────────────────────┤
│  [Infos]  [Achats]  [Paiements]  [État]│
├─────────────────────────────────────────┤
│                                         │
│  Onglet Infos                           │
│  → Nom, Téléphone, Adresse, ICE         │
│                                         │
│  Onglet Achats                          │
│  → Grille de tous ses achats            │
│                                         │
│  Onglet Paiements                       │
│  → Grille de tous les paiements         │
│                                         │
│  Onglet État                            │
│  → [Avril 2025 ← →]                    │
│  → Total achats du mois                 │
│  → Total payé du mois                   │
│  → Reste à payer 🔴                     │
│                                         │
└─────────────────────────────────────────┘
```

---

## 8. ACHATS — Grille

```
┌────────────────────────────────────────────────────────────────────────┐
│  ACHATS                                               [+ Nouvel achat] │
├────────────────────────────────────────────────────────────────────────┤
│  🔍 [Rechercher...] Période:[Avr▼][2025▼] Statut:[Tous▼] [Export Excel]│
├─────────────┬──────────────┬────────────┬──────────┬────────┬─────────┬─────────┬─────────┐
│ Référence▲▼ │ Fournisseur▲▼│ Date ▲▼    │ Total ▲▼ │ Payé▲▼ │ Reste▲▼ │ Statut▲▼│ Actions │
├─────────────┼──────────────┼────────────┼──────────┼────────┼─────────┼─────────┼─────────┤
│ ACH-001     │ Fournisseur A│ 28/04/2025 │ 450 MAD  │350 MAD │ 100 MAD │🟡Partiel│ 👁️ ✏️ 🗑️│
│ ACH-002     │ Fournisseur B│ 27/04/2025 │ 200 MAD  │200 MAD │   0 MAD │🟢Payé   │ 👁️ ✏️ 🗑️│
│ ACH-003     │ Fournisseur C│ 26/04/2025 │ 800 MAD  │  0 MAD │ 800 MAD │🔴Impayé │ 👁️ ✏️ 🗑️│
└─────────────┴──────────────┴────────────┴──────────┴────────┴─────────┴─────────┴─────────┘
│  Affichage 1-10 sur 24   [← Préc]  1  2  3  [Suiv →]                                      │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. ACHATS — Formulaire (création ET édition)

Même composant PurchaseForm.tsx pour les deux modes.

```
┌─────────────────────────────────────────┐
│  NOUVEL ACHAT / ÉDITION ACHAT           │
├─────────────────────────────────────────┤
│  Fournisseur * [autocomplete     ] [+]  │
│  Date *        [28/04/2025        ]     │
│  Référence     [optionnel         ]     │
│  Note          [optionnel         ]     │
├─────────────────────────────────────────┤
│  PRODUITS                               │
│  ┌────────────────┬─────┬───────┬──────┬──┐│
│  │ Produit    [+] │ Qté │ Prix  │S/Tot │🗑 ││
│  ├────────────────┼─────┼───────┼──────┼──┤│
│  │[autocomplete ] │ 10  │ 25,00 │250,00│🗑 ││
│  │[autocomplete ] │  5  │ 40,00 │200,00│🗑 ││
│  └────────────────┴─────┴───────┴──────┴──┘│
│  [+ Ajouter une ligne]                  │
│                   Total : 450,00 MAD    │
├─────────────────────────────────────────┤
│  PAIEMENTS                              │
│  ┌──────────────┬──────────┬──────┬───┐ │
│  │ Date         │ Montant  │ Note │   │ │
│  ├──────────────┼──────────┼──────┼───┤ │
│  │ 28/04/2025   │ 200 MAD  │ ...  │ 🗑│ │
│  │ 01/05/2025   │ 150 MAD  │ ...  │ 🗑│ │
│  └──────────────┴──────────┴──────┴───┘ │
│  [+ Ajouter un paiement]                │
│                   Payé  : 350,00 MAD    │
│                   Reste : 100,00 MAD 🔴 │
│                   Statut: 🟡 Partiel    │
├─────────────────────────────────────────┤
│        [Annuler]    [Enregistrer]       │
└─────────────────────────────────────────┘
```

Règles formulaire achat :
- Fournisseur : autocomplete + bouton [+] modale création
- Chaque ligne produit : autocomplete + bouton [+] modale création
- Qté et Prix : auto-select au focus
- Sous-total recalculé en temps réel
- Total recalculé en temps réel
- Grille paiements disponible en création ET édition
- Payé/Reste/Statut recalculés en temps réel
- Édition avec paiements → lignes produits non modifiables

---

## 10. CLIENTS — Grille

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENTS                                      [+ Nouveau client]│
├─────────────────────────────────────────────────────────────────┤
│  🔍 [Rechercher...  ]                          [Export Excel]   │
├──────────────┬────────────┬─────────────┬──────────┬────────┬───┤
│ Nom ▲▼       │Téléphone▲▼ │ Adresse ▲▼  │Total dû▲▼│Statut▲▼│Act│
├──────────────┼────────────┼─────────────┼──────────┼────────┼───┤
│ Mohamed A.   │ 06XXXXXXXX │ Casablanca  │ 100 MAD  │🔴Impayé│👁️✏️🗑️│
│ Sara B.      │ 06XXXXXXXX │ Rabat       │   0 MAD  │🟢OK    │👁️✏️🗑️│
└──────────────┴────────────┴─────────────┴──────────┴────────┴───┘
│  Affichage 1-10 sur 24   [← Préc]  1  2  3  [Suiv →]          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. CLIENT — Fiche détail (onglets)

```
┌─────────────────────────────────────────┐
│  CLIENT : Mohamed Alami        [Éditer] │
├─────────────────────────────────────────┤
│  [Infos]  [Ventes]  [Paiements]  [État]│
├─────────────────────────────────────────┤
│  Onglet Infos → Nom, Tél, Adresse, ICE  │
│  Onglet Ventes → grille ventes client   │
│  Onglet Paiements → grille paiements    │
│  Onglet État → synthèse mensuelle       │
│    [Avril 2025 ← →]                    │
│    Total ventes : 10 000 MAD            │
│    Total payé   :  7 000 MAD            │
│    Reste à payer:  3 000 MAD 🔴         │
└─────────────────────────────────────────┘
```

---

## 12. VENTES — Grille

```
┌────────────────────────────────────────────────────────────────────────┐
│  VENTES                                               [+ Nouvelle vente]│
├────────────────────────────────────────────────────────────────────────┤
│  🔍 [Rechercher...] Période:[Avr▼][2025▼] Statut:[Tous▼] [Export Excel]│
├──────────────┬────────────┬──────────┬────────┬─────────┬─────────┬───┤
│ Client ▲▼    │ Date ▲▼    │ Total ▲▼ │ Payé▲▼ │ Reste▲▼ │ Statut▲▼│Act│
├──────────────┼────────────┼──────────┼────────┼─────────┼─────────┼───┤
│ Mohamed A.   │ 28/04/2025 │ 500 MAD  │350 MAD │ 150 MAD │🟡Partiel│👁️✏️🗑️│
│ Sara B.      │ 27/04/2025 │ 200 MAD  │200 MAD │   0 MAD │🟢Payé   │👁️✏️🗑️│
│ Karim C.     │ 26/04/2025 │ 800 MAD  │  0 MAD │ 800 MAD │🔴Impayé │👁️✏️🗑️│
└──────────────┴────────────┴──────────┴────────┴─────────┴─────────┴───┘
│  Affichage 1-10 sur 24   [← Préc]  1  2  3  [Suiv →]                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 13. VENTES — Formulaire (création ET édition)

Même composant SaleForm.tsx pour les deux modes.

```
┌─────────────────────────────────────────┐
│  NOUVELLE VENTE / ÉDITION VENTE         │
├─────────────────────────────────────────┤
│  Client *  [autocomplete         ] [+]  │
│  Date *    [28/04/2025            ]     │
│  Note      [optionnel             ]     │
├─────────────────────────────────────────┤
│  PRODUITS                               │
│  ┌────────────────┬─────┬───────┬──────┬──┐│
│  │ Produit    [+] │ Qté │ Prix  │S/Tot │🗑 ││
│  ├────────────────┼─────┼───────┼──────┼──┤│
│  │[autocomplete ] │ 10  │ 25,00 │250,00│🗑 ││
│  └────────────────┴─────┴───────┴──────┴──┘│
│  [+ Ajouter une ligne]                  │
│  ⚠️ Stock insuffisant affiché par ligne  │
│                   Total : 250,00 MAD    │
├─────────────────────────────────────────┤
│  PAIEMENTS                              │
│  ┌──────────────┬──────────┬──────┬───┐ │
│  │ Date         │ Montant  │ Note │   │ │
│  ├──────────────┼──────────┼──────┼───┤ │
│  │ 28/04/2025   │ 200 MAD  │ ...  │ 🗑│ │
│  └──────────────┴──────────┴──────┴───┘ │
│  [+ Ajouter un paiement]                │
│                   Payé  : 200,00 MAD    │
│                   Reste :  50,00 MAD 🔴 │
│                   Statut: 🟡 Partiel    │
├─────────────────────────────────────────┤
│        [Annuler]    [Enregistrer]       │
└─────────────────────────────────────────┘
```

Règles formulaire vente :
- Client : autocomplete + bouton [+] modale
- Chaque ligne : autocomplete produit + bouton [+]
- Stock vérifié en temps réel → message si insuffisant
- Même logique paiements que formulaire achat
- À l'enregistrement → invoice créé automatiquement en BD

---

## 14. PAIEMENTS CLIENTS — Grille

```
┌─────────────────────────────────────────────────────────────────┐
│  PAIEMENTS CLIENTS                                              │
├─────────────────────────────────────────────────────────────────┤
│  🔍 [Rechercher...] Période:[Avr▼][2025▼]      [Export Excel]  │
├────────────┬─────────────┬────────────┬──────────┬─────────────┤
│ Date ▲▼    │ Client ▲▼   │ Vente réf▲▼│ Montant▲▼│ Note ▲▼     │
├────────────┼─────────────┼────────────┼──────────┼─────────────┤
│ 28/04/2025 │ Mohamed A.  │ VNT-001 🔗 │ 500 MAD  │             │
│ 27/04/2025 │ Sara B.     │ VNT-002 🔗 │ 200 MAD  │ Virement    │
├────────────┴─────────────┴────────────┴──────────┴─────────────┤
│ Total encaissé : 700 MAD                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 15. PAIEMENTS FOURNISSEURS — Grille

```
┌─────────────────────────────────────────────────────────────────┐
│  PAIEMENTS FOURNISSEURS                                         │
├─────────────────────────────────────────────────────────────────┤
│  🔍 [Rechercher...] Période:[Avr▼][2025▼]      [Export Excel]  │
├────────────┬──────────────┬────────────┬──────────┬────────────┤
│ Date ▲▼    │ Fournisseur▲▼│ Achat réf▲▼│ Montant▲▼│ Note ▲▼    │
├────────────┼──────────────┼────────────┼──────────┼────────────┤
│ 28/04/2025 │ Fournisseur A│ ACH-001 🔗 │ 300 MAD  │            │
│ 27/04/2025 │ Fournisseur B│ ACH-002 🔗 │ 150 MAD  │ Espèces    │
├────────────┴──────────────┴────────────┴──────────┴────────────┤
│ Total décaissé : 450 MAD                                        │
└─────────────────────────────────────────────────────────────────┘
```

Règles paiements :
- Pages lecture seule (paiements gérés depuis formulaires vente/achat)
- Référence cliquable → ouvre la vente/achat
- Total calculé sur données filtrées

---

## 16. ÉTATS CLIENTS

```
┌─────────────────────────────────────────────────────┐
│  ÉTAT CLIENTS          [← Avril 2025 →]             │
│                        [Export PDF] [Export Excel]   │
├──────────────────┬──────────────┬────────┬──────────┤
│ Client ▲▼        │ Total ventes▲▼│ Payé▲▼ │ Reste▲▼  │
├──────────────────┼──────────────┼────────┼──────────┤
│ Mohamed A.       │ 10 000 MAD   │ 7 000  │ 3 000 🔴 │
│ Sara B.          │  5 000 MAD   │ 5 000  │     0 🟢 │
│ Karim C.         │  8 000 MAD   │ 2 000  │ 6 000 🔴 │
├──────────────────┼──────────────┼────────┼──────────┤
│ TOTAL            │ 23 000 MAD   │14 000  │ 9 000    │
└──────────────────┴──────────────┴────────┴──────────┘
```

---

## 17. ÉTATS FOURNISSEURS

```
┌─────────────────────────────────────────────────────┐
│  ÉTAT FOURNISSEURS     [← Avril 2025 →]             │
│                        [Export PDF] [Export Excel]   │
├──────────────────┬──────────────┬────────┬──────────┤
│ Fournisseur ▲▼   │ Total achats▲▼│ Payé▲▼ │ Reste▲▼  │
├──────────────────┼──────────────┼────────┼──────────┤
│ Fournisseur A    │ 15 000 MAD   │12 000  │ 3 000 🔴 │
│ Fournisseur B    │  8 000 MAD   │ 8 000  │     0 🟢 │
├──────────────────┼──────────────┼────────┼──────────┤
│ TOTAL            │ 23 000 MAD   │20 000  │ 3 000    │
└──────────────────┴──────────────┴────────┴──────────┘
```

---

## 18. DASHBOARD

```
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD                          [← Avril 2025 →]           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ 💰 CA       │ │ ✅ Encaissé │ │🔴 À recevoir│ │🔴 À payer │ │
│  │ 23 000 MAD  │ │ 14 000 MAD  │ │  9 000 MAD  │ │ 4 500 MAD │ │
│  │ Ventes mois │ │ Paiements   │ │ Clients     │ │Fournisseurs│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│  ┌─────────────┐ ┌─────────────┐                               │
│  │ 📦 Ventes   │ │ 📈 Marge    │                               │
│  │ 24 ventes   │ │  8 000 MAD  │                               │
│  │ ce mois     │ │ CA - Achats │                               │
│  └─────────────┘ └─────────────┘                               │
├─────────────────────────────────────────────────────────────────┤
│  ⚠️ ALERTES STOCK                                               │
│  🔴 Café 250g  → Rupture  (stock: 0)                           │
│  🟡 Savon      → Faible   (stock: 3 / seuil: 5)               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐ ┌──────────────────────────────┐  │
│  │ 📈 Évolution ventes/mois │ │ 🏆 Top 5 produits            │  │
│  │   [courbe par jour]      │ │   [barres horizontales]      │  │
│  └──────────────────────────┘ └──────────────────────────────┘  │
│  ┌──────────────────────────┐ ┌──────────────────────────────┐  │
│  │ 👥 Top 5 clients         │ │ 🥧 Répartition produits      │  │
│  │   [barres horizontales]  │ │   [camembert]                │  │
│  └──────────────────────────┘ └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 19. PARAMÈTRES

```
┌─────────────────────────────────────────┐
│  PARAMÈTRES                             │
├─────────────────────────────────────────┤
│  Logo                                   │
│  [Choisir fichier] PNG/JPG max 2Mo      │
│  [aperçu logo]                          │
├─────────────────────────────────────────┤
│  Informations entreprise                │
│  Nom *          [_______________]       │
│  Forme juridique[_______________]       │
│  Email          [_______________]       │
│  Téléphone      [_______________]       │
│  Site web       [_______________]       │
│  Adresse        [_______________]       │
├─────────────────────────────────────────┤
│  Identifiants légaux                    │
│  ICE  [________] IF  [________]         │
│  RC   [________] TP  [________]         │
├─────────────────────────────────────────┤
│  Préférences facturation                │
│  Taux TVA par défaut  [___] %           │
├─────────────────────────────────────────┤
│  Couleur de marque                      │
│  [🔵][🟢][🟡][🔴][🟣] [+personnalisé]  │
│  Aperçu : [___________________]         │
├─────────────────────────────────────────┤
│              [Enregistrer]              │
└─────────────────────────────────────────┘
```
