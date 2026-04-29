# PRD.md — Product Requirements Document

## 🎯 Objectif
Application web de gestion commerciale permettant de gérer :
- Produits et stock
- Achats fournisseurs
- Ventes clients
- Facturation et documents commerciaux
- Paiements (clients et fournisseurs)
- Dashboard analytique

Accessible sur mobile et desktop. Multi-utilisateurs avec isolation totale des données par utilisateur (RLS Supabase).

---

## 👤 Utilisateurs
Chaque utilisateur représente une entreprise indépendante.
- Inscription / connexion via email + mot de passe (Supabase Auth)
- Lors de la première connexion → formulaire de configuration entreprise (companies)
- Chaque utilisateur voit UNIQUEMENT ses propres données

---

## 📦 MODULE 1 — Produits

### Liste produits
- Tableau avec colonnes : Nom, Type, Nb pièces, Stock actuel, Alerte stock
- Recherche temps réel par nom
- Tri par colonnes
- Pagination
- Export Excel
- Bouton "Nouveau produit"

### Formulaire produit (création/édition)
- Nom (obligatoire)
- Type : individuel | pack
- Nombre de pièces (obligatoire si pack, sinon = 1)
- Seuil d'alerte stock (optionnel)
- Validation React Hook Form + Zod

### Règles métier
- Un produit de type "pack" doit avoir pieces_count > 1
- La suppression d'un produit est bloquée s'il est utilisé dans des ventes/achats

---

## 📦 MODULE 2 — Stock

### Vue stock
- Tableau : Produit, Type, Stock actuel, Seuil alerte, Statut (OK / Faible / Rupture)
- Filtre par statut
- Indicateur visuel coloré (vert/orange/rouge)
- Export Excel

### Historique mouvements
- Tableau : Date, Produit, Type (entrée/sortie/correction), Quantité, Référence, Note
- Filtre par produit, type, période
- Pagination

### Correction manuelle de stock
- Formulaire : Produit, Quantité, Type (ajout/retrait/correction), Note
- Crée un stock_movement de type "adjust"

### Règles métier
- Achat validé → stock_movements (in) + stock quantity++
- Vente créée → stock_movements (out) + stock quantity--
- Stock ne peut pas être négatif (validation avant enregistrement)

---

## 🧾 MODULE 3 — Achats fournisseurs

### Liste achats
- Tableau : Référence, Fournisseur, Date, Total, Payé, Reste, Statut
- Recherche par fournisseur/référence
- Filtre par statut (payé/partiel/impayé) et période
- Tri par colonnes
- Pagination
- Export Excel

### Formulaire nouvel achat
- Fournisseur (autocomplétion + bouton + pour créer rapidement)
- Date
- Référence (optionnel)
- Lignes produits :
  - Produit (autocomplétion + bouton +)
  - Quantité
  - Prix unitaire
  - Sous-total calculé automatiquement
  - Bouton supprimer ligne
  - Bouton ajouter ligne
- Total calculé automatiquement
- Note (optionnel)
- À l'enregistrement : stock mis à jour automatiquement (+)

### Détail achat
- Affichage complet de l'achat
- Historique des paiements effectués
- Bouton "Ajouter paiement"
- Statut mis à jour automatiquement selon paiements

### Paiement fournisseur
- Montant
- Date
- Note
- Mise à jour automatique : paid, remaining, status dans purchases

### Règles métier
- remaining = total - paid (calculé automatiquement)
- status = 'paid' si remaining = 0, 'partial' si 0 < remaining < total, 'unpaid' si paid = 0

---

## 💰 MODULE 4 — Ventes clients

### Liste ventes
- Tableau : Référence, Client, Date, Total, Payé, Reste, Statut
- Recherche par client
- Filtre par statut et période
- Tri par colonnes
- Pagination
- Export Excel

