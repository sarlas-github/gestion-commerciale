# Workflow des Environnements & Migrations (Supabase)

Puisque vous rédigez vos scripts de base de données (SQL) directement et manuellement dans le dossier `supabase/migrations`, vous avez adopté **la meilleure pratique** (Migration-First). 

Supabase est conçu *exactement* pour fonctionner comme cela. Il lit les fichiers de ce dossier dans l'ordre chronologique (grâce au nommage obligatoire `YYYYMMDDHHMMSS_nom.sql`) pour recréer la base de données.

Voici le workflow complet pour gérer vos 3 environnements (DEV, TEST, PROD) sans accroc.

---

## 🛠️ 1. Environnement de DEV (Local)
Cet environnement tourne sur votre propre machine (via Docker) avec l'outil gratuit `Supabase CLI`. Vous n'avez pas besoin de connexion internet pour que la DB fonctionne.

### Initialisation (à faire une fois)
```bash
# 1. Démarrez le moteur Supabase localement (Docker doit être allumé)
npx supabase start
```
*À ce moment, Supabase local va lire TOUT votre dossier `supabase/migrations` et créer une base de données locale parfaitement identique à votre base en ligne.*

### Travail au quotidien (Créer une nouveauté)
1. Vous avez besoin d'une nouvelle table ou fonction.
2. Créez un fichier manuel : `supabase/migrations/20260601000000_nouvelle_table.sql`.
3. Rédigez votre SQL dedans.
4. Appliquez-le à votre environnement local pour le tester :
```bash
npx supabase db reset
# OU
npx supabase migration up
```
*Vous pouvez maintenant coder votre frontend React, tester, casser des choses, sans impacter personne.*

---

## 🧪 2. Environnement de TEST (Cloud - Projet Actuel)
C'est le projet Supabase que vous avez déjà en ligne en ce moment. Il sert pour vos démos clients et vos tests en conditions réelles.

### Le déploiement (Push)
Une fois que votre code React et vos nouvelles migrations SQL locales fonctionnent parfaitement, vous devez envoyer les modifications SQL sur le projet de TEST.

```bash
# 1. Liez votre terminal au projet de TEST (à faire une fois)
npx supabase link --project-ref <REFERENCE_PROJET_TEST>

# 2. Poussez vos nouveaux fichiers de migrations vers le cloud
npx supabase db push
```
*Magie : Supabase regarde les fichiers dans `supabase/migrations`, repère les nouveaux (ceux qui n'ont jamais été exécutés sur le serveur TEST), et les exécute. Votre base de TEST est maintenant à jour !*

---

## 🚀 3. Environnement de PROD (Cloud - Nouveau Projet)
C'est le projet "sacré" utilisé par vos vrais clients.

### Le déploiement (Push)
Le workflow est rigoureusement identique au projet TEST. Quand le client a validé la démo sur la TEST, vous envoyez les scripts sur la PROD.

```bash
# 1. Liez votre terminal au projet de PROD
npx supabase link --project-ref <REFERENCE_PROJET_PROD>

# 2. Poussez vos migrations vers la PROD
npx supabase db push
```

---

## 📏 Règles d'Or du Versionning

1. **La Règle de l'Immuabilité** : Une fois qu'un fichier SQL dans `supabase/migrations` a été poussé (push) sur TEST ou PROD, **VOUS NE DEVEZ PLUS JAMAIS LE MODIFIER**. 
   *Si vous avez fait une erreur dans `20260601000000_table.sql`, ne le modifiez pas. Créez un nouveau fichier `20260601000001_correction.sql`.*
2. **Le Code suit la DB** : Poussez toujours vos migrations Supabase (`db push`) **AVANT** de déployer votre code React (Vite/Vercel/Cloudflare). Le frontend plantera s'il cherche une table qui n'existe pas encore.
3. **Github est la source de vérité** : Vos fichiers `supabase/migrations` vivent dans Git. Ils garantissent que n'importe quel développeur qui rejoint votre projet aura la base de données exacte en tapant simplement `supabase start`.
