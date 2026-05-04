# CLAUDE.md — Application Gestion Commerciale

## 🎯 Projet
Application web de gestion commerciale (produits, stock, achats fournisseurs, ventes clients, facturation, paiements, dashboard).
Multi-utilisateurs : chaque utilisateur voit uniquement ses propres données (RLS Supabase).

---

## ⚙️ Stack technique
- **Frontend** : React + Vite + TypeScript
- **Styling** : Tailwind CSS + shadcn/ui
- **Formulaires** : React Hook Form + Zod
- **Tables** : TanStack Table v8
- **Graphiques** : Recharts
- **State serveur** : TanStack Query (React Query)
- **Routing** : React Router v6
- **Backend/BD** : Supabase (PostgreSQL + Auth + RLS)
- **PDF** : jsPDF + html2canvas
- **Excel** : SheetJS (xlsx)

---

## 📁 Structure des fichiers

```
src/
├── main.tsx
├── App.tsx
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── types/
│   └── index.ts
├── hooks/
│   ├── useAuth.ts
│   └── ...
├── components/
│   ├── ui/                  ← composants shadcn (ne pas modifier)
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── PageHeader.tsx
│       ├── StatusBadge.tsx
│       ├── ConfirmDialog.tsx
│       ├── EntityCombobox.tsx
│       ├── QuickCreateModal.tsx
│       ├── MonthPicker.tsx
│       └── AmountInput.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── products/
│   ├── suppliers/
│   ├── purchases/
│   ├── clients/
│   ├── sales/
│   ├── documents/
│   ├── payments/
│   ├── reports/
│   └── settings/
└── features/
    ├── products/
    ├── suppliers/
    ├── purchases/
    ├── clients/
    ├── sales/
    ├── documents/
    ├── payments/
    └── reports/
```

## Règle d'or RLS Supabase

Toute nouvelle table DOIT avoir :
1. ALTER TABLE xxx ENABLE ROW LEVEL SECURITY
2. CREATE POLICY "user_xxx" ON xxx
   FOR ALL USING (user_id = auth.uid())

Dans le code React :
- INSERT → toujours inclure user_id: session.user.id
- SELECT/UPDATE/DELETE → RLS filtre automatiquement

---


## 🔑 Variables d'environnement (.env)
```
VITE_SUPABASE_URL=https://yirxzhazygrvymtfikap.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_YDEUU5wmwnsfBkMQvTlldA_DAvndiIG
```

---

## 🗺️ Phases de développement

### Phase 1A — Core métier (priorité absolue)
1. Auth (login, register, protection routes)
2. Paramètres entreprise (companies)
3. Produits + Stock + Mouvements
4. Fournisseurs + Achats + Paiements fournisseurs
5. Clients + Ventes + Paiements clients
   → invoice généré automatiquement à chaque vente
   → receipt généré automatiquement à chaque paiement

### Phase 1B — Présentation données
6. Grilles Paiements (clients + fournisseurs)
7. États mensuels (clients + fournisseurs)
8. Dashboard (KPIs + alertes + graphiques)

### Phase 2 — Documents manuels (après validation client)
9. Devis, Bon de commande, Bon de livraison
10. Téléchargement PDF

---

## 📐 Conventions de code

### Nommage
- Composants : `PascalCase` → `ProductList.tsx`
- Hooks : `camelCase` avec use → `useProducts.ts`
- Types : `PascalCase` → `Product`, `Sale`
- Fonctions : `camelCase` → `formatCurrency()`
- Constantes : `UPPER_SNAKE_CASE` → `DEFAULT_PAGE_SIZE`

### Règles
- Toujours typer avec TypeScript, jamais `any`
- Composants shadcn/ui en priorité
- Pas de styles inline, Tailwind uniquement
- Requêtes Supabase uniquement dans les hooks
- Toujours gérer les erreurs Supabase

---

## 💰 Format monnaie
- Devise : MAD (Dirham marocain)
- Format : `1 234,00 MAD`
- Fonction : `formatCurrency(amount: number): string`

---

## 🌍 Langue
Toute l'interface en **français** — labels, boutons, messages d'erreur, titres.

