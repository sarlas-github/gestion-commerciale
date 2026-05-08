-- Dernière version déployée : 20260508_04_fix_security_definer_functions.sql

CREATE OR REPLACE FUNCTION get_next_doc_sequence(
  p_user_id UUID,
  p_type    TEXT,
  p_year    INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_seq INTEGER;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO document_sequences (user_id, type, year, last_number)
  VALUES (p_user_id, p_type, p_year, 1)
  ON CONFLICT (user_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;
  RETURN v_seq;
END;
$$;
