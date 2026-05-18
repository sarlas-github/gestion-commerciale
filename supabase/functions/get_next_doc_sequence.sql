-- Dernière version déployée : 17-05-2026_05_multi_tenant_functions.sql
-- Signature mise à jour : p_company_id remplace p_user_id

CREATE OR REPLACE FUNCTION public.get_next_doc_sequence(
  p_company_id uuid,
  p_type       text,
  p_year       integer
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_seq integer;
BEGIN
  IF p_company_id NOT IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO document_sequences (user_id, company_id, type, year, last_number)
  VALUES (auth.uid(), p_company_id, p_type, p_year, 1)
  ON CONFLICT (company_id, type, year) DO UPDATE
    SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_seq;
  RETURN v_seq;
END;
$$;
