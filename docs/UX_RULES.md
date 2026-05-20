# UX_RULES.md — Règles UX & Interface

## Langue
Toute l'interface est en **français**.

---

## 1. Règle globale — Toutes les grilles de données

Sans exception, chaque grille dans l'application inclut par défaut :
- **Tri** sur toutes les colonnes (clic en-tête → ▲▼, 3ème clic annule)
- **Filtre/recherche** sur toutes les colonnes
- **Pagination** (10 lignes par page)
- **Export Excel** (données filtrées/triées exportées)

Utiliser le composant `DataTable.tsx` réutilisable basé sur TanStack Table v8.

---

## 2. Saisie avec Autocomplétion et Ajout Rapide

Pour tout champ lié à une entité externe (Client, Fournisseur, Produit) :

### Autocomplétion
- En tapant → liste filtrée des éléments existants
- Sélection → remplit automatiquement tous les champs dépendants
- Utiliser le composant `EntityCombobox.tsx`

### Bouton + (Ajout rapide)
- Placé directement à côté du champ
- Ouvre une modale avec formulaire complet de création
- Après création → élément automatiquement sélectionné
- Pas de changement de page (pas de perte de contexte)

---

## 3. Formulaires Vente et Achat

### Structure obligatoire
1. Section entête (client/fournisseur, date, note)
2. Grille produits avec lignes dynamiques
3. Grille paiements avec lignes dynamiques

### Grille produits
- Chaque ligne : autocomplete produit + bouton [+], quantité, nombre de pièces, prix unitaire, sous-total, supprimer
- Bouton [+ Ajouter une ligne] en bas
- Minimum 1 ligne
- Sous-total recalculé en temps réel (`quantité × pièces × prix`)
- Total général recalculé en temps réel
- Quantité et prix : auto-select au focus

### Grille paiements
- Colonnes : Date, Montant, Note, Supprimer
- Bouton [+ Ajouter un paiement] en bas
- Affichage temps réel : Payé, Reste, Statut
- Disponible en création ET édition

### Snapshot `pieces_count`
Le champ **Pièces** (nombre de pièces par unité) est snapshoted au moment de la transaction dans `purchase_items.pieces_count` et `sale_items.pieces_count`. Cela garantit que modifier ce champ sur un produit n'altère pas les calculs des transactions historiques.

- Au clic sur un produit → `pieces_count` est automatiquement copié depuis le produit
- Il est éditable dans le formulaire (avant blocage, voir règles ci-dessous)
- Il ne peut pas être mis à 0 (minimum 1)

### Règles de blocage par type de document

#### Achat (`PurchaseForm`)
Pas de document officiel généré → aucun blocage lié aux paiements.

| Champ / Action | Condition de blocage |
|---|---|
| `pieces_count`, `unit_price` | Achat annulé uniquement (`isCancelled`) |
| Quantité | Item déjà enregistré en BD (`original_id`) |
| Bouton "Ajouter une ligne" | Achat annulé uniquement |

> L'annulation est gérée globalement via `<fieldset disabled={isCancelled}>`.

#### Vente (`SaleForm`)
La vente génère des documents officiels (facture, reçu) → blocage dès qu'un document ou paiement existe.

| Champ / Action | Condition de blocage |
|---|---|
| `pieces_count`, `unit_price` | Facture générée OU paiement existant OU annulé |
| Quantité | Item déjà enregistré en BD (`original_id`) |
| Bouton "Ajouter une ligne" | Facture générée OU paiement existant OU annulé |

> L'annulation est gérée globalement via `<fieldset disabled={isCancelled}>`.  
> Variables : `hasInvoice` (prop), `hasExistingPayments` (`client_payments.length > 0`).

---

## 4. Validation des Formulaires

### À la soumission
- Chaque champ invalide → message d'erreur en dessous
- Bande d'alerte rouge en haut si erreurs hors champ visible
- Bouton submit désactivé pendant l'envoi

### Au focus out
- Champ quitté sans valeur valide → erreur locale immédiate
- Valeur devient valide → erreur disparaît
- Bande globale disparaît quand TOUS les champs valides

### Messages d'erreur
- Champ obligatoire : "Ce champ est obligatoire"
- Nombre invalide : "Veuillez entrer un nombre valide"
- Valeur trop petite : "La valeur doit être supérieure à 0"
- Stock insuffisant : "Stock insuffisant (disponible : X)"

---

## 5. Auto-sélection au focus

Tout champ numérique (quantité, prix, montant) → contenu entièrement sélectionné au clic.
```typescript
<Input type="number" onFocus={(e) => e.target.select()} />
```

---

## 6. États de Chargement

### Boutons
```typescript
<Button disabled={isLoading}>
  {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
  {isLoading ? "Enregistrement..." : "Enregistrer"}
</Button>
```

### Listes
- Skeleton loader pendant chargement initial
- Spinner sur la ligne pour actions par ligne (PDF, statut...)

---

## 7. Sidebar

