liberer ports
net stop winnat
net start winnat

npx supabase db reset

Étape 1 : Récupérer vos clés locales
npx supabase status
 Publishable::::: key
 url::::: acces bd

 VITE_SUPABASE_URL=http://100.98.128.42:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH

npx supabase stop && npx supabase start && npx supabase db reset



npm run dev -- --host

Étape finale sur le mobile
Vérifiez que Tailscale est bien activé sur votre téléphone.
Ouvrez le navigateur du téléphone et tapez l'adresse : http://100.98.128.42:5173


SELECT public.create_app_user('test.banina@gmail.com', 'Démo123',  'banina', 'production');

# 🚀 Guide Master : Du Setup Initial au Déploiement Pro

Ce document retrace toutes les étapes pour configurer un projet Supabase de zéro, comme nous l'avons fait le 11/05/2026. Utilise ce guide pour tes futurs SaaS.

---

## 🛠️ Étape 0 : Configuration Initiale (À faire une fois par projet)

C'est ce que nous avons fait pour nettoyer et lier ton projet actuel.

### 1. Installation des outils
- **Docker Desktop** : Télécharger et installer (indispensable pour le local). Activer **WSL 2**.
- **Supabase CLI** : Pas besoin d'installation globale, on utilise `npx supabase`.

### 2. Connexion et Liaison
```bash
# Se connecter à son compte Supabase (une seule fois par PC)
npx supabase login

# Initialiser le dossier du projet
npx supabase init

# Lier le dossier local au projet Cloud (récupérer la Ref dans le Dashboard Supabase)
npx supabase link --project-ref yirxzhazygrvymtfikap
```

### 3. Créer la "Baseline" (L'état de départ)
Si tu as déjà des tables en ligne et que tu veux les ramener sur ton PC :
```bash
# 1. Créer le fichier de structure (YYYYMMDDHHMMSS_baseline.sql)
npx supabase db dump --linked -f supabase/migrations/20260511000000_v1_baseline.sql

# 2. (Optionnel) Récupérer les données existantes pour les tests
npx supabase db dump --linked --data-only -f supabase/seed.sql
```

---

## 💻 Étape 1 : Environnement de DEV Local

Une fois le setup fini, voici comment travailler au quotidien sur ton PC.

### Démarrage
```bash
# Lancer les serveurs locaux (Docker)
npx supabase start

# Dashboard Studio Local : http://127.0.0.1:54323
```

### Configuration des environnements (.env)
- `.env.development` : `VITE_SUPABASE_URL=http://127.0.0.1:54321`
- `.env.production` : Tes clés Cloud réelles.

---

## 🔄 Étape 2 : Le Cycle de Déploiement Sécurisé

Suis toujours cet ordre pour protéger ta production (et tes démos clients).

### Phase A : Développement (Branche de feature)
1. **Créer la Migration** : Crée ton fichier `supabase/migrations/YYYYMMDDHHMMSS_nom.sql`.
2. **Coder & Tester en Local** : Utilise ton PC avec Tailscale pour valider sur mobile. Ta base locale peut être cassée et remise à zéro (`db reset`) sans crainte.

### Phase B : Staging / Test Cloud (Validation & Démo)
*C'est ici que tu montres ton travail à tes clients via un lien STABLE.*

1. **Pousser le SQL** : `npx supabase db push` (lié au projet TEST).
2. **Merge dans la branche `test`** : Pour mettre à jour le lien de démo client.
   ```bash
   git checkout test
   git merge feat/ma-nouveaute
   git push origin test
   ```
3. **Lien stable** : Ton client utilise toujours la même URL (ex: `https://test.ton-projet.pages.dev`). 
   *C'est ton "laboratoire" branché sur Supabase TEST.*

### Phase C : Production (Le grand saut) 🚩
*Une fois que le client a validé sur le lien de test.*

1. **Lier la PROD** : `npx supabase link --project-ref <REF_PROD>`.
2. **Pousser le SQL** : `npx supabase db push`.
3. **Merge dans `main`** : 
   ```bash
   git checkout main
   git merge test
   git push origin main
   ```
   *Ton site officiel est à jour avec une base de données déjà prête.*

---

## 🚀 Étape 3 : Création du projet de PROD (Futur)

Quand tu lanceras ton SaaS officiellement :

1. Crée un nouveau projet vide sur Supabase.
2. Lie ton terminal à ce nouveau projet : `npx supabase link --project-ref <REF_PROD>`.
npx supabase link --project-ref yirxzhazygrvymtfikap
3. Lance `npx supabase db push` : toutes tes tables et fonctions seront créées en 10 secondes.
4. Configure ton domaine final pour pointer sur ce nouveau projet.
tjrs linker sur le projet et pusher

---

## 📱 4. Tester sur Mobile (Mode Local Pro)

Pour tester ton code local et ta base locale sur ton mobile sans passer par le Cloud.

### Setup (À faire une fois)
1. Installe **Tailscale** sur ton PC et sur ton Mobile. Connecte-les au même compte.
2. Note l'IP Tailscale de ton PC (ex: `100.98.128.42`).

### Au quotidien pour le test mobile
1. **Config** : Dans `.env.development`, utilise ton IP Tailscale :
   `VITE_SUPABASE_URL=http://100.x.y.z:54321`
2. **Lancer** : `npm run dev -- --host`
3. **Mobile** : Ouvre `http://100.x.y.z:5173` sur ton téléphone (avec Tailscale **ON**).

---

## 📏 Règles d'Or
- **Zéro modification manuelle** : Ne change jamais une table directement via l'interface Cloud. Passe toujours par un fichier de migration.
- **Immuabilité** : Un fichier dans `migrations/` ne se modifie jamais. On en crée un nouveau pour corriger.

*Guide rédigé par ton copilote Antigravity.*
