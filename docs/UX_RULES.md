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
- Chaque ligne : autocomplete produit + bouton [+], quantité, prix unitaire, sous-total, supprimer
- Bouton [+ Ajouter une ligne] en bas
- Minimum 1 ligne
- Sous-total recalculé en temps réel
- Total général recalculé en temps réel
- Quantité et prix : auto-select au focus

### Grille paiements
- Colonnes : Date, Montant, Note, Supprimer
- Bouton [+ Ajouter un paiement] en bas
- Affichage temps réel : Payé, Reste, Statut
- Disponible en création ET édition

### Règles édition
- Sans paiements → édition complète autorisée
- Avec paiements → lignes produits non modifiables, message explicatif
- Seuls Date et Note restent éditables si paiements existants

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

---

## 14. Numéros de téléphone (Maroc)

Tout numéro de téléphone doit être affiché et saisi selon le format marocain :
- **Format** : `XX XX XX XX XX` (ex: `06 69 29 58 00`)
- **Saisie** : Utiliser un masque de saisie qui ajoute les espaces automatiquement.
- **Affichage** : Toujours formater avec des espaces dans les tableaux et les fiches détails.
- **Stockage** : Stocker uniquement les chiffres (10 caractères) en base de données pour faciliter les recherches.