```
Structure avec groupes :

[CATALOGUE]   → Produits
[ACHATS]      → Fournisseurs, Achats
[VENTES]      → Clients, Ventes, Documents
[FINANCES]    → Paiements (expandable), États (expandable)
[ADMIN]       → Paramètres
```

- Item actif → fond coloré
- Badge 🔴 sur Produits si alertes stock actives
- **Mobile** → drawer hamburger (pas de double bouton X : SheetContent `showCloseButton=false`, seul le X dans l'en-tête Sidebar est affiché)
- **Desktop** → sidebar collapsible via bouton `‹` / `›` dans l'en-tête
  - Étendue : 240px, icônes + labels + titres de sections
  - Réduite : 64px, icônes seules, tooltip `title` au survol, séparateurs à la place des titres
  - Section FINANCES en mode réduit : icônes directement liées au premier enfant (pas d'accordion)

---

## 8. Confirmations et Alertes

### Suppression
- Dialog confirmation : "Êtes-vous sûr de vouloir supprimer [élément] ?"
- Boutons : "Annuler" + "Supprimer" (rouge)

### Notifications toast
- Succès → vert (3s)
- Erreur → rouge (5s)
- Info → bleu (3s)

---

## 9. Badges statut paiement
```
'paid'      → badge vert    "Payé"
'partial'   → badge orange  "Partiel"
'unpaid'    → badge rouge   "Impayé"
'draft'     → badge gris    "Brouillon"
'confirmed' → badge bleu    "Confirmé"
'cancelled' → badge rouge   "Annulé"
```

---

## 10. Badges statut stock
```
quantity > seuil_alert          → 🟢 vert   "OK"
quantity <= seuil_alert ET > 0  → 🟡 orange "Faible"
quantity = 0                    → 🔴 rouge  "Rupture"
```

---

## 11. Sélecteur mois/année (MonthPicker)
- Navigation ← → pour changer de mois
- Par défaut : mois en cours
- Utilisé sur : Dashboard, États clients, États fournisseurs, Fiche client/fournisseur onglet État


## 12. TopBar — Compte utilisateur

La barre supérieure ne comporte **pas** d'icône de notification. À la place, un menu déroulant compte utilisateur est affiché à droite :

- **Trigger** : avatar avec initiales (fond primaire) + nom affiché sur ≥ sm
- **Dropdown** : entête non-interactive (avatar + nom complet + email si différent du nom) puis item "Déconnexion" (variante destructive)
- Composants : `Avatar`, `AvatarFallback`, `DropdownMenu` / `DropdownMenuContent` / `DropdownMenuTrigger` / `DropdownMenuItem`
- Le nom affiché suit la priorité : `user_metadata.full_name` › `user_metadata.name` › `email`
- La déconnexion vide le cache React Query avant de rediriger vers `/login`

---

## 13. Responsive
L'app doit être fully responsive (mobile + desktop) :
- Sidebar cachée sur mobile → drawer hamburger
- Tables scrollables horizontalement sur mobile
- Formulaires en pleine largeur sur mobile
- Boutons et inputs adaptés au touch

### 13.1 Règle — Boutons d'action dans la TopBar (⚠️ OBLIGATOIRE)

> **Ne jamais tronquer (`truncate`, `overflow-hidden`) un bouton d'action.**  
> Un bouton tronqué perd son sens et sa lisibilité.

**Stratégie à appliquer dans cet ordre :**

1. **Label court sur mobile** — utiliser `<span className="sm:hidden">` pour le label court, `<span className="hidden sm:inline">` pour le label complet.
2. **Abréviation** — si le label court reste trop long, abréger le mot clé (`Fourn.`, `Frn.`).
3. **Icône seule** — en dernier recours uniquement, bouton icon-only sur mobile avec `title` pour l'accessibilité.

**Pattern standard à utiliser pour tous les boutons `usePageAction` :**

```tsx
usePageAction(
  <Button onClick={() => navigate('/suppliers/new')}>
    <Plus className="mr-1.5 h-4 w-4" />
    <span className="sm:hidden">Fournisseur</span>
    <span className="hidden sm:inline">Nouveau fournisseur</span>
  </Button>
)
```

**Tableau de référence des labels :**

| Page | Mobile | Desktop |
|------|--------|---------|
| Produits | `Produit` | `Nouveau produit` |
| Fournisseurs | `Fournisseur` | `Nouveau fournisseur` |
| Clients | `Client` | `Nouveau client` |
| Ventes | `Vente` | `Nouvelle vente` |
| Achats | `Achat` | `Nouvel achat` |

---


## 14. Fond des contrôles — Règle absolue

**Jamais de contrôle ou carte avec fond gris sur fond de page gris.**

Le fond de page (`--background`) est gris clair en light mode. Tout élément interactif ou informatif doit utiliser `bg-card` pour se démarquer visuellement. `bg-card` est automatiquement blanc en light mode et sombre en dark mode.

### S'applique à
- Inputs, Textarea, SelectTrigger → `bg-card` (enforced dans les composants `ui/`)
- Cartes d'information (NOM, TÉLÉPHONE, ADRESSE…) dans les pages de détail → `bg-card`
- Cartes KPI / stats → `bg-card`
- Champs en lecture seule (display-only) → `bg-card`
- Conteneurs de formulaire → `bg-card`

### Interdit
- `bg-muted/30`, `bg-muted/50` sur des cartes ou champs posés sur fond de page
- `bg-transparent` sur des inputs (ils deviennent gris sur gris)

### Exception acceptée
`even:bg-muted/40` pour le zébrage des lignes de tableau, **uniquement à l'intérieur** d'un conteneur `bg-card`.

---

## 15. Liens cliquables et Navigation

### Colonnes de tableau standardisées
Pour favoriser une navigation fluide, les colonnes identifiant une entité (Référence, Client, Fournisseur) doivent être cliquables :
- **Style visuel** : Bouton flex avec `Link2` de `lucide-react` (icône à gauche) + texte.
- **Classes CSS** : `text-primary hover:underline text-sm`.
- **Comportement** : Redirection vers la page de détail ou ouverture d'une modale de vue rapide (QuickView).
- **Icône** : `<Link2 className="h-3.5 w-3.5" />` avec un `gap-1`.

### Bouton "Retour"
Dans toutes les pages de détail ou d'édition, le bouton "Retour" placé dans le `PageHeader` (ou en haut de page) doit :
- Utiliser `navigate(-1)` au lieu d'une route fixe.
- Garantir que l'utilisateur revient à son contexte précédent (filtres, pagination, page d'origine).
- **Style** : Variante `ghost`, icône `ArrowLeft`.

### Vue Rapide (QuickView)
Pour les entités complexes (Ventes, Achats), privilégier une modale de vue rapide au clic sur la référence dans les listes transversales (ex: Mouvements de stock) pour éviter de perdre le contexte de recherche.

---

## 16. Standardisation des Formulaires (Mobile & Desktop)

Pour garantir une expérience unifiée, les pages de formulaires (Ventes, Achats, Produits, Clients, Fournisseurs) et d'aperçu de document (Factures, Reçus) doivent respecter la structure suivante :

### Conteneur Principal
Les éléments du formulaire (champs, tableaux de lignes) doivent toujours être encapsulés dans un conteneur blanc (ou couleur carte en mode sombre) : `className="bg-card"`.

### Bouton Retour (`leftAction` de la TopBar)
- Le bouton "Retour" est toujours affiché.
- Il ne contient **pas de texte**, uniquement l'icône `<ArrowLeft className="h-5 w-5" />`.
- **Sur Desktop** : Il s'affiche à gauche du titre de la page.
- **Sur Mobile** : Il s'affiche tout à droite de la `TopBar`, juste avant l'avatar. (Comportement géré dynamiquement par `TopBar`).

### Boutons d'Action (Enregistrer, Annuler, Imprimer...)
- **Sur Desktop** : Ils sont placés dans le `PageHeader` (côté droit).
- **Sur Mobile** : Ils sont fixés en bas de l'écran (Sticky Bar) via un conteneur `fixed bottom-0 bg-card border-t md:hidden`.
- **Fond de la Sticky Bar** : Elle doit avoir le fond `bg-card` pour ne pas se fondre avec le fond gris, et les boutons secondaires (qui ont `variant="outline"`) doivent explicitement porter la classe `className="bg-card"` s'ils risquent de se confondre avec l'arrière plan.

---

## 17. Hauteur dynamique des grilles

Le nombre de lignes affichées par page est calculé automatiquement pour remplir l'espace disponible, sans laisser de vide en bas d'écran.

### Principe de mesure
La mesure part du **`<tbody>`** (exactement là où les lignes commencent), pas du haut de la carte. Tout ce qui est au-dessus (bannières d'alerte, PageHeader, barre de recherche, thead, padding de la carte…) est automatiquement exclu — aucune constante à maintenir pour eux.

Seul ce qui vient **après les lignes** est soustrait explicitement :
- **Desktop** : border bas conteneur (1 px) + gap (16 px) + padding bas carte (16 px) + padding bas main (16 px) = 49 px
- **Mobile** : gap (16 px) + padding bas carte (16 px) + padding bas main (16 px) = 48 px

### Hauteurs de référence
- **Desktop** : hauteur par ligne = 37 px (TableCell `p-2` + `text-sm` + border)
- **Mobile** : hauteur par carte = 160 px
- **Minimum** : 5 lignes/cartes par page
- **Calcul** : `Math.max(5, Math.floor((mainBottom − containerTop − paginationHeight − postOverhead) / rowHeight))`

### Comportement
- Calcul au montage + à 300 ms (pour les bannières qui apparaissent après chargement)
- Recalcul à chaque `resize` fenêtre (débounce 200 ms)
- Guard same-value : `setPageSize` n'est appelé que si la valeur change (évite les boucles de re-render)

Implémenté dans `DataTable.tsx` (prop `autoPageSize`, activée par défaut). Aucune configuration par page n'est requise.

Pour désactiver sur un tableau embarqué (ex : modal, widget) :
```tsx
<DataTable autoPageSize={false} ... />
```