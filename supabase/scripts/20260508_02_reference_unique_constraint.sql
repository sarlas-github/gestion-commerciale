ALTER TABLE purchases
  ADD CONSTRAINT purchases_user_id_reference_key UNIQUE (user_id, reference);

ALTER TABLE sales
  ADD CONSTRAINT sales_user_id_reference_key UNIQUE (user_id, reference);
