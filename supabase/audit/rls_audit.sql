-- Audit RLS : tables publiques sans politique de sécurité
-- Résultat attendu : 0 lignes (toutes les tables doivent être protégées)

SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT DISTINCT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  )
ORDER BY tablename;

-- Audit complet : toutes les politiques actives par table
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
