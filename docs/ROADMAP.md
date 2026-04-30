# ROADMAP.md — Ordre d'implémentation
## Prompts Claude Code — Phase 1A → 1B

> ⚠️ Tester après chaque prompt avant de passer au suivant
> 💡 Commencer chaque nouvelle session par : "Lis CLAUDE.md et tous les fichiers dans docs/ avant de continuer."

---

## PROMPT 0 — Correction Mouvements Stock
```
Sépare les mouvements stock en page indépendante :

1. /products → grille produits uniquement 
   (Nom, Type, Pièces, Stock, Seuil, Statut, Actions)
   avec bouton correction stock 📦 par ligne (modale)

2. /stock/movements → nouvelle page historique mouvements
   (Date, Produit, Type IN/OUT/ADJUST, Quantité, 
   Référence cliquable, Note)

3. Sidebar groupe CATALOGUE :
   📦 Produits         → /products
   📊 Mouvements stock → /stock/movements

4. Mets à jour ROUTES.md et MOCKUPS.md pour refléter 
   ces changements.
```

---

## PROMPT 1 — Auth
```
Crée le système d'authentification complet :
- Page /login : formulaire email + mot de passe
- Page /register : formulaire inscription
- Protection des routes (redirect vers /login si non connecté)
- Redirect vers /setup si première connexion (pas de company)
- Page /setup : formulaire création entreprise (tous les champs 
  de la table companies définis dans SCHEMA.md)
- Hook useAuth.ts pour gérer l'état utilisateur
- Logout dans la sidebar en bas
Utilise Supabase Auth. Interface en français.
```

---

## PROMPT 2 — Paramètres
```
Crée la page /settings exactement comme défini dans 
MOCKUPS.md section 19 :
- Logo upload (PNG/JPG max 2Mo, stocké dans Supabase Storage)
- Informations entreprise (nom, forme juridique, email, 
  téléphone, site web, adresse)
- Identifiants légaux (ICE, IF, RC, TP)
- Taux TVA par défaut
- Couleur de marque avec sélecteur
- Bouton Enregistrer avec loading state
- Afficher nom entreprise et logo dans la sidebar
Utilise les champs de la table companies dans SCHEMA.md.
```

---

## PROMPT 3 — Produits ((fait))
```
Crée le module produits complet :
- Page /products exactement comme MOCKUPS.md section 2
- Formulaire création/édition comme MOCKUPS.md section 3
  (modale ou page, type pack affiche pièces)
- Modale correction stock comme MOCKUPS.md section 5
- Hook useProducts.ts pour tous les CRUD
- Confirmation suppression (bloquée si produit utilisé)
- Stock coloré selon statut (OK/Faible/Rupture)
- Badge rouge sur Produits dans sidebar si alertes actives
Respecte UX_RULES.md pour validation et autocomplete.
```

---

## PROMPT 4 — Mouvements Stock 
```
Crée la page /stock/movements exactement comme 
MOCKUPS.md section 4 :
- Grille avec colonnes Date, Produit, Type, Quantité, 
  Référence, Note
- Filtre par type (Tous/IN/OUT/ADJUST) et période
- Référence cliquable → navigate vers achat ou vente
- Hook useStockMovements.ts
```

---

## PROMPT 5 — Fournisseurs -fait-
```
Crée le module fournisseurs complet :
- Page /suppliers exactement comme MOCKUPS.md section 6
  (avec colonne Total dû et Statut calculés)
- Formulaire création/édition (Nom, Téléphone, Adresse, ICE)
- Fiche /suppliers/:id avec 4 onglets comme MOCKUPS.md 
  section 7 : Infos, Achats, Paiements, État (MonthPicker)
- Hook useSuppliers.ts
Respecte UX_RULES.md.
```

---

## PROMPT 6 — Achats  -fait-
```
Crée le module achats complet :
- Page /purchases exactement comme MOCKUPS.md section 8
- Composant réutilisable PurchaseForm.tsx pour création 
  ET édition exactement comme MOCKUPS.md section 9 :
  * Fournisseur autocomplete + bouton [+] modale
  * Grille produits (autocomplete + [+], qté, prix, sous-total)
  * Grille paiements (date, montant, note, supprimer)
  * Payé/Reste/Statut calculés en temps réel
- À l'enregistrement transaction atomique :
  * INSERT purchases + purchase_items
  * UPDATE stock (+) pour chaque produit
  * INSERT stock_movements (type: IN)
  * INSERT supplier_payments si paiements saisis
- Édition avec paiements → lignes produits non modifiables
- Hook usePurchases.ts
```

---

## PROMPT 7 — Clients
```
Crée le module clients complet :
- Page /clients exactement comme MOCKUPS.md section 10
  (avec Total dû et Statut calculés)
- Formulaire création/édition (Nom, Téléphone, Adresse, ICE)
- Fiche /clients/:id avec 4 onglets comme MOCKUPS.md 
  section 11 : Infos, Ventes, Paiements, État (MonthPicker)
- Hook useClients.ts
Respecte UX_RULES.md.
```

---

