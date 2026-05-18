# SCHEMA.md — Schéma Base de Données

## Base de données : Supabase (PostgreSQL)
## Project URL : https://yirxzhazygrvymtfikap.supabase.co

---

## Principe d'isolation (RLS) — Multi-tenant

**Isolation par `company_id`** : les données sont cloisonnées par entreprise, pas par utilisateur. Plusieurs membres peuvent appartenir à la même entreprise via `company_members`.

- `user_id` reste sur toutes les tables à titre d'**audit** (qui a créé la ligne).
- RLS filtre systématiquement sur `company_id = get_my_company_id()`.
- `get_my_company_id()` est une fonction SECURITY DEFINER qui lit `company_members` sans déclencher sa propre RLS.
- La RLS de `company_members` elle-même filtre sur `user_id = auth.uid()` (pas le helper, pour éviter la récursion).

---

## Tables

### company_members
Table pivot reliant utilisateurs et entreprises.
```
id          UUID PK
company_id  UUID FK → companies (CASCADE)
user_id     UUID FK → auth.users (CASCADE)
role        TEXT NOT NULL DEFAULT 'admin' CHECK (role = 'admin')
invited_by  UUID FK → auth.users (nullable)
created_at  TIMESTAMPTZ
UNIQUE (company_id, user_id)
```
RLS : `USING (user_id = auth.uid())` — filtre direct, PAS via `get_my_company_id()`.

