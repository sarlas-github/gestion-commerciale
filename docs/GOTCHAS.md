# GOTCHAS.md — Pièges techniques
> Lire avant tout formulaire ou hook Supabase.

---

## 1. @base-ui/react — `register()` ne fonctionne pas
`InputPrimitive` ne forward pas le ref RHF → valeur `undefined` au submit → Zod échoue.

**Fix :** `Controller` pour tous les inputs shadcn. `register()` uniquement pour `<input type="radio|checkbox">` natifs. `noValidate` sur `<form>`.

---

## 2. Inputs numériques — conversion string→number
Schéma : `z.number({ invalid_type_error: 'Veuillez entrer un nombre valide' })` (pas `coerce`, pas `preprocess`).

Conversion dans le `onChange` du Controller :
```ts
onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
// Ou fallback 0 pour champs optionnels :
onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
```
`onFocus={e => e.target.select()}` sur tous les inputs numériques (UX_RULES).

---

## 3. `stock_movements.type` — minuscules en DB
TS : `'IN' | 'OUT' | 'ADJUST'` mais CHECK constraint DB : `('in', 'out', 'adjust')`. Toujours insérer en minuscules.

---

## 4. `user_id` + `company_id` — obligatoires dans chaque INSERT direct

Depuis la migration multi-tenant, chaque INSERT direct (single table via `supabase.from().insert()`) doit inclure **les deux** :

```ts
// ✅ CORRECT — INSERT direct (clients, suppliers, products, stock…)
const [user, companyId] = await Promise.all([getCurrentUser(), getCompanyId()])
.insert({ ...input, user_id: user.id, company_id: companyId })

// ❌ INTERDIT — manque company_id → RLS bloque l'accès
.insert({ ...input, user_id: user.id })
```

**Exception — opérations multi-tables via RPC** : les fonctions PostgreSQL (`create_sale`, `create_purchase`, `create_invoice`, `create_receipt`…) obtiennent `auth.uid()` et `get_my_company_id()` elles-mêmes en interne. Ne pas les passer en paramètre.

```ts
// ✅ CORRECT — RPC, aucun user_id/company_id à passer
await supabase.rpc('create_sale', { p_client_id, p_date, p_items, p_payments })
```

---

## 5. Supabase join 1-1 retourne un tableau
`select('*, stock(*)')` → `stock` est un `Stock[]`. Extraire : `Array.isArray(s) ? s[0] ?? null : s`.

---

## 6. Colonnes GENERATED — ne jamais insérer
`subtotal` dans `purchase_items`, `sale_items` et `document_items` est GENERATED (`quantity * unit_price`).
`remaining` dans `purchases`, `sales` et `documents` est GENERATED (`total - paid`).
Ne jamais inclure ces champs dans un INSERT/UPDATE → erreur "cannot insert a non-DEFAULT value".

---

## 7. `pieces_count` — toujours snapshoter à l'insertion

---

## 8. RLS `company_members` — NE PAS utiliser `get_my_company_id()`

La politique RLS de `company_members` **doit** filtrer sur `user_id = auth.uid()` directement, jamais via `get_my_company_id()`.

`get_my_company_id()` est SECURITY DEFINER et lit `company_members` sans RLS. Si la RLS de `company_members` elle-même appelait `get_my_company_id()`, elle déclencherait une récursion infinie → erreur Supabase.

```sql
-- ✅ CORRECT
CREATE POLICY "user_company_members" ON public.company_members
  USING (user_id = auth.uid());

-- ❌ RÉCURSION INFINIE
CREATE POLICY "company_company_members" ON public.company_members
  USING (company_id = get_my_company_id());
```

---

## 10. Modifier la signature d'une fonction PostgreSQL — `DROP` + `CREATE` obligatoire

`CREATE OR REPLACE FUNCTION` échoue avec `ERROR 42P13` dès qu'on supprime ou renomme un paramètre. PostgreSQL autorise uniquement l'ajout de paramètres WITH DEFAULT à la fin.

**Fix :** `DROP FUNCTION IF EXISTS` sur toutes les signatures existantes, puis `CREATE FUNCTION`.

```sql
-- ✅ CORRECT — signature modifiée (paramètre supprimé ou renommé)
DROP FUNCTION IF EXISTS public.ma_fonction(text, text, text, text);
DROP FUNCTION IF EXISTS public.ma_fonction(text, text, text, text, text);
CREATE FUNCTION public.ma_fonction(p_email text, p_password text, p_mode text DEFAULT 'revente')
...

-- ❌ ERREUR 42P13 — impossible si un param est renommé/supprimé
CREATE OR REPLACE FUNCTION public.ma_fonction(p_email text, p_password text, p_mode text DEFAULT 'revente')
```

Lister toutes les surcharges connues dans les `DROP` pour ne rien laisser en base.

---

## 9. JSONB null vs string `'null'` dans les fonctions PostgreSQL

Quand JavaScript sérialise `null` dans un objet JSON passé à `supabase.rpc()`, PostgreSQL reçoit la chaîne `'null'` (pas SQL NULL). La vérification `IS NOT NULL` seule ne suffit pas.

S'applique notamment au champ `original_id` dans `update_sale` / `update_purchase` pour distinguer articles existants (à mettre à jour) de nouveaux articles (à insérer) :

```sql
-- ✅ CORRECT — double vérification
IF (v_item->>'original_id') IS NOT NULL
   AND (v_item->>'original_id') <> 'null' THEN
  UPDATE ...  -- article existant
ELSE
  INSERT ...  -- nouvel article + stock + movement
END IF;

-- ❌ INSUFFISANT — passe si JS envoie null sérialisé en 'null'
IF (v_item->>'original_id') IS NOT NULL THEN
```

---


Le calcul du total HT est `quantity × pieces_count × unit_price`. `pieces_count` doit être inséré explicitement dans `purchase_items` et `sale_items` au moment de la transaction — ne pas le laisser au DEFAULT (1).

```ts
// ✅ CORRECT
items.map(i => ({ ..., pieces_count: i.pieces_count || 1 }))

// ❌ INTERDIT — le DEFAULT 1 écrase la vraie valeur du produit
items.map(i => ({ quantity: i.quantity, unit_price: i.unit_price }))
```

En édition, lire le snapshot stocké (`i.pieces_count`) et non la donnée live du produit (`i.products?.pieces_count`).

```ts
// ✅ CORRECT — snapshot prioritaire, fallback produit live pour anciennes données
pieces_count: Number(i.pieces_count ?? i.products?.pieces_count ?? 1)
```