## PROMPT 8 — Ventes 
```
Crée le module ventes complet :
- Page /sales exactement comme MOCKUPS.md section 12
- Composant réutilisable SaleForm.tsx pour création 
  ET édition exactement comme MOCKUPS.md section 13 :
  * Client autocomplete + bouton [+] modale
  * Grille produits (autocomplete + [+], qté, prix, sous-total)
  * Vérification stock en temps réel par ligne
  * Grille paiements (date, montant, note, supprimer)
  * Payé/Reste/Statut calculés en temps réel
- À l'enregistrement transaction atomique :
  * INSERT sales + sale_items
  * UPDATE stock (-) pour chaque produit
  * INSERT stock_movements (type: OUT)
  * INSERT client_payments si paiements saisis
  * INSERT documents (type: invoice) avec snapshots complets
  * INSERT document_items avec product_name snapshot
  * Numérotation depuis document_sequences (SCHEMA.md)
- Édition avec paiements → lignes produits non modifiables
- Hook useSales.ts
```

---

## PROMPT 9 — Paiements (Phase 1B)
```
Crée les pages paiements :
- /payments/clients exactement comme MOCKUPS.md section 14
- /payments/suppliers exactement comme MOCKUPS.md section 15
- Référence cliquable vers vente/achat
- Total calculé sur données filtrées
- Pages lecture seule
- Hooks useClientPayments.ts et useSupplierPayments.ts
```

---

## PROMPT 10 — États (Phase 1B)
```
Crée les pages états :
- /reports/clients exactement comme MOCKUPS.md section 16
- /reports/suppliers exactement comme MOCKUPS.md section 17
- MonthPicker avec navigation ← →
- Tableau synthétique avec totaux en bas
- Reste coloré (🔴 si > 0, 🟢 si = 0)
- Export PDF et Export Excel
- Hooks useClientReport.ts et useSupplierReport.ts
```

---

## PROMPT 11 — Dashboard (Phase 1B)
```
Crée le dashboard complet exactement comme 
MOCKUPS.md section 18 :
- MonthPicker en haut
- 6 cartes KPI : CA, Encaissé, À recevoir, À payer, 
  Nb ventes, Marge (CA - achats du mois)
- Section alertes stock (produits rupture + faible)
- 4 graphiques Recharts :
  * Évolution ventes par jour du mois (courbe)
  * Top 5 produits du mois (barres horizontales)
  * Top 5 clients du mois (barres horizontales)
  * Répartition ventes par produit (camembert)
- Hook useDashboard.ts
```

---

## BUGS & AJUSTEMENTS (à remplir au fur et à mesure)

```
faits:
- mask telephone numero marocain (XX XX XX XX XX)
- achat : popup d'ajout de produit utilise ProductForm (conforme à products/new)
- achat : colonne "Pièces" ajoutée et intégrée au calcul du total (Qté * Pièces * PU)
-referece pas optionnel, des la creation on doit trouver le bon numero seuqentiel
et l alimenter avec, si a la sauvegardee ca existe on l augmente, meme chose pour la
vente avec le bon prefix: ACH, VEN reciproquement
- toutes les lignes dans la grille doivent etre sorté en decroissance par date par defaut, et quand on fait un ajout de ligne nrmalement si le filtre par defaut est appliqué on doit l avoir en premier
- enlever la liste de noms qui s affiche par le navigateur quand on veut saisir un nouveau produit
- visualiser editer meme chose en grille achat, enlever visualiser
- mobile system cards dans les grilles , faut pas avoir scroll horizontal dans grille
fix autours de menu :
- a fixer dans mobile ca s'affiche 2 foix la croix pour cloturer, enlever la barre supplementaire en rouge qui a juste le croix
- ajouter aussi dans pc: menu collapsible, qui s ouvre et se ferme
- l icone de notification,a e remplacer avec systeme de compte en login quand je clique au dessus je vois nom complet avec possibilité de déconnexion
il faut ajuster doc md de ux pour specifier ces ajustements
- changements etats
- le meme systeme de selection de periode doit se faire dans tdb
- tdb les stats a faire par mois, il faut qu il peut selectionner directement le mois
ou l année
fixe cela :
- dans vente et achat, si ja'ajoute par bouton + l'item doit etre par defaut sélectionner
- y a un bug dans onglet état spécifique de client ou fournisseur : le calcul ne se fait pas
- y a un bug dans reference de coté achat et vente : ca doit etre incrementielmntn il fait valeur fixe
- masque menu paramétrage, et documents
---
pending:
-mouvement de stock: la representation doit etre meme que dans etat fournisseur de header
-dans paramétrage valeur TVA : a la tte prmeiere ouverture l'application doit avoir valeur par defaut: 0 et bien sur l utilisateur peut la cahnager et sa sauvegarde. et dans calcul de total cout de produit 
que ce soit 

```
pending
-est ce possible pour 
nouveau/edit de produit , de founisseur, de client
de la traiter avec popup comme on a pour correction de stock
tu me suis ?

ajout champ date creation + tri dans tous les grilles par date de création ordre décroissant
et le tri sur data de creation doit etre visible

notif  bardans mobile 



---

## Phase 2 — Documents (après validation client)
```
⏸️ Devis, Bon de commande, Bon de livraison
⏸️ Téléchargement PDF facture et reçu
⏸️ Paramètres complets (couleur marque sur PDF)
```