### Formulaire nouvelle vente
- Client (autocomplétion + bouton + pour créer rapidement)
- Date
- Lignes produits :
  - Produit (autocomplétion + bouton +)
  - Quantité
  - Nb pièces (rempli automatiquement depuis le produit, éditable)
  - Prix unitaire
  - Sous-total = quantité × prix unitaire
  - Bouton supprimer ligne
- Total calculé automatiquement
- Note (optionnel)
- À l'enregistrement :
  - Stock mis à jour automatiquement (-)
  - Document de type "invoice" généré automatiquement

### Détail vente
- Affichage complet
- Lien vers la facture générée
- Historique des paiements reçus
- Bouton "Ajouter paiement"

### Paiement client
- Montant
- Date
- Note
- Mise à jour automatique : paid, remaining, status dans sales

### Règles métier
- Stock vérifié avant enregistrement (pas de vente si stock insuffisant)
- remaining = total - paid
- status mis à jour automatiquement

---

## 📄 MODULE 5 — Documents commerciaux

### Types de documents
- Devis (quote)
- Bon de commande (order)
- Bon de livraison (delivery)
- Facture (invoice) ← généré automatiquement depuis une vente

### Liste documents
- Tableau : Numéro, Type, Client, Date, Total, Statut paiement
- Filtre par type et période
- Recherche par client/numéro
- Export Excel
- Bouton télécharger PDF par ligne

### Création document
- Peut être créé indépendamment OU depuis une vente (invoice auto)
- Champs : Client, Type, Date, Numéro auto, Lignes produits, Note
- Conversion : bouton "Convertir en →" depuis tout document
  - Devis → Bon de commande
  - Bon de commande → Bon de livraison
  - Bon de livraison → Facture
- parent_id conservé à chaque conversion

### Génération PDF
- Template professionnel avec :
  - Logo + infos entreprise (depuis companies)
  - Infos client
  - Numéro et date du document
  - Tableau des produits
  - Total
  - Note
- Téléchargement direct navigateur

### Numérotation automatique
- Facture : FAC-YYYY-NNN (ex: FAC-2025-001)
- Devis : DEV-YYYY-NNN
- Bon de commande : BC-YYYY-NNN
- Bon de livraison : BL-YYYY-NNN

---

## 💳 MODULE 6 — Paiements

### Paiements clients
- Liste de tous les paiements reçus
- Filtre par client et période
- Colonnes : Date, Client, Vente ref, Montant, Note

### Paiements fournisseurs
- Liste de tous les paiements effectués
- Filtre par fournisseur et période
- Colonnes : Date, Fournisseur, Achat ref, Montant, Note

---

## 📊 MODULE 7 — États (Reporting)

### État client
- Sélecteur de mois
- Liste clients avec pour chaque client :
  - Total ventes du mois
  - Total payé du mois
  - Reste à payer du mois
- Vue synthétique sans ouvrir les factures
- Export PDF et Excel

### État fournisseur
- Sélecteur de mois
- Liste fournisseurs avec pour chaque fournisseur :
  - Total achats du mois
  - Total payé du mois
  - Reste à payer du mois
- Export PDF et Excel

---

## 📈 MODULE 8 — Dashboard

### Période
- Par défaut : mois en cours
- Sélecteur de mois libre

### Indicateurs KPI (cartes)
- Chiffre d'affaires du mois
- Total encaissé du mois
- Total à recevoir (clients)
- Total à payer (fournisseurs)
- Nombre de ventes du mois
- Marge estimée (CA - coût achats)

### Alertes
- Produits en rupture de stock
- Produits sous le seuil d'alerte
- Clients avec impayés importants

### Graphiques
- Évolution des ventes sur le mois (courbe par jour)
- Top 5 produits du mois (barres)
- Top 5 clients du mois (barres)
- Répartition ventes par produit (camembert)

---

## 🖨️ MODULE 9 — Export

### PDF
- Factures
- Devis / BC / BL
- État client mensuel
- État fournisseur mensuel

### Excel
- Liste ventes (avec filtre période)
- Liste achats (avec filtre période)
- Liste clients
- Liste fournisseurs
- État client
- État fournisseur