---

## 🗄️ Scripts SQL — Règle absolue

Tout script SQL (migration, fonction, index, colonne, etc.) DOIT être créé dans :

```
supabase/scripts/YYYYMMDD_NN_description.sql
```

- `YYYYMMDD` = date du jour
- `NN` = numéro d'ordre sur 2 chiffres si plusieurs scripts le même jour (`01`, `02`…)
- `description` = nom court en minuscules avec underscores

Exemples :
```
supabase/scripts/20260504_01_company_rib.sql
supabase/scripts/20260504_02_products_index.sql
```

Ne jamais écrire de SQL directement dans le chat sans créer le fichier correspondant.

---

## 📄 Documents légaux — Règle snapshot absolue

Les documents générés (factures, reçus, bons) sont **immuables** : ils doivent afficher exactement les données du moment de leur génération, même si l'entreprise ou le client modifie ses informations ultérieurement.

### Règle

Lors de la génération d'un document (`useDocuments.ts`), **tous** les champs entreprise et client doivent être snapshotés dans la table `documents` :

```
company_name, company_address, company_phone, company_email
company_ice, company_if, company_rc, company_tp, company_rib
company_couleur_marque, company_logo_url
client_name, client_address, client_ice
```

### Affichage d'un document existant

Toujours lire depuis `existingDocument.*` — **jamais** depuis `company.*` ou `client.*` (données live).

```tsx
// ✅ CORRECT — snapshot figé au moment de la génération
couleur_marque: existingInvoice.company_couleur_marque ?? '#1e40af'

// ❌ INTERDIT — donnée live, change si l'entreprise modifie ses paramètres
couleur_marque: company?.couleur_marque ?? '#1e40af'
```

### Ajout d'un nouveau champ

Si un nouveau champ entreprise/client est ajouté, il faut systématiquement :
1. Créer le script SQL (`ALTER TABLE documents ADD COLUMN company_xxx`)
2. L'ajouter au snapshot dans `useDocuments.ts`
3. Le lire depuis `existingDocument.company_xxx` dans les composants d'affichage

---

## ⚠️ Transactions atomiques — Règle absolue

Toute opération touchant plusieurs tables DOIT être 
implémentée via une fonction PostgreSQL appelée avec 
supabase.rpc() — JAMAIS via des await séquentiels.

Pattern obligatoire pour TOUTE opération multi-tables :

// ✅ CORRECT
await supabase.rpc('create_sale', { params })

// ❌ INTERDIT
await supabase.from('sales').insert(...)
await supabase.from('sale_items').insert(...)
await supabase.from('stock').update(...)

Fonctions PostgreSQL à créer dans Supabase pour :
- create_purchase → purchases + purchase_items 
  + stock(+) + stock_movements(IN) + supplier_payments
- create_sale → sales + sale_items + stock(-) 
  + stock_movements(OUT) + client_payments 
  + documents(invoice) + document_items
- create_client_payment → client_payments 
  + sales update + documents(receipt)
- create_supplier_payment → supplier_payments 
  + purchases update

Si une étape échoue → rollback complet automatique.
Cette règle s'applique à TOUTES les opérations 
multi-tables présentes et futures.

---

## ⛔ Ce qu'il ne faut PAS faire
- Ne jamais exposer la service_role key
- Ne jamais faire de requêtes Supabase dans les composants
- Ne jamais utiliser `any` en TypeScript
- Ne pas modifier `src/components/ui/`
- Ne jamais bypasser le RLS Supabase
- Ne pas créer de CSS séparé

---

## 📖 Documentation
Voir `docs/` :
- `PRD.md` — Fonctionnalités
- `SCHEMA.md` — Schéma BD
- `STACK.md` — Stack et libs
- `UX_RULES.md` — Règles UX
- `ROUTES.md` — Routes et pages
- `MOCKUPS.md` — Maquettes interfaces
- `ROADMAP.md` — Ordre d'implémentation (prompts Phase 1A → 1B → 2)
- `GOTCHAS.md` — Pièges techniques validés en dev (⚠️ lire avant tout formulaire ou hook)
- `testing.md` — Credentials de test
