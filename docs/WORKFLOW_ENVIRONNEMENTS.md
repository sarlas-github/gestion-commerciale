# 🚀 Guide Workflow Supabase — Local ↔ Production

---

## ⚡ Commandes rapides (anti-oubli)

```bash
# Libérer les ports Docker si bloqués
net stop winnat && net start winnat

# Démarrer l'environnement local
npx supabase start

# Récupérer les clés locales (URL + anon key)
npx supabase status

# Reset complet de la BD locale (repart du baseline + migrations)
npx supabase db reset

# Lancer l'app connectée au réseau Tailscale (test mobile)
npm run dev -- --host
```

**Accès mobile (Tailscale ON) :**
- App : `http://100.98.128.42:5173`
- Studio local : `http://127.0.0.1:54323`

**Créer un user de test :**
```sql
SELECT public.create_app_user('test.banina@gmail.com', 'Démo123', 'banina', 'production');
```

---

## 🗂️ Nomenclature des migrations

Tout fichier SQL va dans `supabase/migrations/` avec ce format :

```
YYYYMMDDHHMMSS_CATÉGORIE_description.sql
```

| Catégorie | Quand l'utiliser |
|---|---|
| `_ARCHI_` | Changement de structure : CREATE/ALTER TABLE, colonnes, index, contraintes, RLS ENABLE |
| `_OBJETS_` | Objets DB : fonctions PG, RLS policies, triggers, vues, storage buckets |

**Exemples :**
```
20260520143000_ARCHI_add_invoice_columns.sql
20260520143001_OBJETS_update_create_sale_function.sql
```

> Les anciennes migrations sont archivées dans `supabase/migrations/archive/` — lecture seule.

---

## 🔄 Cycle de travail quotidien

### 1. Créer une migration

```bash
# Créer le fichier (nommer avec timestamp actuel)
# Exemple : 20260520143000_ARCHI_description.sql
```

Écrire le SQL dans le fichier.  
Si c'est une fonction → mettre aussi à jour `supabase/functions/nom_fonction.sql`.

### 2. Tester en local

```bash
# Applique toutes les migrations en attente sur Docker local
npx supabase db push --local
```

Ou pour tout repartir de zéro (baseline + toutes les migrations) :

```bash
npx supabase db reset
```

### 3. Déployer en production

```bash
# Applique les migrations en attente sur la BD prod (projet lié)
npx supabase db push
```

---

## 🎯 Local vs Production — Résumé

| Commande | Cible |
|---|---|
| `npx supabase db push` | **Production** (projet lié `yirxzhazygrvymtfikap`) |
| `npx supabase db push --local` | **Docker local** |
| `npx supabase db dump --linked` | Dump depuis **Production** |
| `npx supabase db dump --local` | Dump depuis **Docker local** |
| `npx supabase db reset` | Recrée **Docker local** depuis zéro (baseline + migrations) |
| `npx supabase migration list` | Voir quelles migrations sont appliquées sur LOCAL et REMOTE |

---

## 🔧 Repartir sur une nouvelle BD locale

Quand tu veux une BD locale propre (nouveau PC, environnement cassé, etc.) :

```bash
# 1. Démarrer Docker local
npx supabase start

# 2. Appliquer toutes les migrations (baseline + suite)
npx supabase db reset

# 3. Récupérer les clés locales générées
npx supabase status
# → Copier VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.development

# 4. (Optionnel) Récupérer les données de prod pour tester
npx supabase db dump --linked --data-only -f supabase/seed.sql
npx supabase db reset  # relancer pour inclure le seed
```

> `db reset` rejoue dans l'ordre tous les fichiers `supabase/migrations/*.sql` + `supabase/seed.sql` si présent.

---

## 🏗️ Créer un nouveau baseline (nouvelle version)

Quand l'historique de migrations est trop long et qu'on veut archiver :

```bash
# 1. Archiver les migrations actuelles
mv supabase/migrations/*.sql supabase/migrations/archive/

# 2. Générer le nouveau baseline depuis la prod
npx supabase db dump --linked --file supabase/migrations/YYYYMMDDHHMMSS_ARCHI_v3_baseline.sql

# 3. Marquer le baseline comme déjà appliqué sur prod (pas besoin de le relancer)
npx supabase migration repair --status applied YYYYMMDDHHMMSS

# 4. Vérifier
npx supabase migration list
```

---

## 🔑 Setup initial (nouveau PC ou nouveau projet)

```bash
# 1. Connexion Supabase (une fois par PC)
npx supabase login

# 2. Lier au projet prod
npx supabase link --project-ref yirxzhazygrvymtfikap

# 3. Démarrer local
npx supabase start

# 4. Appliquer les migrations en local
npx supabase db reset
```

---

## 📏 Règles d'or

- **Jamais de SQL direct** dans le dashboard Supabase cloud — toujours via un fichier de migration.
- **Un fichier = immuable** — on ne modifie jamais un fichier existant dans `migrations/`, on crée un nouveau.
- **Fonctions PG** → toujours mettre à jour aussi `supabase/functions/nom.sql` (source de vérité).
- **`db reset` ne touche pas la prod** — uniquement le Docker local.
