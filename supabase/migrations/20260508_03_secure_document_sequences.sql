-- Sécurisation de la table document_sequences (absente des scripts initiaux)
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_document_sequences" ON document_sequences
  FOR ALL USING (user_id = auth.uid());