### companies
```
id               UUID PK
user_id          UUID FK → auth.users
name             TEXT NOT NULL
forme_juridique  TEXT (SARL, SA, SAS...)
address          TEXT
phone            TEXT
email            TEXT
site_web         TEXT
ice              TEXT
if_number        TEXT
rc               TEXT
tp_number        TEXT
tva_number       TEXT
taux_tva_defaut  NUMERIC(5,2) DEFAULT 0
logo_url         TEXT
couleur_marque   TEXT DEFAULT '#000000'
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

### products
```
id            UUID PK
user_id       UUID FK → auth.users        ← audit
company_id    UUID FK → companies (CASCADE) ← isolation RLS
name          TEXT NOT NULL
type          TEXT → 'individual' | 'pack'
pieces_count  INTEGER DEFAULT 1
stock_alert   INTEGER DEFAULT 0
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
UNIQUE (company_id, name)
```

### clients
```
id          UUID PK
user_id     UUID FK → auth.users        ← audit
company_id  UUID FK → companies (CASCADE) ← isolation RLS
name        TEXT NOT NULL
phone       TEXT
address     TEXT
ice         TEXT
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
UNIQUE (company_id, name)
```

### suppliers
```
id          UUID PK
user_id     UUID FK → auth.users        ← audit
company_id  UUID FK → companies (CASCADE) ← isolation RLS
name        TEXT NOT NULL
phone       TEXT
address     TEXT
ice         TEXT
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
UNIQUE (company_id, name)
```

### stock
```
id          UUID PK
user_id     UUID FK → auth.users        ← audit
company_id  UUID FK → companies (CASCADE) ← isolation RLS
product_id  UUID FK → products
quantity    INTEGER DEFAULT 0
updated_at  TIMESTAMPTZ
UNIQUE (company_id, product_id)
```

### stock_movements
```
id              UUID PK
user_id         UUID FK → auth.users        ← audit
company_id      UUID FK → companies (CASCADE) ← isolation RLS
product_id      UUID FK → products
type            TEXT → 'in' | 'out' | 'adjust'   ← minuscules en DB (GOTCHA #3)
quantity        INTEGER
reference_type  TEXT → 'purchase' | 'sale' | 'manual'
reference_id    UUID
note            TEXT
date            DATE
stock_avant     NUMERIC ← snapshot avant mouvement
stock_apres     NUMERIC ← snapshot après mouvement
created_at      TIMESTAMPTZ
```

### purchases
```
id           UUID PK
user_id      UUID FK → auth.users        ← audit
company_id   UUID FK → companies (CASCADE) ← isolation RLS
supplier_id  UUID FK → suppliers
reference    TEXT
date         DATE
total        NUMERIC(12,2)
tva_rate     NUMERIC(5,2) DEFAULT 0
tva_amount   NUMERIC(12,2) DEFAULT 0
paid         NUMERIC(12,2) DEFAULT 0
remaining    NUMERIC GENERATED → total - paid
status       TEXT → 'paid' | 'partial' | 'unpaid' | 'cancelled'
note         TEXT
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
UNIQUE (company_id, reference)
```

### purchase_items
```
id            UUID PK
purchase_id   UUID FK → purchases (CASCADE)
product_id    UUID FK → products
quantity      INTEGER
pieces_count  INTEGER DEFAULT 1 ← snapshot (GOTCHA #7)
unit_price    NUMERIC(12,2)
subtotal      NUMERIC GENERATED → quantity * pieces_count * unit_price
```

### supplier_payments
```
id                UUID PK
user_id           UUID FK → auth.users        ← audit
company_id        UUID FK → companies (CASCADE) ← isolation RLS
purchase_id       UUID FK → purchases
amount            NUMERIC(12,2)
date              DATE
note              TEXT
methode_paiement  TEXT (nullable) ← 'Espèces' | 'Virement bancaire' | 'Chèque' | 'Effet' | 'Traite' | 'Carte bancaire'
created_at        TIMESTAMPTZ
```

### sales
```
id          UUID PK
user_id     UUID FK → auth.users        ← audit
company_id  UUID FK → companies (CASCADE) ← isolation RLS
client_id   UUID FK → clients
reference   TEXT
date        DATE
total       NUMERIC(12,2)
tva_rate    NUMERIC(5,2) DEFAULT 0
tva_amount  NUMERIC(12,2) DEFAULT 0
paid        NUMERIC(12,2) DEFAULT 0
remaining   NUMERIC GENERATED → total - paid
status      TEXT → 'paid' | 'partial' | 'unpaid' | 'cancelled'
note        TEXT
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
UNIQUE (company_id, reference)
```

### sale_items
```
id            UUID PK
sale_id       UUID FK → sales (CASCADE)
product_id    UUID FK → products
quantity      INTEGER
pieces_count  INTEGER DEFAULT 1 ← snapshot (GOTCHA #7)
unit_price    NUMERIC(12,2)
subtotal      NUMERIC GENERATED → quantity * pieces_count * unit_price
```

### client_payments
```
id                UUID PK
user_id           UUID FK → auth.users        ← audit
company_id        UUID FK → companies (CASCADE) ← isolation RLS
sale_id           UUID FK → sales
amount            NUMERIC(12,2)
date              DATE
note              TEXT
methode_paiement  TEXT (nullable) ← 'Espèces' | 'Virement bancaire' | 'Chèque' | 'Effet' | 'Traite' | 'Carte bancaire'
created_at        TIMESTAMPTZ
```

### documents
Table unifiée pour tous les documents commerciaux.
Types : invoice (auto), receipt (auto), quote/order/delivery (manuels Phase 2)
```
id               UUID PK
user_id          UUID FK → auth.users        ← audit
company_id       UUID FK → companies (CASCADE) ← isolation RLS
client_id        UUID FK → clients
sale_id          UUID FK → sales (nullable)            ← pour invoice
payment_id       UUID FK → client_payments (nullable)  ← pour receipt
parent_id        UUID FK → documents (nullable)        ← conversion Phase 2
type             TEXT → 'invoice' | 'receipt' | 'quote' | 'order' | 'delivery'
number           TEXT (FAC-2025-001, REC-2025-001...)
date             DATE
status           TEXT → 'draft' | 'confirmed' | 'cancelled'
payment_status   TEXT → 'paid' | 'partial' | 'unpaid'
total            NUMERIC(12,2)
tva_rate         NUMERIC(5,2) DEFAULT 0
tva_amount       NUMERIC(12,2) DEFAULT 0
paid             NUMERIC(12,2)
remaining        NUMERIC GENERATED → total - paid
note             TEXT
mode_paiement    TEXT (nullable)

── Snapshots client ──────────────────
client_name      TEXT
client_address   TEXT
client_ice       TEXT
client_phone     TEXT

── Snapshots entreprise (figés à la génération) ──
company_name          TEXT
company_address       TEXT
company_phone         TEXT
company_email         TEXT
company_ice           TEXT
company_if            TEXT
company_rc            TEXT
company_tp            TEXT
company_rib           TEXT
company_site_web      TEXT
company_couleur_marque TEXT
company_logo_url      TEXT

created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

### document_items
```
id            UUID PK
document_id   UUID FK → documents (CASCADE)
product_id    UUID FK → products
product_name  TEXT ← snapshot nom produit
quantity      INTEGER
pieces_count  INTEGER
unit_price    NUMERIC(12,2)
subtotal      NUMERIC GENERATED → quantity * unit_price
```

### document_sequences
```
id           UUID PK
user_id      UUID FK → auth.users        ← audit
company_id   UUID FK → companies (CASCADE) ← isolation RLS
type         TEXT (purchase, sale, invoice, receipt...)
year         INTEGER
last_number  INTEGER DEFAULT 0
UNIQUE (company_id, type, year)   ← séquence par entreprise (pas par user)
```

---

## Transactions atomiques (fonctions PostgreSQL SECURITY DEFINER)

Toutes les opérations multi-tables sont des fonctions PL/pgSQL appelées via `supabase.rpc()`. Rollback automatique si une étape échoue. Elles récupèrent `auth.uid()` et `get_my_company_id()` elles-mêmes — ne pas les passer en paramètre.

### `create_sale(p_client_id, p_date, p_note, p_tva_rate, p_items, p_payments)`
```
1. INSERT document_sequences (séquence atomique → VEN-YYYY-NNN)
2. INSERT sales
3. Pour chaque article : INSERT sale_items + UPDATE stock(-) + INSERT stock_movements(out)
4. Pour chaque paiement : INSERT client_payments
→ Retourne : sale_id (uuid)
```

### `update_sale(p_id, p_client_id, p_date, p_note, p_tva_rate, p_items, p_payments)`
```
1. Vérification ownership (company_id)
2. UPDATE sales header
3. Pour articles existants (original_id) : UPDATE sale_items (prix uniquement)
4. Pour nouveaux articles : INSERT sale_items + UPDATE stock(-) + INSERT stock_movements(out)
5. DELETE client_payments + re-INSERT
→ Retourne : void
```

### `create_purchase(p_supplier_id, p_date, p_note, p_tva_rate, p_items, p_payments)`
```
1. INSERT document_sequences (séquence atomique → ACH-YYYY-NNN)
2. INSERT purchases
3. Pour chaque article : INSERT purchase_items + UPDATE stock(+) + INSERT stock_movements(in)
4. Pour chaque paiement : INSERT supplier_payments
→ Retourne : purchase_id (uuid)
```

### `update_purchase(p_id, p_supplier_id, p_date, p_note, p_tva_rate, p_items, p_payments)`
```
1. Vérification ownership (company_id)
2. UPDATE purchases header
3. Pour articles existants : UPDATE purchase_items (prix uniquement)
4. Pour nouveaux articles : INSERT purchase_items + UPDATE stock(+) + INSERT stock_movements(in)
5. DELETE supplier_payments + re-INSERT
→ Retourne : void
```

### `create_invoice(p_sale_id, p_client_id, p_date, ...)` ✅
```
INSERT documents (type: invoice) + INSERT document_items
→ Retourne : document_id
```

### `create_receipt(p_payment_id, p_sale_id, ...)` ✅
```
INSERT documents (type: receipt) + INSERT document_items
→ Retourne : document_id
```

### `cancel_transaction(p_id, p_type)` ✅
```
UPDATE sale/purchase status = 'cancelled'
+ stock_movements inversés + UPDATE stock
```

---

## Numérotation documents
```
Facture  : FAC-YYYY-NNN
Reçu     : REC-YYYY-NNN
Achat    : ACH-YYYY-NNN
Vente    : VEN-YYYY-NNN
Devis    : DEV-YYYY-NNN (Phase 2)
BC       : BC-YYYY-NNN  (Phase 2)
BL       : BL-YYYY-NNN  (Phase 2)
```
NNN = séquentiel par type, par année, par utilisateur.

---

## Numérotation documents (document_sequences)

Table dédiée pour les séquences :
- user_id, type, year, last_number
- Incrémentée à chaque création de document
- Numéro jamais réutilisé même après suppression
- Format : FAC-2025-001, REC-2025-001 etc.

Règle : toujours lire last_number + 1 depuis 
document_sequences avant de créer un document.


---

## Calcul statut stock
```
quantity = 0              → 'rupture' (🔴)
quantity <= stock_alert   → 'faible'  (🟡)
quantity > stock_alert    → 'ok'      (🟢)
```

## Calcul statut paiement
```
paid = 0          → 'unpaid'
paid < total      → 'partial'
paid = total      → 'paid'
```
