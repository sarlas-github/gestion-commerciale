# supabase/functions/ — Source de vérité des fonctions PostgreSQL

Ce dossier contient **la dernière version déployée** de chaque fonction RPC Supabase.

## Règle

À chaque modification d'une fonction :
1. Créer le script dans `scripts/YYYYMMDD_NN_description.sql`
2. Mettre à jour le fichier correspondant ici

Ne jamais modifier ce dossier sans créer le script de migration qui va avec.

## Fonctions

| Fichier | Dernière migration |
|---|---|
| `get_dashboard_stats.sql` | `20260506_01_dashboard_remove_panier_moyen.sql` |
| `get_available_years.sql` | `20260501_01_dashboard_optimization.sql` |
| `get_clients_with_stats.sql` | `20260501_03_sort_by_created_at.sql` |
| `get_suppliers_with_stats.sql` | `20260501_03_sort_by_created_at.sql` |
| `get_client_monthly_stats.sql` | `20260501_02_app_optimization.sql` |
| `get_supplier_monthly_stats.sql` | `20260501_02_app_optimization.sql` |
| `get_client_report.sql` | `20260501_02_app_optimization.sql` |
| `get_supplier_report.sql` | `20260501_02_app_optimization.sql` |
| `get_stock_alert_count.sql` | `20260501_02_app_optimization.sql` |
| `get_next_doc_sequence.sql` | `20260503_01_document_counters.sql` |
