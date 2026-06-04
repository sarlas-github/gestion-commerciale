-- Nouvelle fonction démo production textile (confection vêtements marocains)
-- Flux : achats MP (tissus, fils, accessoires) → ordres de confection → ventes PF (vêtements)

CREATE OR REPLACE FUNCTION public.create_app_user_demo_production_textile(
    p_email               text,
    p_password            text    DEFAULT 'Démo@123',
    p_company_name        text    DEFAULT 'Atlas Confection SARL',
    p_taux_tva_defaut     numeric DEFAULT 20,
    p_label_quantity      text    DEFAULT 'Quantité',
    p_show_pieces_count   boolean DEFAULT true
)
RETURNS TABLE(out_user_id uuid, out_company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_product_names     text[];
    v_product_natures   text[];
    v_product_types     text[];
    v_product_pieces    int[];
    v_product_achat     numeric[];
    v_product_vente     numeric[];
    v_supplier_names    text[];
    v_client_names      text[];
    v_purchase_statuses text[];
    v_sale_statuses     text[];
    v_moroccan_cities   text[];
    v_moroccan_streets  text[];

    v_user_id    uuid;
    v_company_id uuid;
    v_company    record;

    v_product_ids  uuid[] := '{}';
    v_supplier_ids uuid[] := '{}';
    v_client_ids   uuid[] := '{}';

    v_i int; v_j int; v_p_idx int; v_n_items int;
    v_p_id uuid; v_c_id uuid; v_s_id uuid;
    v_purchase_id uuid; v_sale_id uuid; v_doc_id uuid; v_payment_id uuid;

    v_total  numeric; v_paid   numeric; v_price  numeric; v_qty int;
    v_tva_amount numeric; v_total_ht numeric;
    v_mp_idx int; v_pf_qty int;
    v_stock_alerts   int[];
    v_target         numeric;

    v_stock_current numeric[] := '{0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0}'::numeric[];
    v_stock_avant   numeric;

    v_ach_seq int := 0;
    v_ven_seq int := 0;
    v_fac_seq int := 0;
    v_rec_seq int := 0;
    v_year    int := EXTRACT(YEAR FROM current_date)::int;

    v_status       text;
    v_month_offset int;
    v_day          int;
    v_date         date;

    v_client_name    text;
    v_client_address text;
    v_client_ice     text;
    v_client_phone   text;
    v_addr           text;
    v_ice            text;
BEGIN
    -- 1. Créer user + company
    SELECT cau.out_user_id, cau.out_company_id
    INTO v_user_id, v_company_id
    FROM public.create_app_user(p_email := p_email, p_password := p_password, p_mode := 'production', p_role := 'admin') cau;

    -- 2. Patcher les infos de la company
    UPDATE public.companies
    SET name              = p_company_name,
        address           = 'Zone Industrielle Sidi Bernoussi, Lot 42, Casablanca',
        phone             = '0522780000',
        email             = 'contact@atlas-confection.ma',
        ice               = '004123456000001',
        if_number         = '34567890',
        rc                = 'RC-CASA-234567',
        tp_number         = '67890123',
        logo_url          = '/yourlogo.jpg',
        couleur_marque    = '#1B4F72',
        taux_tva_defaut   = p_taux_tva_defaut,
        label_quantity    = p_label_quantity,
        show_pieces_count = p_show_pieces_count
    WHERE id = v_company_id;

    SELECT * INTO v_company FROM public.companies WHERE id = v_company_id;

    -- 3. Cleanup
    DELETE FROM public.document_items  WHERE document_id IN (SELECT id FROM public.documents WHERE company_id = v_company_id);
    DELETE FROM public.documents       WHERE company_id = v_company_id;
    DELETE FROM public.client_payments WHERE company_id = v_company_id;
    DELETE FROM public.supplier_payments WHERE company_id = v_company_id;
    DELETE FROM public.sale_items      WHERE sale_id     IN (SELECT id FROM public.sales     WHERE company_id = v_company_id);
    DELETE FROM public.sales           WHERE company_id = v_company_id;
    DELETE FROM public.purchase_items  WHERE purchase_id IN (SELECT id FROM public.purchases WHERE company_id = v_company_id);
    DELETE FROM public.purchases       WHERE company_id = v_company_id;
    DELETE FROM public.stock_movements    WHERE company_id = v_company_id;
    DELETE FROM public.stock              WHERE company_id = v_company_id;
    DELETE FROM public.document_sequences WHERE company_id = v_company_id;
    DELETE FROM public.products           WHERE company_id = v_company_id;
    DELETE FROM public.clients         WHERE company_id = v_company_id;
    DELETE FROM public.suppliers       WHERE company_id = v_company_id;

    v_stock_current := '{0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0}'::numeric[];

    -- 4. Données statiques
    v_moroccan_cities  := ARRAY['Casablanca','Rabat','Tanger','Marrakech','Agadir','Fès','Meknès','Oujda','Kénitra','Tétouan'];
    v_moroccan_streets := ARRAY['Boulevard Zerktouni','Avenue Mohammed V','Rue Taha Hussein','Quartier Gauthier','Sidi Maârouf','Technopark','Route d El Jadida','Avenue des FAR','Boulevard Anfa','Quartier de l Océan'];

    -- Indices 1-10 = matières premières, 11-20 = produits finis
    v_product_names := ARRAY[
        'Tissu Coton Sergé (mètre)',       'Tissu Polyester (mètre)',
        'Tissu Laine Cardée (mètre)',      'Fil à coudre (bobine 500m)',
        'Boutons nacre (sachet 100)',      'Fermetures éclair 20cm (lot 50)',
        'Doublure Satin (mètre)',          'Élastique 2cm (rouleau 50m)',
        'Broderie artisanale (pièce)',     'Étiquettes tissu (lot 500)',
        'Djellaba Homme',                  'Djellaba Femme',
        'Caftan Femme brodé',              'Chemise Homme slim',
        'Pantalon Homme tailleur',         'Robe Femme soirée',
        'Jabador Homme 2 pièces',          'Gilet Femme',
        'Ensemble Femme 2 pièces',         'Burnous Homme luxe'
    ];
    v_product_natures := ARRAY[
        'matiere_premiere','matiere_premiere','matiere_premiere','matiere_premiere',
        'matiere_premiere','matiere_premiere','matiere_premiere','matiere_premiere',
        'matiere_premiere','matiere_premiere',
        'produit_fini','produit_fini','produit_fini','produit_fini','produit_fini',
        'produit_fini','produit_fini','produit_fini','produit_fini','produit_fini'
    ];
    v_product_types  := ARRAY[
        'individual','individual','individual','individual',
        'pack',      'pack',      'individual','individual',
        'individual','pack',
        'individual','individual','individual','individual','individual',
        'individual','pack',      'individual','pack',      'individual'
    ];
    v_product_pieces := ARRAY[
        1,1,1,1,100,50,1,1,1,500,
        1,1,1,1,1,1,2,1,2,1
    ];
    v_stock_alerts := ARRAY[
        30,30,15,20,25,20,25,10,15,10,
        10,10, 5,15,15, 8,10,10, 5, 5
    ];
    -- Prix achat MP (indices 1-10) ; PF = 0
    v_product_achat := ARRAY[
        35.00, 22.00, 85.00, 18.00, 12.00, 25.00, 28.00, 15.00, 45.00,  8.00,
         0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00
    ]::numeric[];
    -- Prix vente PF (indices 11-20) ; MP = 0
    v_product_vente := ARRAY[
         0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       380.00,450.00,850.00,180.00,220.00,320.00,280.00,190.00,550.00,650.00
    ]::numeric[];

    v_supplier_names := ARRAY[
        'Textile Médina Fès',             'Importex Tissu Casablanca',
        'Broderie Fassia SARL',           'Atlas Tissus Distribution',
        'Saada Textile Meknès',           'Euro Tissu Import Tanger',
        'Matlou3 Accessoires Mode',       'Coton Maroc Industrie',
        'Polycolor Fils SARL',            'Élasticord Maroc'
    ];

    v_client_names := ARRAY[
        'Boutique La Maison du Caftan',   'Souk Mariage Casablanca',
        'Espace Mode Marrakech',          'El Borj Vêtements Fès',
        'Fashion House Tanger',           'Chez Nadia Mode Casa',
        'Atlas Shopping Center',          'Habillement Express Agadir',
        'Style Palace Oujda',             'Najmat Mode Rabat',
        'Mega Mall Vêtements',            'Boutique Al Waha Meknès',
        'Sariyer Mode Tétouan',           'Gran Sur Fashion Store',
        'Royal Couture Casablanca'
    ];

    -- Statuts achats MP (20) — 10 mois précédent + 10 mois courant
    v_purchase_statuses := ARRAY[
        'paid','paid','paid','paid','paid','partial','paid','cancelled','paid','partial',
        'paid','partial','unpaid','paid','unpaid','paid','paid','partial','paid','cancelled'
    ];

    -- Statuts ventes PF (20) — 10 mois précédent + 10 mois courant
    v_sale_statuses := ARRAY[
        'paid','paid','paid','paid','paid','paid','partial','partial','unpaid','cancelled',
        'paid','partial','unpaid','paid','partial','cancelled','paid','partial','unpaid','paid'
    ];

    -- 5. Créer les produits (20)
    FOR v_i IN 1..20 LOOP
        INSERT INTO public.products (user_id, company_id, name, type, nature, pieces_count, stock_alert)
        VALUES (v_user_id, v_company_id, v_product_names[v_i], v_product_types[v_i], v_product_natures[v_i], v_product_pieces[v_i], v_stock_alerts[v_i])
        RETURNING id INTO v_p_id;
        v_product_ids := array_append(v_product_ids, v_p_id);

        INSERT INTO public.stock (user_id, company_id, product_id, quantity)
        VALUES (v_user_id, v_company_id, v_p_id, 0);
    END LOOP;

    -- 6. Créer les fournisseurs (10)
    FOR v_i IN 1..10 LOOP
        v_addr := 'Zone Industrielle, ' || v_moroccan_cities[(v_i % 5) + 1];
        v_ice  := '004' || LPAD(((v_i * 5432109) % 90000000 + 10000000)::text, 8, '0') || '0003';
        INSERT INTO public.suppliers (user_id, company_id, name, phone, address, ice)
        VALUES (v_user_id, v_company_id, v_supplier_names[v_i],
                '052' || LPAD(((v_i * 6543210) % 9000000 + 1000000)::text, 7, '0'),
                v_addr, v_ice)
        RETURNING id INTO v_s_id;
        v_supplier_ids := array_append(v_supplier_ids, v_s_id);
    END LOOP;

    -- 7. Créer les clients (15)
    FOR v_i IN 1..15 LOOP
        v_addr := v_moroccan_streets[((v_i - 1) % 10) + 1] || ', ' || v_moroccan_cities[((v_i - 1) % 10) + 1];
        v_ice  := '005' || LPAD(((v_i * 7654321) % 90000000 + 10000000)::text, 8, '0') || '0003';
        INSERT INTO public.clients (user_id, company_id, name, phone, address, ice)
        VALUES (v_user_id, v_company_id, v_client_names[v_i],
                '06' || LPAD(((v_i * 8765432) % 90000000 + 10000000)::text, 8, '0'),
                v_addr, v_ice)
        RETURNING id INTO v_c_id;
        v_client_ids := array_append(v_client_ids, v_c_id);
    END LOOP;

    -- 8. Achats matières premières (20) sur 2 mois
    -- Grandes quantités pour alimenter les ordres de confection
    FOR v_i IN 1..20 LOOP
        v_status       := v_purchase_statuses[v_i];
        v_month_offset := CASE WHEN v_i <= 10 THEN 1 ELSE 0 END;
        v_day          := ((v_i - 1) % 10) * 2 + 1;
        v_date         := (date_trunc('month', current_date)
                           - (v_month_offset || ' months')::interval
                           + (v_day          || ' days')::interval)::date;
        IF v_month_offset = 0 THEN
            v_date := LEAST(v_date, (current_date - 1));
        END IF;
        v_s_id    := v_supplier_ids[((v_i - 1) % 10) + 1];
        v_n_items := 1 + (v_i % 3);

        v_total := 0;
        FOR v_j IN 1..v_n_items LOOP
            v_p_idx := ((v_i + v_j * 3 - 1) % 10) + 1;  -- indices 1-10 MP uniquement
            v_qty   := 30 + (v_i + v_j) % 10 * 5;        -- 30–75 unités/mètres par ligne
            v_total := v_total + v_qty * v_product_achat[v_p_idx];
        END LOOP;

        v_total_ht   := v_total;
        v_tva_amount := ROUND(v_total_ht * p_taux_tva_defaut / 100, 2);
        v_total      := v_total_ht + v_tva_amount;

        v_paid := CASE v_status
            WHEN 'paid'    THEN v_total
            WHEN 'partial' THEN ROUND(v_total * 0.5, 2)
            ELSE 0
        END;

        v_ach_seq := v_ach_seq + 1;
        INSERT INTO public.purchases (user_id, company_id, supplier_id, reference, date, status, total, tva_rate, tva_amount, paid)
        VALUES (v_user_id, v_company_id, v_s_id,
                'ACH-' || v_year || '-' || LPAD(v_ach_seq::text, 3, '0'),
                v_date, v_status, v_total, p_taux_tva_defaut, v_tva_amount, v_paid)
        RETURNING id INTO v_purchase_id;

        IF v_status != 'cancelled' THEN
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := ((v_i + v_j * 3 - 1) % 10) + 1;
                v_qty   := 30 + (v_i + v_j) % 10 * 5;
                v_price := v_product_achat[v_p_idx];

                INSERT INTO public.purchase_items (purchase_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_purchase_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_price);

                v_stock_avant            := v_stock_current[v_p_idx];
                v_stock_current[v_p_idx] := v_stock_current[v_p_idx] + v_qty;
                UPDATE public.stock SET quantity = v_stock_current[v_p_idx]
                WHERE product_id = v_product_ids[v_p_idx] AND company_id = v_company_id;
                INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, note, date, stock_avant, stock_apres)
                VALUES (v_user_id, v_company_id, v_product_ids[v_p_idx], 'in', v_qty, 'purchase', v_purchase_id, 'Nouvel achat', v_date, v_stock_avant, v_stock_current[v_p_idx]);
            END LOOP;

            IF v_paid > 0 THEN
                INSERT INTO public.supplier_payments (user_id, company_id, purchase_id, amount, date, methode_paiement)
                VALUES (v_user_id, v_company_id, v_purchase_id, v_paid, v_date,
                        CASE (v_i % 4)
                            WHEN 0 THEN 'virement'
                            WHEN 1 THEN 'cheque'
                            WHEN 2 THEN 'especes'
                            ELSE        'carte_bancaire'
                        END::methode_paiement_type);
            END IF;
        ELSE
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := ((v_i + v_j * 3 - 1) % 10) + 1;
                v_qty   := 30 + (v_i + v_j) % 10 * 5;
                INSERT INTO public.purchase_items (purchase_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_purchase_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_achat[v_p_idx]);
            END LOOP;
        END IF;
    END LOOP;

    -- 8b. Ordres de confection (10) — consommation MP + fabrication PF
    -- Flux : stock MP baisse (OUT/Consommation) + stock PF monte (IN/Production)
    FOR v_i IN 1..10 LOOP
        v_month_offset := CASE WHEN v_i <= 5 THEN 1 ELSE 0 END;
        v_day          := ((v_i - 1) % 5) * 4 + 8;  -- jours 8, 12, 16, 20, 24
        v_date         := (date_trunc('month', current_date)
                           - (v_month_offset || ' months')::interval
                           + (v_day          || ' days')::interval)::date;
        IF v_month_offset = 0 THEN
            v_date := LEAST(v_date, (current_date - 1));
        END IF;

        -- Produit fini confectionné ce lot (tourne sur les 10 PF)
        v_p_idx  := 10 + ((v_i - 1) % 10) + 1;
        v_pf_qty := 40 + v_i * 4;  -- 44 à 80 pièces produites

        -- Stock IN : produit fini (Confection)
        v_stock_avant            := v_stock_current[v_p_idx];
        v_stock_current[v_p_idx] := v_stock_current[v_p_idx] + v_pf_qty;
        UPDATE public.stock SET quantity = v_stock_current[v_p_idx]
        WHERE product_id = v_product_ids[v_p_idx] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[v_p_idx], 'in', v_pf_qty, 'manual', NULL, v_date,
                'Confection: ' || v_product_names[v_p_idx], v_stock_avant, v_stock_current[v_p_idx]);

        -- Stock OUT × 2 : matières premières consommées (Consommation atelier)
        FOR v_j IN 1..2 LOOP
            v_mp_idx := ((v_i * 3 + v_j * 2 - 1) % 10) + 1;  -- indices 1-10
            v_qty    := 8 + v_i + v_j * 3;                    -- 12 à 25 unités
            -- Clamp : ne jamais consommer plus que le stock disponible
            IF v_qty > v_stock_current[v_mp_idx] THEN
                v_qty := GREATEST(v_stock_current[v_mp_idx], 0)::int;
            END IF;
            IF v_qty > 0 THEN
                v_stock_avant             := v_stock_current[v_mp_idx];
                v_stock_current[v_mp_idx] := v_stock_current[v_mp_idx] - v_qty;
                UPDATE public.stock SET quantity = v_stock_current[v_mp_idx]
                WHERE product_id = v_product_ids[v_mp_idx] AND company_id = v_company_id;
                INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
                VALUES (v_user_id, v_company_id, v_product_ids[v_mp_idx], 'out', v_qty, 'manual', NULL, v_date,
                        'Consommation atelier: ' || v_product_names[v_p_idx], v_stock_avant, v_stock_current[v_mp_idx]);
            END IF;
        END LOOP;
    END LOOP;

    -- 9. Ventes produits finis (20) sur 2 mois
    FOR v_i IN 1..20 LOOP
        v_status       := v_sale_statuses[v_i];
        v_month_offset := CASE WHEN v_i <= 10 THEN 1 ELSE 0 END;
        v_day          := ((v_i - 1) % 10) * 2 + 1;
        v_date         := (date_trunc('month', current_date)
                           - (v_month_offset || ' months')::interval
                           + (v_day          || ' days')::interval)::date;
        IF v_month_offset = 0 THEN
            v_date := LEAST(v_date, (current_date - 1));
        END IF;
        v_c_id    := v_client_ids[((v_i - 1) % 15) + 1];
        v_n_items := 1 + (v_i % 2);  -- 1 ou 2 références par commande

        SELECT name, address, ice, phone
        INTO v_client_name, v_client_address, v_client_ice, v_client_phone
        FROM public.clients WHERE id = v_c_id;

        v_total := 0;
        FOR v_j IN 1..v_n_items LOOP
            v_p_idx := 10 + ((v_i + v_j * 5 - 1) % 10) + 1;  -- indices 11-20
            v_qty   := 5 + (v_i + v_j) % 8;
            v_total := v_total + v_qty * v_product_vente[v_p_idx];
        END LOOP;

        v_total_ht   := v_total;
        v_tva_amount := ROUND(v_total_ht * p_taux_tva_defaut / 100, 2);
        v_total      := v_total_ht + v_tva_amount;

        v_paid := CASE v_status
            WHEN 'paid'    THEN v_total
            WHEN 'partial' THEN ROUND(v_total * 0.5, 2)
            ELSE 0
        END;

        v_ven_seq := v_ven_seq + 1;
        INSERT INTO public.sales (user_id, company_id, client_id, reference, date, status, total, tva_rate, tva_amount, paid)
        VALUES (v_user_id, v_company_id, v_c_id,
                'VEN-' || v_year || '-' || LPAD(v_ven_seq::text, 3, '0'),
                v_date, v_status, v_total, p_taux_tva_defaut, v_tva_amount, v_paid)
        RETURNING id INTO v_sale_id;

        IF v_status != 'cancelled' THEN
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := 10 + ((v_i + v_j * 5 - 1) % 10) + 1;
                v_qty   := 5 + (v_i + v_j) % 8;
                v_price := v_product_vente[v_p_idx];

                -- Clamp : ne jamais vendre plus que le stock disponible
                IF v_qty > v_stock_current[v_p_idx] THEN
                    v_qty := GREATEST(v_stock_current[v_p_idx], 0)::int;
                END IF;

                INSERT INTO public.sale_items (sale_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_sale_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_price);

                IF v_qty > 0 THEN
                    v_stock_avant            := v_stock_current[v_p_idx];
                    v_stock_current[v_p_idx] := v_stock_current[v_p_idx] - v_qty;
                    UPDATE public.stock SET quantity = v_stock_current[v_p_idx]
                    WHERE product_id = v_product_ids[v_p_idx] AND company_id = v_company_id;
                    INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, note, date, stock_avant, stock_apres)
                    VALUES (v_user_id, v_company_id, v_product_ids[v_p_idx], 'out', v_qty, 'sale', v_sale_id, 'Nouvelle vente', v_date, v_stock_avant, v_stock_current[v_p_idx]);
                END IF;
            END LOOP;

            v_payment_id := NULL;
            IF v_paid > 0 THEN
                INSERT INTO public.client_payments (user_id, company_id, sale_id, amount, date, methode_paiement)
                VALUES (v_user_id, v_company_id, v_sale_id, v_paid, v_date,
                        CASE (v_i % 4)
                            WHEN 0 THEN 'virement'
                            WHEN 1 THEN 'cheque'
                            WHEN 2 THEN 'especes'
                            ELSE        'carte_bancaire'
                        END::methode_paiement_type)
                RETURNING id INTO v_payment_id;
            END IF;

            v_fac_seq := v_fac_seq + 1;
            INSERT INTO public.documents (
                user_id, company_id, client_id, sale_id,
                type, number, date, status, payment_status,
                total, tva_rate, tva_amount, paid,
                client_name, client_address, client_ice, client_phone,
                company_name, company_address, company_phone, company_email,
                company_ice, company_if, company_rc, company_tp, company_rib,
                company_site_web, company_couleur_marque, company_logo_url,
                mode_paiement
            ) VALUES (
                v_user_id, v_company_id, v_c_id, v_sale_id,
                'invoice', 'FAC-' || v_year || '-' || LPAD(v_fac_seq::text, 3, '0'),
                v_date, 'confirmed',
                CASE WHEN v_paid >= v_total THEN 'paid' WHEN v_paid > 0 THEN 'partial' ELSE 'unpaid' END,
                v_total, p_taux_tva_defaut, v_tva_amount, v_paid,
                v_client_name, v_client_address, v_client_ice, v_client_phone,
                COALESCE(v_company.name, ''),           COALESCE(v_company.address, ''),
                COALESCE(v_company.phone, ''),          COALESCE(v_company.email, ''),
                COALESCE(v_company.ice, ''),            COALESCE(v_company.if_number, ''),
                COALESCE(v_company.rc, ''),             COALESCE(v_company.tp_number, ''),
                COALESCE(v_company.rib, ''),            COALESCE(v_company.site_web, ''),
                COALESCE(v_company.couleur_marque, '#4f46e5'), v_company.logo_url,
                'virement'
            ) RETURNING id INTO v_doc_id;

            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := 10 + ((v_i + v_j * 5 - 1) % 10) + 1;
                v_qty   := 5 + (v_i + v_j) % 8;
                INSERT INTO public.document_items (document_id, product_id, product_name, quantity, pieces_count, unit_price)
                VALUES (v_doc_id, v_product_ids[v_p_idx], v_product_names[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_vente[v_p_idx]);
            END LOOP;

            IF v_payment_id IS NOT NULL THEN
                v_rec_seq := v_rec_seq + 1;
                INSERT INTO public.documents (
                    user_id, company_id, client_id, sale_id, payment_id,
                    type, number, date, status, payment_status,
                    total, tva_rate, tva_amount, paid,
                    client_name, client_address, client_ice, client_phone,
                    company_name, company_address, company_phone, company_email,
                    company_ice, company_if, company_rc, company_tp, company_rib,
                    company_site_web, company_couleur_marque, company_logo_url,
                    mode_paiement
                ) VALUES (
                    v_user_id, v_company_id, v_c_id, v_sale_id, v_payment_id,
                    'receipt', 'REC-' || v_year || '-' || LPAD(v_rec_seq::text, 3, '0'),
                    v_date, 'confirmed',
                    CASE WHEN v_paid >= v_total THEN 'paid' ELSE 'partial' END,
                    v_total, p_taux_tva_defaut, v_tva_amount, v_paid,
                    v_client_name, v_client_address, v_client_ice, v_client_phone,
                    COALESCE(v_company.name, ''),           COALESCE(v_company.address, ''),
                    COALESCE(v_company.phone, ''),          COALESCE(v_company.email, ''),
                    COALESCE(v_company.ice, ''),            COALESCE(v_company.if_number, ''),
                    COALESCE(v_company.rc, ''),             COALESCE(v_company.tp_number, ''),
                    COALESCE(v_company.rib, ''),            COALESCE(v_company.site_web, ''),
                    COALESCE(v_company.couleur_marque, '#4f46e5'), v_company.logo_url,
                    CASE (v_i % 4)
                        WHEN 0 THEN 'virement'
                        WHEN 1 THEN 'cheque'
                        WHEN 2 THEN 'especes'
                        ELSE        'carte_bancaire'
                    END
                ) RETURNING id INTO v_doc_id;

                FOR v_j IN 1..v_n_items LOOP
                    v_p_idx := 10 + ((v_i + v_j * 5 - 1) % 10) + 1;
                    v_qty   := 5 + (v_i + v_j) % 8;
                    INSERT INTO public.document_items (document_id, product_id, product_name, quantity, pieces_count, unit_price)
                    VALUES (v_doc_id, v_product_ids[v_p_idx], v_product_names[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_vente[v_p_idx]);
                END LOOP;
            END IF;

        ELSE
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := 10 + ((v_i + v_j * 5 - 1) % 10) + 1;
                v_qty   := 5 + (v_i + v_j) % 8;
                INSERT INTO public.sale_items (sale_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_sale_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_vente[v_p_idx]);
            END LOOP;
        END IF;
    END LOOP;

    -- 9b. Initialiser document_sequences pour éviter les conflits lors des prochains enregistrements
    INSERT INTO public.document_sequences (user_id, company_id, type, year, last_number)
    VALUES
        (v_user_id, v_company_id, 'purchase', v_year, v_ach_seq),
        (v_user_id, v_company_id, 'sale',     v_year, v_ven_seq),
        (v_user_id, v_company_id, 'invoice',  v_year, v_fac_seq),
        (v_user_id, v_company_id, 'receipt',  v_year, v_rec_seq)
    ON CONFLICT (company_id, type, year)
    DO UPDATE SET last_number = GREATEST(document_sequences.last_number, EXCLUDED.last_number);

    -- 10. Ajustements stock : ruptures et niveaux faibles représentatifs
    -- Tissu Laine (index 3, seuil=15) → rupture fin de saison
    v_target := 0;
    IF v_stock_current[3] != v_target THEN
        v_stock_avant := v_stock_current[3];
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[3] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, note, date, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[3], CASE WHEN v_target >= v_stock_avant THEN 'in' ELSE 'out' END, ABS((v_target - v_stock_avant)::int), 'manual', 'Rupture fin de saison', current_date, v_stock_avant, v_target);
        v_stock_current[3] := v_target;
    END IF;

    -- Broderie artisanale (index 9, seuil=15) → stock faible (6 pièces)
    v_target := 6;
    IF v_stock_current[9] != v_target THEN
        v_stock_avant := v_stock_current[9];
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[9] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, note, date, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[9], CASE WHEN v_target >= v_stock_avant THEN 'in' ELSE 'out' END, ABS((v_target - v_stock_avant)::int), 'manual', 'Correctif inventaire atelier', current_date, v_stock_avant, v_target);
        v_stock_current[9] := v_target;
    END IF;

    -- Caftan Femme brodé (index 13, seuil=5) → rupture collection épuisée
    v_target := 0;
    IF v_stock_current[13] != v_target THEN
        v_stock_avant := v_stock_current[13];
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[13] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, note, date, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[13], CASE WHEN v_target >= v_stock_avant THEN 'in' ELSE 'out' END, ABS((v_target - v_stock_avant)::int), 'manual', 'Rupture collection épuisée', current_date, v_stock_avant, v_target);
        v_stock_current[13] := v_target;
    END IF;

    -- Burnous Homme luxe (index 20, seuil=5) → faible (2 pièces)
    v_target := 2;
    IF v_stock_current[20] != v_target THEN
        v_stock_avant := v_stock_current[20];
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[20] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, note, date, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[20], CASE WHEN v_target >= v_stock_avant THEN 'in' ELSE 'out' END, ABS((v_target - v_stock_avant)::int), 'manual', 'Ajustement fin de mois', current_date, v_stock_avant, v_target);
        v_stock_current[20] := v_target;
    END IF;

    RETURN QUERY SELECT v_user_id, v_company_id;
END;
$$;
