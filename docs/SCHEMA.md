# SCHEMA.md — Schéma Base de Données

## Base de données : Supabase (PostgreSQL)
## Project URL : https://yirxzhazygrvymtfikap.supabase.co

---

## Principe d'isolation (RLS)
Chaque table contient `user_id` → auth.users(id).
RLS activé sur toutes les tables.
Chaque utilisateur voit et modifie UNIQUEMENT ses propres données.

---

## Tables

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
user_id       UUID FK → auth.users
name          TEXT NOT NULL
type          TEXT → 'individual' | 'pack'
pieces_count  INTEGER DEFAULT 1
stock_alert   INTEGER DEFAULT 0
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```

### clients
```
id          UUID PK
user_id     UUID FK → auth.users
name        TEXT NOT NULL
phone       TEXT
address     TEXT
ice         TEXT
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

### suppliers
```
id          UUID PK
user_id     UUID FK → auth.users
name        TEXT NOT NULL
phone       TEXT
address     TEXT
ice         TEXT
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

### stock
```
id          UUID PK
user_id     UUID FK → auth.users
product_id  UUID FK → products (UNIQUE avec user_id)
quantity    INTEGER DEFAULT 0
updated_at  TIMESTAMPTZ
```

### stock_movements
```
id              UUID PK
user_id         UUID FK → auth.users
product_id      UUID FK → products
type            TEXT → 'IN' | 'OUT' | 'ADJUST'
quantity        INTEGER
reference_type  TEXT → 'purchase' | 'sale' | 'manual'
reference_id    UUID
note            TEXT
date            DATE
created_at      TIMESTAMPTZ
```

### purchases
```
id           UUID PK
user_id      UUID FK → auth.users
supplier_id  UUID FK → suppliers
reference    TEXT
date         DATE
total        NUMERIC(12,2)
paid         NUMERIC(12,2) DEFAULT 0
remaining    NUMERIC GENERATED → total - paid
status       TEXT → 'paid' | 'partial' | 'unpaid'
note         TEXT
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

### purchase_items
```
id           UUID PK
purchase_id  UUID FK → purchases (CASCADE)
product_id   UUID FK → products
quantity     INTEGER
unit_price   NUMERIC(12,2)
subtotal     NUMERIC GENERATED → quantity * unit_price
```

### supplier_payments
```
id                UUID PK
user_id           UUID FK → auth.users
purchase_id       UUID FK → purchases
amount            NUMERIC(12,2)
date              DATE
note              TEXT
methode_paiement  TEXT (nullable) ← ENUM: 'Espèces', 'Virement bancaire', 'Chèque', 'Effet', 'Traite', 'Carte bancaire'
created_at        TIMESTAMPTZ
```

### sales
```
id          UUID PK
user_id     UUID FK → auth.users
client_id   UUID FK → clients
reference   TEXT
date        DATE
total       NUMERIC(12,2)
paid        NUMERIC(12,2) DEFAULT 0
remaining   NUMERIC GENERATED → total - paid
status      TEXT → 'paid' | 'partial' | 'unpaid'
note        TEXT
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

### sale_items
```
id            UUID PK
sale_id       UUID FK → sales (CASCADE)
product_id    UUID FK → products
quantity      INTEGER
pieces_count  INTEGER ← snapshot au moment vente
unit_price    NUMERIC(12,2)
subtotal      NUMERIC GENERATED → quantity * unit_price
```

### client_payments
```
id                UUID PK
user_id           UUID FK → auth.users
sale_id           UUID FK → sales
amount            NUMERIC(12,2)
date              DATE
note              TEXT
methode_paiement  TEXT (nullable) ← ENUM: 'Espèces', 'Virement bancaire', 'Chèque', 'Effet', 'Traite', 'Carte bancaire'
created_at        TIMESTAMPTZ
```

### documents
Table unifiée pour tous les documents commerciaux.
Types : invoice (auto), receipt (auto), quote/order/delivery (manuels Phase 2)
```
id               UUID PK
user_id          UUID FK → auth.users
client_id        UUID FK → clients
sale_id          UUID FK → sales (nullable) ← pour invoice
payment_id       UUID FK → client_payments (nullable) ← pour receipt
parent_id        UUID FK → documents (nullable) ← conversion Phase 2
type             TEXT → 'invoice' | 'receipt' | 'quote' | 'order' | 'delivery'
number           TEXT (FAC-2025-001, REC-2025-001...)
date             DATE
status           TEXT → 'draft' | 'confirmed' | 'cancelled'
payment_status   TEXT → 'paid' | 'partial' | 'unpaid'
total            NUMERIC(12,2)
paid             NUMERIC(12,2)
remaining        NUMERIC GENERATED → total - paid
note             TEXT

── Snapshots client ──────────────────
client_name      TEXT
client_address   TEXT
client_ice       TEXT

── Snapshots entreprise ──────────────
company_name     TEXT
company_address  TEXT
company_phone    TEXT
company_email    TEXT
company_ice      TEXT
company_if       TEXT
company_rc       TEXT
company_tp       TEXT
company_logo_url TEXT

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
user_id      UUID FK → auth.users
type         TEXT (purchase, sale, invoice, receipt...)
year         INTEGER
last_number  INTEGER DEFAULT 0
UNIQUE(user_id, type, year)
```

---

## Transactions atomiques

### Création vente
```
1. INSERT sales
2. INSERT sale_items
3. UPDATE stock (-quantity) pour chaque produit
4. INSERT stock_movements (type: OUT, reference_type: sale)
5. INSERT documents (type: invoice, sale_id, snapshots)
6. INSERT document_items (avec product_name snapshot)
→ Tout ou rien (transaction)
```

### Création paiement client
```
1. INSERT client_payments
2. UPDATE sales SET paid = SUM(payments), status recalculé
3. INSERT documents (type: receipt, payment_id, snapshots)
→ Tout ou rien (transaction)
```

### Création achat
```
1. INSERT purchases
2. INSERT purchase_items
3. UPDATE stock (+quantity) pour chaque produit
4. INSERT stock_movements (type: IN, reference_type: purchase)
5. INSERT supplier_payments si paiement initial saisi
→ Tout ou rien (transaction)
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
