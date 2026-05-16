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

## 4. `user_id` — obligatoire dans chaque INSERT
RLS filtre sur `user_id = auth.uid()` mais ne l'injecte pas. Toujours passer `user_id: user!.id` explicitement.

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

