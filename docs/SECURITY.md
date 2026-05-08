# Audit Sécurité — Gestion Commerciale SaaS

**Date audit** : 2026-05-08  
**Périmètre** : Frontend React, hooks Supabase, fonctions PostgreSQL, schéma BD

---

## Résumé exécutif

| Zone | Statut | Niveau |
|---|---|---|
| Authentification & routes protégées | ✅ OK | — |
| RLS sur les 14 tables métier | ✅ OK | — |
| Injection SQL | ✅ OK | — |
| XSS | ✅ OK | — |
| Gestion des tokens de session | ✅ OK | — |
| Cascades et intégrité référentielle | ✅ OK | — |
| **`document_sequences` — RLS absent** | ❌ CRITIQUE | CRITIQUE |
| **`get_next_doc_sequence` — validation manquante** | ❌ CRITIQUE | CRITIQUE |
| **`create_invoice` / `create_receipt` — validation manquante** | ⚠️ À corriger | MOYEN |
| Upload logo — pas de validation MIME/taille | ⚠️ À corriger | MOYEN |
| Messages d'erreur — exposition interne BD | ⚠️ À corriger | MOYEN |
| CSP headers en production | ⚠️ À ajouter | MOYEN |

---

## CRITIQUE — À corriger avant toute mise en production

### 1. `document_sequences` — table sans RLS

**Problème :** La table `document_sequences` n'a ni `ENABLE ROW LEVEL SECURITY` ni policy.  
Un utilisateur authentifié peut appeler `get_next_doc_sequence('uuid-autre-user', 'invoice', 2026)` et avancer le compteur d'un autre utilisateur, corrompant sa numérotation.

**Correction :** Créer `supabase/migrations/20260508_03_secure_document_sequences.sql` :

```sql
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_document_sequences" ON document_sequences
  FOR ALL USING (user_id = auth.uid());
```

**Fichiers concernés :**
- `supabase/migrations/20260503_01_document_counters.sql` — la table y est créée sans RLS
- `supabase/functions/get_next_doc_sequence.sql`

---

### 2. `get_next_doc_sequence()` — pas de validation de l'appelant

**Problème :** Fonction SECURITY DEFINER qui accepte `p_user_id` sans vérifier que c'est bien l'utilisateur connecté.

**Correction :** Ajouter en début de fonction :

```sql
IF p_user_id != auth.uid() THEN
  RAISE EXCEPTION 'Unauthorized: p_user_id does not match current user';
END IF;
```

**Fichier :** `supabase/functions/get_next_doc_sequence.sql`  
→ Créer aussi le script migration correspondant.

---

## MOYEN — À corriger avant la commercialisation

### 3. `create_invoice()` et `create_receipt()` — pas de validation de propriété

**Problème :** Ces fonctions SECURITY DEFINER n'vérifient pas que les IDs passés en paramètre (`p_client_id`, `p_sale_id`, `p_payment_id`) appartiennent bien à l'utilisateur courant.

**Correction dans `create_invoice()` :**
```sql
IF NOT EXISTS (
  SELECT 1 FROM sales WHERE id = p_sale_id AND user_id = auth.uid()
) THEN
  RAISE EXCEPTION 'Unauthorized: sale not found for current user';
END IF;
```

**Correction dans `create_receipt()` :**
```sql
IF NOT EXISTS (
  SELECT 1 FROM client_payments WHERE id = p_payment_id AND user_id = auth.uid()
) THEN
  RAISE EXCEPTION 'Unauthorized: payment not found for current user';
END IF;
```

**Fichiers :**
- `supabase/functions/create_invoice.sql`
- `supabase/functions/create_receipt.sql`
→ Créer les scripts migrations correspondants.

---

### 4. Upload logo — aucune validation côté client

**Problème :** Le hook `useCompany.ts` accepte n'importe quel type de fichier et n'impose aucune limite de taille. Un fichier SVG avec XSS intégré, ou un exécutable, pourrait être uploadé.

**Correction dans `src/hooks/useCompany.ts` :**
```typescript
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE_MB = 2 * 1024 * 1024 // 2 Mo

if (!ALLOWED_TYPES.includes(input.logoFile.type)) {
  throw new Error('Format non autorisé. Utilisez PNG, JPG ou WebP.')
}
if (input.logoFile.size > MAX_SIZE_MB) {
  throw new Error('Fichier trop lourd. Maximum 2 Mo.')
}
```

Configurer aussi les **MIME types autorisés dans Supabase Storage** (dashboard → Storage → Policies).

---

### 5. Messages d'erreur — exposition des détails internes

