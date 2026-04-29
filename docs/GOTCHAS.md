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

