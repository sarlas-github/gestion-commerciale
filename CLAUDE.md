# CLAUDE.md — Application Gestion Commerciale

## 🎯 Projet
Application web de gestion commerciale (produits, stock, achats fournisseurs, ventes clients, facturation, paiements, dashboard).
**Multi-tenant** : plusieurs utilisateurs peuvent appartenir à la même entreprise (`company_members`). L'isolation des données se fait par `company_id`, pas par `user_id`. Le `user_id` reste présent sur chaque ligne à titre d'audit (qui a créé l'enregistrement).

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
│   ├── getCompanyId.ts   ← cache module-level du company_id courant, reset au logout
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

Toute nouvelle table métier DOIT avoir :
1. `ALTER TABLE xxx ENABLE ROW LEVEL SECURITY`
2. `CREATE POLICY "company_xxx" ON xxx FOR ALL USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id())`

**Exception — `company_members`** : utiliser `USING (user_id = auth.uid())` directement (pas le helper `get_my_company_id()`), sinon récursion infinie.

**Exception — tables enfant sans `company_id`** (`sale_items`, `purchase_items`, `document_items`) : filtrer via la table parent :
```sql
USING (sale_id IN (SELECT id FROM sales WHERE company_id = get_my_company_id()))
```

**Fonction helper** : `get_my_company_id()` est SECURITY DEFINER — elle lit `company_members` en contournant la RLS pour éviter la récursion.

Dans le code React :
- **Multi-tables → toujours via `supabase.rpc()`** : la fonction PG appelle `auth.uid()` et `get_my_company_id()` elle-même, rien à passer.
- **INSERT direct (tables simples)** → toujours inclure `user_id: user.id` ET `company_id: await getCompanyId()`.
- SELECT/UPDATE/DELETE → RLS filtre automatiquement par `company_id`.

---


## 🔑 Variables d'environnement (.env)
```
VITE_SUPABASE_URL=https://yirxzhazygrvymtfikap.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_YDEUU5wmwnsfBkMQvTlldA_DAvndiIG
```

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

## 🗄️ Migrations SQL — Règle absolue

Tout script SQL (migration, fonction, index, colonne, etc.) DOIT être créé dans :

```
supabase/migrations/DD-MM-YYYY_NN_description.sql
```

- `DD-MM-YYYY` = date du jour (Jour-Mois-Année)
- `NN` = numéro d'ordre sur 2 chiffres si plusieurs scripts le même jour (`01`, `02`…)
- `description` = nom court en minuscules avec underscores

Exemples :
```
supabase/migrations/04-05-2026_01_company_rib.sql
supabase/scripts/04-05-2026_02_products_index.sql
```

Ne jamais écrire de SQL directement dans le chat sans créer le fichier correspondant.

---

## 🗃️ Fonctions PostgreSQL — Source de vérité

`supabase/functions/` contient **la dernière version déployée** de chaque fonction RPC.

Règle à respecter à chaque modification d'une fonction :
1. Créer le script dans `supabase/scripts/YYYYMMDD_NN_description.sql`
2. Mettre à jour le fichier correspondant dans `supabase/functions/nom_fonction.sql`

Ne jamais modifier `supabase/functions/` sans créer le script de migration qui va avec.

Avant de modifier une fonction existante, toujours lire son fichier dans `supabase/functions/` — c'est la version courante, pas `supabase/scripts/` (qui est un historique).

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

Toute opération touchant plusieurs tables DOIT être implémentée via une fonction PostgreSQL appelée avec `supabase.rpc()` — JAMAIS via des await séquentiels.

```typescript
// ✅ CORRECT
await supabase.rpc('create_sale', { p_client_id, p_date, p_items, p_payments, ... })

// ❌ INTERDIT
await supabase.from('sales').insert(...)
await supabase.from('sale_items').insert(...)
await supabase.from('stock').update(...)
```

Si une étape échoue → rollback complet automatique garanti par PostgreSQL.

### Règle de détection — appliquer à CHAQUE nouveau `useMutation`

**Compter les opérations d'écriture dans le corps de `mutationFn` :**

| Décompte | Décision |
|---|---|
| 1 seule écriture | INSERT/UPDATE/DELETE direct autorisé |
| ≥ 2 écritures | **STOP — créer une fonction RPC d'abord** |

**Opérations qui comptent comme écriture :**
- `supabase.from('xxx').insert(...)`
- `supabase.from('xxx').update(...)`
- `supabase.from('xxx').delete(...)`
- `supabase.rpc('nom_fn')` qui écrit en DB (vérifier la fonction PG)

**Ne comptent PAS :**
- `supabase.from('xxx').select(...)` — lecture pure
- `supabase.rpc('get_*')` / `supabase.rpc('count_*')` — lecture pure

**Checklist avant de déclarer un hook terminé :**
```
□ Je compte les lignes supabase.from().insert/update/delete dans mutationFn
□ Si ≥ 2 → j'ai créé la fonction RPC correspondante dans supabase/migrations/
□ Si ≥ 2 → j'ai mis à jour supabase/functions/nom_fonction.sql
□ La table des fonctions ci-dessous est à jour
```

**Cas piège fréquent :** une opération qui met à jour une table + en crée/modifie une autre en cascade (ex: ajuster le stock ET logger le mouvement, créer un produit ET initialiser son stock). Ces cas SEMBLENT être une seule action métier mais touchent 2 tables → RPC obligatoire.

### Fonctions implémentées ✅

| Fonction | Tables touchées |
|---|---|
| `create_sale` | sales + sale_items + stock(-) + stock_movements(out) + client_payments |
| `update_sale` | sales + sale_items + stock(-) + stock_movements(out) + client_payments |
| `create_purchase` | purchases + purchase_items + stock(+) + stock_movements(in) + supplier_payments |
| `update_purchase` | purchases + purchase_items + stock(+) + stock_movements(in) + supplier_payments |
| `create_invoice` | documents + document_items + document_sequences |
| `create_receipt` | documents + document_items + document_sequences |
| `cancel_transaction` | sales/purchases + stock(±) + stock_movements |
| `create_client_payment` | client_payments + sales (paid, status) |
| `create_supplier_payment` | supplier_payments + purchases (paid, status) |
| `create_product` | products + stock (initialisation à 0) |
| `adjust_stock` | stock + stock_movements |

Cette règle s'applique à TOUTES les opérations multi-tables présentes et futures.

---

## 🏎️ Optimisation Egress (Filtrage par Période Serveur)

Pour éviter de télécharger inutilement l'intégralité de la base de données (Egress Supabase) sur les tables volumineuses, **le filtrage par période (mois/année) doit TOUJOURS se faire côté serveur** via les requêtes Supabase.

1. **Transactionnel (Ventes, Achats, Stock, Paiements)** :
   - Initialisation par défaut : **Toujours au mois actuel** (`String(now.getMonth() + 1)`).
   - L'option "Tous les mois" (`allowAllMonths={true}` du composant `PeriodSelector`) est **strictement interdite** pour éviter de charger des milliers de lignes dans le navigateur.

2. **Rapports et Agrégations (Dashboard, État Clients, État Fournisseurs)** :
   - Ces interfaces peuvent utiliser l'option "Tous les mois" (`allowAllMonths={true}`) car la donnée retournée est soit déjà agrégée par le serveur (fonctions RPC), soit filtrée sur un seul client/fournisseur précis.

3. **Catalogues (Clients, Fournisseurs, Produits)** :
   - Exceptions à la règle : ils n'ont pas de notion de période et sont chargés dans leur intégralité à l'ouverture de l'application pour permettre une recherche textuelle instantanée côté client.

---

## ⛔ Ce qu'il ne faut PAS faire
- Ne jamais exposer la service_role key
- Ne jamais faire de requêtes Supabase dans les composants
- Ne jamais utiliser `any` en TypeScript
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
- `SUPABASE_LIMITS.md` — Estimations de montée en charge (Scaling & Limites)
