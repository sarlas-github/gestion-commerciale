# Environnements & traçabilité BD

## Structure des fichiers SQL

```
supabase/
├── baseline.sql        ← schéma complet à date (généré via CLI, voir ci-dessous)
├── functions/          ← source de vérité des fonctions PostgreSQL
│   └── nom_fonction.sql    (toujours à jour avec la version déployée)
├── migrations/         ← historique des évolutions, une par fonctionnalité
│   └── YYYYMMDDHHMMSS_description.sql
└── redressement/       ← corrections one-shot (données), jamais exécutées sur prod
```

---

## Générer / mettre à jour baseline.sql

### Installation (une seule fois)
```bash
npm install -g supabase
supabase link --project-ref <project-ref-dev>
# Le project-ref est dans Supabase Dashboard → Settings → General
# Il faut aussi le DB password : Settings → Database → Database password
```

### Générer le baseline
```bash
npm run db:dump
# ou directement :
supabase db dump --linked -f supabase/migrations/YYYYMMDDHHMMSS_v1_baseline.sql
```

**Quand le faire :** avant de pousser une nouvelle version en prod, ou quand on veut figer l'état actuel pour initialiser une nouvelle BD.

---

## Séparation dev / prod

Deux projets Supabase distincts. Deux fichiers `.env` à la racine :

| Fichier | Usage |
|---|---|
| `.env.development` | BD de développement / test |
| `.env.production` | BD de production |

```bash
npm run dev                          # dev, hot reload, .env.development
npx vite build --mode development   # build de validation en local → .env.development
                                     # ← à utiliser pour détecter les erreurs TS/bundle
                                     #   sans toucher la BD prod
npm run preview                      # sert le build localement dans le navigateur
npm run build                        # build final prod → .env.production (CI/deploy uniquement)
```

---

## Initialiser une nouvelle BD vierge

```
1. Créer un nouveau projet Supabase
2. Exécuter supabase/baseline.sql dans le SQL editor
3. C'est tout — la BD est à l'état actuel
```

---

## Workflow pour chaque nouvelle fonctionnalité

```
1. Écrire le script     →  supabase/migrations/YYYYMMDDHHMMSS_feature.sql
2. Appliquer sur DEV    →  Supabase dashboard dev › SQL editor
3. Tester avec npm run dev
4. Valider ✅
5. Appliquer sur PROD   →  Supabase dashboard prod (même script exact)
6. Si fonction PG modifiée → mettre à jour supabase/functions/nom_fonction.sql
7. Optionnel            →  npm run db:dump  (régénérer baseline.sql)
```

---

## Règles absolues

- Ne **jamais** appliquer un script directement en prod sans l'avoir testé en dev
- Ne **jamais** modifier `supabase/functions/` sans créer le script migration qui va avec
- Les fichiers `redressement/` ne sont **jamais** rejoués — ils sont conservés pour trace uniquement
- Toute nouvelle table doit avoir RLS + policy `user_id = auth.uid()`
