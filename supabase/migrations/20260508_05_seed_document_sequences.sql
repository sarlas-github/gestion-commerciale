-- Seed document_sequences depuis les ventes existantes (VEN-YYYY-NNN)
INSERT INTO document_sequences (user_id, type, year, last_number)
SELECT
  user_id,
  'sale'                                                          AS type,
  CAST(SPLIT_PART(reference, '-', 2) AS INTEGER)                 AS year,
  MAX(CAST(SPLIT_PART(reference, '-', 3) AS INTEGER))            AS last_number
FROM sales
WHERE reference ~ '^VEN-\d{4}-\d+$'
GROUP BY user_id, CAST(SPLIT_PART(reference, '-', 2) AS INTEGER)
ON CONFLICT (user_id, type, year) DO UPDATE
  SET last_number = GREATEST(document_sequences.last_number, EXCLUDED.last_number);

-- Seed document_sequences depuis les achats existants (ACH-YYYY-NNN)
INSERT INTO document_sequences (user_id, type, year, last_number)
SELECT
  user_id,
  'purchase'                                                      AS type,
  CAST(SPLIT_PART(reference, '-', 2) AS INTEGER)                 AS year,
  MAX(CAST(SPLIT_PART(reference, '-', 3) AS INTEGER))            AS last_number
FROM purchases
WHERE reference ~ '^ACH-\d{4}-\d+$'
GROUP BY user_id, CAST(SPLIT_PART(reference, '-', 2) AS INTEGER)
ON CONFLICT (user_id, type, year) DO UPDATE
  SET last_number = GREATEST(document_sequences.last_number, EXCLUDED.last_number);
