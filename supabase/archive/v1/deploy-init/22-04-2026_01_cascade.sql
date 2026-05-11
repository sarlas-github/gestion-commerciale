-- Correction 1 : documents.sale_id
ALTER TABLE documents
  DROP CONSTRAINT documents_sale_id_fkey;

ALTER TABLE documents
  ADD CONSTRAINT documents_sale_id_fkey
  FOREIGN KEY (sale_id) 
  REFERENCES sales(id) 
  ON DELETE CASCADE;

-- Correction 2 : documents.payment_id
ALTER TABLE documents
  DROP CONSTRAINT documents_payment_id_fkey;

ALTER TABLE documents
  ADD CONSTRAINT documents_payment_id_fkey
  FOREIGN KEY (payment_id) 
  REFERENCES client_payments(id) 
  ON DELETE CASCADE;