**Problème :** Tous les hooks font `toast.error(err.message)`, ce qui expose les messages d'erreur Supabase/PostgreSQL bruts (ex: "duplicate key value violates unique constraint purchases_user_id_reference_key").

**Règle à appliquer dans tous les hooks :**
```typescript
// ❌ À éviter
toast.error(err.message || 'Erreur')

// ✅ À préférer
const msg = err.message?.includes('unique') 
  ? 'Cette référence existe déjà.'
  : 'Une erreur est survenue. Réessayez.'
toast.error(msg)
```

Ou a minima, ne jamais afficher `err.message` directement en production — logger côté serveur.

---

### 6. CSP headers manquants en production

**Problème :** Aucun `Content-Security-Policy` configuré. En cas de XSS (même indirect), le navigateur n'a aucun filet de sécurité.

**Correction dans `vite.config.ts` (pour le preview local) ou au niveau de l'hébergeur :**
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co;
```

---

## Malware & Supply Chain ✅ Aucune menace détectée

### Dépendances npm

| Point de contrôle | Résultat |
|---|---|
| Lock file (`package-lock.json`) avec hashes SHA512 | ✅ Présent |
| Pas de wildcard `*` dans les versions | ✅ OK |
| Pas de `.npmrc` qui redirige vers un registre tiers | ✅ OK |
| `html2canvas` et `jsPDF` — MIT, légitimes, versions verrouillées | ✅ OK |
| Aucun appel réseau vers une URL externe autre que Supabase | ✅ OK |

### Code

| Point de contrôle | Résultat |
|---|---|
| `eval()` / `new Function()` | ✅ Absent |
| `innerHTML` direct | ✅ Absent |
| `dangerouslySetInnerHTML` | ✅ Absent |
| Injection dynamique de `<script>` | ✅ Absent |
| Scripts ou CSS chargés depuis un CDN externe | ✅ Absent |
| Fonts chargées localement (`@fontsource-variable/geist`) | ✅ OK |

### À faire — headers HTTP côté hébergeur (Vercel, Netlify, etc.)

Ces protections ne peuvent pas être configurées dans le code React — elles s'ajoutent au niveau de l'hébergeur.

```
X-Frame-Options: DENY                          ← anti-clickjacking
X-Content-Type-Options: nosniff               ← anti-MIME sniffing
Strict-Transport-Security: max-age=31536000   ← force HTTPS
Referrer-Policy: strict-origin-when-cross-origin
```

Sur **Vercel**, créer `vercel.json` à la racine :
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

### Routine de maintenance (à faire tous les 2-3 mois)

```bash
npm audit                  # détecte les CVE dans les dépendances
npm outdated               # liste les packages avec nouvelles versions
npm update                 # met à jour dans les limites du caret ^
```

---

## Ce qui est déjà sécurisé ✅

| Point | Détail |
|---|---|
| RLS — 14 tables métier | Toutes avec `ENABLE ROW LEVEL SECURITY` + policy `user_id = auth.uid()` |
| Injection SQL | Toutes les requêtes Supabase utilisent des paramètres nommés — aucune concaténation SQL |
| XSS | Aucun `dangerouslySetInnerHTML`. React échappe automatiquement |
| Tokens de session | Gérés entièrement par le SDK Supabase — rien dans localStorage |
| Routes protégées | Toutes les routes passent par `AppLayout` qui redirige si non authentifié |
| Clé Supabase | Seulement la clé `anon` (publishable) côté frontend — jamais la `service_role` |
| Fonctions SECURITY INVOKER | Les 10 fonctions de lecture filtrent toutes par `auth.uid()` |
| Cascades | Toutes les suppressions parent → enfant correctement configurées |
| Génération PDF | Les données utilisateur sont rendues en texte brut (pas de HTML injection) |

---

## Règles à respecter pour toute nouvelle fonctionnalité

```
1. Toute nouvelle table → ALTER TABLE x ENABLE ROW LEVEL SECURITY
                        → CREATE POLICY "user_x" ON x FOR ALL USING (user_id = auth.uid())

2. Toute fonction SECURITY DEFINER → valider que les IDs reçus appartiennent à auth.uid()

3. Tout upload fichier → valider MIME type et taille côté client ET dans les policies Storage

4. Tout message d'erreur → ne jamais exposer err.message brut en production

5. Toute mutation multi-tables → passer par une fonction RPC PostgreSQL (déjà dans CLAUDE.md)
```

---

## Vérification rapide en BD (à exécuter sur prod)

```sql
-- Vérifier que toutes les tables ont RLS activé
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- rowsecurity doit être TRUE pour toutes les tables

-- Vérifier les policies existantes
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```
