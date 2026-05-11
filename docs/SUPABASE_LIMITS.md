# Supabase Free Tier — Limites & Estimations de Scaling

Ce document conserve les estimations de montée en charge (scaling) pour le SaaS de Gestion Commerciale, basées sur l'architecture optimisée (filtrage par période côté serveur) et les limites du plan Gratuit (Free) de Supabase.

---

## 📊 1. Base de données : 500 MB
Dans PostgreSQL, une ligne de données classique (une facture, un produit, un client) pèse en moyenne entre **1 et 2 Ko** (incluant ses index).

- **Capacité totale** : 500 MB = Environ **250 000 à 300 000 lignes** de données.
- **Scénario SaaS estimé** : 
  - 20 entreprises clientes actives.
  - Chaque entreprise crée environ 100 factures/achats par mois avec 5 produits dedans.
  - Total : Environ 12 000 lignes générées par mois.
- **Verdict** : L'application peut fonctionner **près de 2 ans** avant d'atteindre cette limite avec 20 clients très actifs. Il s'agit d'une limite très confortable pour du texte.

---

## 🌐 2. Bande passante (Egress) : 5 GB par mois
L'Egress représente le volume total de données téléchargées par le navigateur des utilisateurs depuis la base de données Supabase. C'est la limite la plus critique, mais elle est gérée grâce à l'architecture de **filtrage serveur mensuel obligatoire**.

- **Consommation estimée** : Quand un utilisateur ouvre la page Ventes, il ne télécharge que les ventes du mois en cours (environ 200 Ko de JSON). 
- **Scénario SaaS estimé** : 
  - 1 utilisateur fait 50 requêtes/rafraîchissements par jour = ~10 MB par jour (200 MB par mois).
- **Verdict** : Les 5 GB / mois permettent de soutenir confortablement **environ 20 à 30 utilisateurs actifs quotidiennement** (qui utilisent l'app toute la journée). C'est généralement la première limite qui nécessitera un passage au plan Pro.

---

## 📁 3. Stockage de fichiers (Storage) : 1 GB
Cette limite concerne les fichiers physiques uploadés sur Supabase (images, logos, PDF).

- **Notre architecture** : L'application génère les PDF "à la volée" côté navigateur avec `jsPDF` et `html2canvas`. **Les PDF ne sont donc pas stockés sur Supabase**, ce qui économise 99% de l'espace habituellement requis par un tel SaaS.
- **Stockage réel** : Le seul stockage physique sera probablement les **logos des entreprises**. 
- **Scénario SaaS estimé** : Un logo optimisé pèse environ 100 Ko.
- **Verdict** : 1 GB = **10 000 logos**. Cette limite ne sera probablement jamais atteinte.

---

## ⚡ 4. Vitesse (CPU partagé / 500 MB RAM)
- **Performances** : Pour de la simple lecture/écriture (CRUD) de factures et clients avec des requêtes SQL basiques et indexées, Supabase est ultra-rapide.
- **Verdict** : Tant que l'application ne fait pas d'opérations d'agrégations complexes non filtrées sur des centaines de milliers de lignes, il n'y aura aucun ralentissement perceptible.

---

## 🎯 Conclusion Globale
Le SaaS peut être lancé en mode 100% Gratuit. L'architecture (Egress limité par mois + Génération PDF frontend + RLS) est extrêmement économe. 

**Le passage au plan PRO (25$/mois) ne sera nécessaire que lorsque le SaaS atteindra environ 20 à 30 entreprises utilisant l'application tous les jours de manière intensive.** (À ce stade, les revenus mensuels générés par ces 20-30 entreprises couvriront largement le coût du serveur).

---

## 🛠️ Remarque Importante : Les Métriques en Développement

**Il ne faut pas s'inquiéter des métriques gonflées visibles sur le Dashboard Supabase pendant la phase de développement (Plan Free) :**

1. **Database Size (~28 MB initial)** : 
   - Même avec très peu de données métiers, la taille affichée commence autour de 25-30 MB. 
   - **Explication** : Supabase provisionne automatiquement toute son infrastructure (schémas système `auth`, `storage`, extensions PostgreSQL comme PostGIS, etc.). Vos données réelles ne pèsent que quelques kilo-octets.

2. **Egress (Bande passante) élevé** :
   - L'Egress peut sembler monter anormalement vite.
   - **Explication** : En mode développement, le "Hot-Reload" de React (Vite) recharge la page ou les composants à chaque sauvegarde de code. Un développeur rafraîchit souvent l'application des centaines de fois par jour, forçant le navigateur à re-télécharger les requêtes. 
   - En production, grâce à la mise en cache (React Query) et au **filtrage par mois côté serveur**, un utilisateur normal ne consommera quasiment rien en comparaison.
