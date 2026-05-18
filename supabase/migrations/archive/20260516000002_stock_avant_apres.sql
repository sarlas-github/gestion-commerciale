-- Ajouter stock_avant et stock_apres dans stock_movements (snapshot au moment de l'insertion)
-- Les anciens mouvements resteront NULL et afficheront "—" dans l'interface
ALTER TABLE stock_movements
  ADD COLUMN stock_avant integer,
  ADD COLUMN stock_apres  integer;
