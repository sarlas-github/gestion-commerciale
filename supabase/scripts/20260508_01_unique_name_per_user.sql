-- Contraintes d'unicité : nom unique par utilisateur pour produits, clients et fournisseurs
ALTER TABLE products  ADD CONSTRAINT products_user_id_name_key  UNIQUE (user_id, name);
ALTER TABLE clients   ADD CONSTRAINT clients_user_id_name_key   UNIQUE (user_id, name);
ALTER TABLE suppliers ADD CONSTRAINT suppliers_user_id_name_key UNIQUE (user_id, name);
