-- Atomic document sequence increment for strictly-sequential invoice numbers.
-- Uses the existing document_sequences table.

-- Ensure a unique constraint exists on (user_id, type, year) for ON CONFLICT to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_sequences_user_type_year
  ON document_sequences (user_id, type, year);

-- Atomically increments and returns the next sequence number for a given document type/year.
-- INSERT ... ON CONFLICT DO UPDATE is atomic under PostgreSQL row-level locking:
-- no two concurrent calls can get the same number.
CREATE OR REPLACE FUNCTION get_next_doc_sequence(
  p_user_id UUID,
  p_type    TEXT,
  p_year    INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_seq INTEGER;
BEGIN
  INSERT INTO document_sequences (user_id, type, year, last_number)
  VALUES (p_user_id, p_type, p_year, 1)
  ON CONFLICT (user_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;
  RETURN v_seq;
END;
$$;
