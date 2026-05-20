-- Migration : 20260520150000_OBJETS_create_app_user_demo.sql
-- Deux fonctions de génération de données démo pour la présentation prospects.
-- Crée de A à Z : auth user, company, profile, produits, fournisseurs, clients,
-- achats (2 mois, statuts variés), ventes (2 mois, statuts variés), documents.

-- ============================================================
-- FONCTION 1 : Mode REVENTE — distributeur IT/électronique
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_app_user_demo_revente(
    p_email        text,
    p_password     text DEFAULT 'Démo@123',
    p_company_name text DEFAULT 'TechDist Maroc SARL'
)
RETURNS TABLE(out_user_id uuid, out_company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_product_names     text[];
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
    v_product_types  text[];
    v_product_pieces int[];
    v_stock_alerts   int[];
    v_target         numeric;
BEGIN
    -- 1. Créer user + company via la fonction existante
    SELECT cau.out_user_id, cau.out_company_id
    INTO v_user_id, v_company_id
    FROM public.create_app_user(p_email := p_email, p_password := p_password, p_mode := 'revente', p_role := 'admin') cau;

    -- 2. Patcher les infos de la company
    UPDATE public.companies
    SET name           = p_company_name,
        address        = 'Technopark, Route de Nouaceur, Casablanca',
        phone          = '0522710000',
        email          = 'contact@techdist-maroc.ma',
        ice            = '002178456000001',
        if_number      = '45678901',
        rc             = 'RC-CASA-456789',
        tp_number      = '12345679'
    WHERE id = v_company_id;

    SELECT * INTO v_company FROM public.companies WHERE id = v_company_id;

    -- 3. Cleanup (idempotence)
    DELETE FROM public.document_items  WHERE document_id IN (SELECT id FROM public.documents WHERE company_id = v_company_id);
    DELETE FROM public.documents       WHERE company_id = v_company_id;
    DELETE FROM public.client_payments WHERE company_id = v_company_id;
    DELETE FROM public.supplier_payments WHERE company_id = v_company_id;
    DELETE FROM public.sale_items      WHERE sale_id     IN (SELECT id FROM public.sales     WHERE company_id = v_company_id);
    DELETE FROM public.sales           WHERE company_id = v_company_id;
    DELETE FROM public.purchase_items  WHERE purchase_id IN (SELECT id FROM public.purchases WHERE company_id = v_company_id);
    DELETE FROM public.purchases       WHERE company_id = v_company_id;
    DELETE FROM public.stock_movements WHERE company_id = v_company_id;
    DELETE FROM public.stock           WHERE company_id = v_company_id;
    DELETE FROM public.products        WHERE company_id = v_company_id;
    DELETE FROM public.clients         WHERE company_id = v_company_id;
    DELETE FROM public.suppliers       WHERE company_id = v_company_id;

    -- Réinitialiser les compteurs de stock
    v_stock_current := '{0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0}'::numeric[];

    -- 4. Données statiques
    v_moroccan_cities  := ARRAY['Casablanca','Rabat','Tanger','Marrakech','Agadir','Fès','Meknès','Oujda','Kénitra','Tétouan'];
    v_moroccan_streets := ARRAY['Boulevard Zerktouni','Avenue Mohammed V','Rue Taha Hussein','Quartier Gauthier','Sidi Maârouf','Technopark','Route d El Jadida','Avenue des FAR','Boulevard Anfa','Quartier de l Océan'];

    -- Toner HP pack 2 (index 15) et Câble HDMI lot 10 (index 18) sont des packs
    v_product_types  := ARRAY['individual','individual','individual','individual','individual','individual','individual','individual','individual','individual','individual','individual','individual','individual','pack','individual','individual','pack','individual','individual'];
    v_product_pieces := ARRAY[1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,10,1,1];
    v_stock_alerts   := ARRAY[2,2,3,3,2,3,5,5,3,5,3,3,8,10,15,2,8,20,10,5];

    v_product_names := ARRAY[
        'Laptop Dell Vostro 3520',     'Laptop Lenovo ThinkPad E14',
        'Écran Dell 24" P2422H',       'Écran LG 27" IPS QHD',
        'Imprimante HP LaserJet Pro',  'Imprimante Canon PIXMA G3470',
        'Clavier Logitech MX Keys',    'Souris Logitech MX Master 3S',
        'Casque Jabra Evolve2 40',     'Webcam Logitech C920',
        'Switch TP-Link 16 ports',     'Onduleur APC 650VA',
        'Disque SSD Samsung 1TB',      'RAM Kingston 16GB DDR4',
        'Toner HP 85A (pack 2)',        'Scanner Fujitsu iX1400',
        'Hub USB-C Aukey 7-en-1',      'Câble HDMI 2m (lot 10)',
        'Multiprise Belkin 6 prises',  'Sac Laptop Samsonite 15.6"'
    ];
    v_product_achat := ARRAY[7500,8200,1850,2900,2750,1350,440,370,1450,580,
                               950, 880, 520, 420, 270,3200, 210,  95, 145, 290]::numeric[];
    v_product_vente := ARRAY[9800,10500,2450,3800,3600,1800,620,540,2000,820,
                               1350,1250, 750, 620, 400,4300, 320, 160, 220, 450]::numeric[];

    v_supplier_names := ARRAY[
        'Tech Data Morocco','Disway Distribution','Ingram Micro Casa','M2M Group Supply',
        'Microplus Pro','Azur Systems','Next Step IT','Global IT Morocco',
        'Netcom Distribution','Data Plus Casa'
    ];

    v_client_names := ARRAY[
        'Maroc Telecom Services','Attijariwafa Bank','Banque Populaire Centre',
        'OCP Phosphates Services','Managem Mining Tech','Ciments du Maroc',
        'Label Vie Express','BMCE Capital Solutions','Wafa Assurance',
        'CIH Bank Maroc','Al Mada Holding','HPS Global Trade',
        'Lydec Services Techniques','RAM Cargo Services','Sonasid Steel Distribution'
    ];

    -- Statuts achats (20) — 10 mois précédent + 10 mois courant (interleaved)
    v_purchase_statuses := ARRAY[
        'paid','paid','paid','partial','paid','unpaid','partial','paid','paid','cancelled',
        'paid','partial','unpaid','paid','partial','unpaid','paid','paid','partial','cancelled'
    ];

    -- Statuts ventes (30) — 15 mois précédent + 15 mois courant (interleaved)
    v_sale_statuses := ARRAY[
        'paid','paid','paid','paid','paid','paid','partial','partial','paid','unpaid',
        'partial','paid','paid','unpaid','cancelled',
        'paid','partial','paid','unpaid','partial','paid','partial','cancelled',
        'paid','unpaid','partial','paid','partial','unpaid','paid'
    ];

    -- 5. Créer les produits (20)
    FOR v_i IN 1..20 LOOP
        INSERT INTO public.products (user_id, company_id, name, type, nature, pieces_count, stock_alert)
        VALUES (v_user_id, v_company_id, v_product_names[v_i], v_product_types[v_i], 'revente', v_product_pieces[v_i], v_stock_alerts[v_i])
        RETURNING id INTO v_p_id;
        v_product_ids := array_append(v_product_ids, v_p_id);

        INSERT INTO public.stock (user_id, company_id, product_id, quantity)
        VALUES (v_user_id, v_company_id, v_p_id, 0);
    END LOOP;

    -- 6. Créer les fournisseurs (10)
    FOR v_i IN 1..10 LOOP
        v_addr := 'Zone Industrielle, ' || v_moroccan_cities[(v_i % 5) + 1];
        v_ice  := '001' || LPAD(((v_i * 1234567) % 90000000 + 10000000)::text, 8, '0') || '0001';
        INSERT INTO public.suppliers (user_id, company_id, name, phone, address, ice)
        VALUES (v_user_id, v_company_id, v_supplier_names[v_i],
                '052' || LPAD(((v_i * 2345678) % 9000000 + 1000000)::text, 7, '0'),
                v_addr, v_ice)
        RETURNING id INTO v_s_id;
        v_supplier_ids := array_append(v_supplier_ids, v_s_id);
    END LOOP;

    -- 7. Créer les clients (15)
    FOR v_i IN 1..15 LOOP
        v_addr := v_moroccan_streets[((v_i - 1) % 10) + 1] || ', ' || v_moroccan_cities[((v_i - 1) % 10) + 1];
        v_ice  := '002' || LPAD(((v_i * 3456789) % 90000000 + 10000000)::text, 8, '0') || '0001';
        INSERT INTO public.clients (user_id, company_id, name, phone, address, ice)
        VALUES (v_user_id, v_company_id, v_client_names[v_i],
                '06' || LPAD(((v_i * 4567890) % 90000000 + 10000000)::text, 8, '0'),
                v_addr, v_ice)
        RETURNING id INTO v_c_id;
        v_client_ids := array_append(v_client_ids, v_c_id);
    END LOOP;

    -- 8. Créer les achats (20) sur 2 mois
    FOR v_i IN 1..20 LOOP
        v_status       := v_purchase_statuses[v_i];
        v_month_offset := CASE WHEN v_i <= 10 THEN 1 ELSE 0 END;
        v_day          := ((v_i - 1) % 10) * 2 + 1;  -- jours 1,3,5,...,19
        v_date         := (date_trunc('month', current_date)
                           - (v_month_offset || ' months')::interval
                           + (v_day          || ' days')::interval)::date;
        v_s_id    := v_supplier_ids[((v_i - 1) % 10) + 1];
        v_n_items := 1 + (v_i % 3);

        -- Calculer le total
        v_total := 0;
        FOR v_j IN 1..v_n_items LOOP
            v_p_idx := ((v_i + v_j * 3 - 1) % 20) + 1;
            v_qty   := 5 + (v_i + v_j) % 5;
            v_total := v_total + v_qty * v_product_achat[v_p_idx];
        END LOOP;

        v_paid := CASE v_status
            WHEN 'paid'      THEN v_total
            WHEN 'partial'   THEN ROUND(v_total * 0.5, 2)
            ELSE 0
        END;

        v_ach_seq := v_ach_seq + 1;
        INSERT INTO public.purchases (user_id, company_id, supplier_id, reference, date, status, total, paid)
        VALUES (v_user_id, v_company_id, v_s_id,
                'ACH-' || v_year || '-' || LPAD(v_ach_seq::text, 3, '0'),
                v_date, v_status, v_total, v_paid)
        RETURNING id INTO v_purchase_id;

        IF v_status != 'cancelled' THEN
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := ((v_i + v_j * 3 - 1) % 20) + 1;
                v_qty   := 5 + (v_i + v_j) % 5;
                v_price := v_product_achat[v_p_idx];

                INSERT INTO public.purchase_items (purchase_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_purchase_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_price);

                v_stock_avant              := v_stock_current[v_p_idx];
                v_stock_current[v_p_idx]   := v_stock_current[v_p_idx] + v_qty;

                UPDATE public.stock SET quantity = v_stock_current[v_p_idx]
                WHERE product_id = v_product_ids[v_p_idx] AND company_id = v_company_id;

                INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, stock_avant, stock_apres)
                VALUES (v_user_id, v_company_id, v_product_ids[v_p_idx], 'in', v_qty, 'purchase', v_purchase_id, v_date, v_stock_avant, v_stock_current[v_p_idx]);
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
            -- Annulé : items uniquement, pas de stock ni paiement
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := ((v_i + v_j * 3 - 1) % 20) + 1;
                v_qty   := 5 + (v_i + v_j) % 5;
                INSERT INTO public.purchase_items (purchase_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_purchase_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_achat[v_p_idx]);
            END LOOP;
        END IF;
    END LOOP;

    -- 9. Créer les ventes (30) sur 2 mois
    FOR v_i IN 1..30 LOOP
        v_status       := v_sale_statuses[v_i];
        v_month_offset := CASE WHEN v_i <= 15 THEN 1 ELSE 0 END;
        v_day          := ((v_i - 1) % 15) + 1;  -- jours 1..15
        v_date         := (date_trunc('month', current_date)
                           - (v_month_offset || ' months')::interval
                           + (v_day          || ' days')::interval)::date;
        v_c_id    := v_client_ids[((v_i - 1) % 15) + 1];
        v_n_items := 1 + (v_i % 3);

        SELECT name, address, ice, phone
        INTO v_client_name, v_client_address, v_client_ice, v_client_phone
        FROM public.clients WHERE id = v_c_id;

        -- Calculer le total
        v_total := 0;
        FOR v_j IN 1..v_n_items LOOP
            v_p_idx := ((v_i + v_j * 5 - 1) % 20) + 1;
            v_qty   := 3 + (v_i + v_j) % 3;
            v_total := v_total + v_qty * v_product_vente[v_p_idx];
        END LOOP;

        v_paid := CASE v_status
            WHEN 'paid'      THEN v_total
            WHEN 'partial'   THEN ROUND(v_total * 0.5, 2)
            ELSE 0
        END;

        v_ven_seq := v_ven_seq + 1;
        INSERT INTO public.sales (user_id, company_id, client_id, reference, date, status, total, paid)
        VALUES (v_user_id, v_company_id, v_c_id,
                'VEN-' || v_year || '-' || LPAD(v_ven_seq::text, 3, '0'),
                v_date, v_status, v_total, v_paid)
        RETURNING id INTO v_sale_id;

        IF v_status != 'cancelled' THEN
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := ((v_i + v_j * 5 - 1) % 20) + 1;
                v_qty   := 3 + (v_i + v_j) % 3;
                v_price := v_product_vente[v_p_idx];

                -- Clamp : ne jamais vendre plus que le stock disponible
                IF v_qty > v_stock_current[v_p_idx] THEN
                    v_qty := GREATEST(v_stock_current[v_p_idx], 0)::int;
                END IF;

                INSERT INTO public.sale_items (sale_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_sale_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_price);

                IF v_qty > 0 THEN
                    v_stock_avant              := v_stock_current[v_p_idx];
                    v_stock_current[v_p_idx]   := v_stock_current[v_p_idx] - v_qty;

                    UPDATE public.stock SET quantity = v_stock_current[v_p_idx]
                    WHERE product_id = v_product_ids[v_p_idx] AND company_id = v_company_id;

                    INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, stock_avant, stock_apres)
                    VALUES (v_user_id, v_company_id, v_product_ids[v_p_idx], 'out', v_qty, 'sale', v_sale_id, v_date, v_stock_avant, v_stock_current[v_p_idx]);
                END IF;
            END LOOP;

            -- Paiement
            v_payment_id := NULL;
            IF v_paid > 0 THEN
                INSERT INTO public.client_payments (user_id, company_id, sale_id, amount, date, methode_paiement)
                VALUES (v_user_id, v_company_id, v_sale_id, v_paid, v_date,
                        CASE (v_i % 4)
                            WHEN 0 THEN 'especes'
                            WHEN 1 THEN 'virement'
                            WHEN 2 THEN 'cheque'
                            ELSE        'carte_bancaire'
                        END::methode_paiement_type)
                RETURNING id INTO v_payment_id;
            END IF;

            -- Facture
            v_fac_seq := v_fac_seq + 1;
            INSERT INTO public.documents (
                user_id, company_id, client_id, sale_id,
                type, number, date, status, payment_status,
                total, paid,
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
                v_total, v_paid,
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
                v_p_idx := ((v_i + v_j * 5 - 1) % 20) + 1;
                v_qty   := 3 + (v_i + v_j) % 3;
                INSERT INTO public.document_items (document_id, product_id, product_name, quantity, pieces_count, unit_price)
                VALUES (v_doc_id, v_product_ids[v_p_idx], v_product_names[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_vente[v_p_idx]);
            END LOOP;

            -- Reçu (si paiement existant)
            IF v_payment_id IS NOT NULL THEN
                v_rec_seq := v_rec_seq + 1;
                INSERT INTO public.documents (
                    user_id, company_id, client_id, sale_id, payment_id,
                    type, number, date, status, payment_status,
                    total, paid,
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
                    v_total, v_paid,
                    v_client_name, v_client_address, v_client_ice, v_client_phone,
                    COALESCE(v_company.name, ''),           COALESCE(v_company.address, ''),
                    COALESCE(v_company.phone, ''),          COALESCE(v_company.email, ''),
                    COALESCE(v_company.ice, ''),            COALESCE(v_company.if_number, ''),
                    COALESCE(v_company.rc, ''),             COALESCE(v_company.tp_number, ''),
                    COALESCE(v_company.rib, ''),            COALESCE(v_company.site_web, ''),
                    COALESCE(v_company.couleur_marque, '#4f46e5'), v_company.logo_url,
                    CASE (v_i % 4)
                        WHEN 0 THEN 'especes'
                        WHEN 1 THEN 'virement'
                        WHEN 2 THEN 'cheque'
                        ELSE        'carte_bancaire'
                    END
                ) RETURNING id INTO v_doc_id;

                FOR v_j IN 1..v_n_items LOOP
                    v_p_idx := ((v_i + v_j * 5 - 1) % 20) + 1;
                    v_qty   := 3 + (v_i + v_j) % 3;
                    INSERT INTO public.document_items (document_id, product_id, product_name, quantity, pieces_count, unit_price)
                    VALUES (v_doc_id, v_product_ids[v_p_idx], v_product_names[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_vente[v_p_idx]);
                END LOOP;
            END IF;

        ELSE
            -- Annulé : items uniquement
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := ((v_i + v_j * 5 - 1) % 20) + 1;
                v_qty   := 3 + (v_i + v_j) % 3;
                INSERT INTO public.sale_items (sale_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_sale_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_vente[v_p_idx]);
            END LOOP;
        END IF;
    END LOOP;

    -- 10. Ajustements stock : rupture et faible pour diversifier les statuts affichés
    -- Laptop Lenovo ThinkPad E14 (index 2) → rupture (seuil=2)
    v_target := 0;
    IF v_stock_current[2] != v_target THEN
        v_stock_avant := v_stock_current[2];
        v_qty := (v_target - v_stock_current[2])::int;
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[2] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[2], 'adjust', v_qty, 'manual', NULL, current_date, 'Ajustement inventaire', v_stock_avant, v_target);
        v_stock_current[2] := v_target;
    END IF;

    -- Imprimante Canon PIXMA G3470 (index 6) → faible (1, seuil=3)
    v_target := 1;
    IF v_stock_current[6] != v_target THEN
        v_stock_avant := v_stock_current[6];
        v_qty := (v_target - v_stock_current[6])::int;
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[6] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[6], 'adjust', v_qty, 'manual', NULL, current_date, 'Ajustement inventaire', v_stock_avant, v_target);
        v_stock_current[6] := v_target;
    END IF;

    -- Câble HDMI 2m lot 10 (index 18) → rupture (seuil=20)
    v_target := 0;
    IF v_stock_current[18] != v_target THEN
        v_stock_avant := v_stock_current[18];
        v_qty := (v_target - v_stock_current[18])::int;
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[18] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[18], 'adjust', v_qty, 'manual', NULL, current_date, 'Ajustement inventaire', v_stock_avant, v_target);
        v_stock_current[18] := v_target;
    END IF;

    -- Toner HP 85A pack 2 (index 15) → faible (8, seuil=15)
    v_target := 8;
    IF v_stock_current[15] != v_target THEN
        v_stock_avant := v_stock_current[15];
        v_qty := (v_target - v_stock_current[15])::int;
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[15] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[15], 'adjust', v_qty, 'manual', NULL, current_date, 'Ajustement inventaire', v_stock_avant, v_target);
        v_stock_current[15] := v_target;
    END IF;

    RETURN QUERY SELECT v_user_id, v_company_id;
END;
$$;

-- ============================================================
-- FONCTION 2 : Mode PRODUCTION — pâtisserie marocaine
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_app_user_demo_production(
    p_email        text,
    p_password     text DEFAULT 'Démo@123',
    p_company_name text DEFAULT 'Bacha Pâtisserie SARL'
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
    SET name           = p_company_name,
        address        = 'Quartier Habous, Rue Nador, Casablanca',
        phone          = '0522340000',
        email          = 'contact@bacha-patisserie.ma',
        ice            = '002567890000001',
        if_number      = '56789012',
        rc             = 'RC-CASA-567890',
        tp_number      = '12345678'
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
    DELETE FROM public.stock_movements WHERE company_id = v_company_id;
    DELETE FROM public.stock           WHERE company_id = v_company_id;
    DELETE FROM public.products        WHERE company_id = v_company_id;
    DELETE FROM public.clients         WHERE company_id = v_company_id;
    DELETE FROM public.suppliers       WHERE company_id = v_company_id;

    v_stock_current := '{0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0}'::numeric[];

    -- 4. Données statiques
    v_moroccan_cities  := ARRAY['Casablanca','Rabat','Tanger','Marrakech','Agadir','Fès','Meknès','Oujda','Kénitra','Tétouan'];
    v_moroccan_streets := ARRAY['Boulevard Zerktouni','Avenue Mohammed V','Rue Taha Hussein','Quartier Gauthier','Sidi Maârouf','Technopark','Route d El Jadida','Avenue des FAR','Boulevard Anfa','Quartier de l Océan'];

    -- Indices 1-10 = matières premières, 11-20 = produits finis
    v_product_names := ARRAY[
        'Farine T55 (sac 50kg)',          'Sucre cristallisé (sac 50kg)',
        'Beurre extra-fin (kg)',           'Oeufs frais (plateau 30)',
        'Chocolat noir 70% (kg)',          'Crème fraîche 35% (litre)',
        'Amandes en poudre (kg)',          'Miel pur Atlas (kg)',
        'Eau de fleur d''oranger (litre)', 'Levure boulangère (kg)',
        'Cornes de gazelle (boîte 12)',    'Makroud au miel (boîte 12)',
        'Chebakia (kg)',                   'Ghriba aux amandes (boîte 12)',
        'Kaab el ghzal (boîte 12)',        'Briouates sucrées (boîte 10)',
        'Fekkas aux amandes (kg)',          'Plateau assortiment 24 pièces',
        'Plateau mariage prestige 48 pcs', 'Gâteau d''anniversaire (pièce)'
    ];
    v_product_natures := ARRAY[
        'matiere_premiere','matiere_premiere','matiere_premiere','matiere_premiere',
        'matiere_premiere','matiere_premiere','matiere_premiere','matiere_premiere',
        'matiere_premiere','matiere_premiere',
        'produit_fini','produit_fini','produit_fini','produit_fini','produit_fini',
        'produit_fini','produit_fini','produit_fini','produit_fini','produit_fini'
    ];
    -- pack pour boîtes/plateaux et MP conditionnés, individual pour vrac/pièces
    v_product_types  := ARRAY[
        'pack','individual','individual','pack','individual',
        'individual','individual','individual','individual','individual',
        'pack','pack','individual','pack','pack',
        'pack','individual','pack','pack','individual'
    ];
    v_product_pieces := ARRAY[
        50,1,1,30,1,1,1,1,1,1,
        12,12,1,12,12,10,1,24,48,1
    ];
    v_stock_alerts := ARRAY[20,15,10,8,5,8,5,3,5,5,
                             10,10,8,10,8,8,6,5,3,2];
    -- prix achat MP uniquement (indices 1-10)
    v_product_achat := ARRAY[85,145,32,48,88,22,95,65,38,28,
                               0,  0,  0,  0,  0,  0,  0,  0,  0,  0]::numeric[];
    -- prix vente PF uniquement (indices 11-20)
    v_product_vente := ARRAY[0,0,0,0,0,0,0,0,0,0,
                               65,55,80,70,72,60,90,180,320,280]::numeric[];

    v_supplier_names := ARRAY[
        'Meunerie Centrale Casablanca',        'Sucrafor Distribution',
        'Coopérative Laitière Oulmès',         'Ferme Avicole Souss',
        'Valrhona Maroc Import',               'Les Laiteries Aïn Borja',
        'Amandière du Moyen Atlas',            'Apicolture Atlas Honey',
        'Distillerie Fleur d''Oranger Tétouan','Épices & Saveurs du Maroc'
    ];

    v_client_names := ARRAY[
        'Marriott Casablanca Hotels',  'Sofitel Rabat Jardin des Roses',
        'Four Seasons Casablanca',     'Traiteur Royal Événements',
        'Café Maure La Chellah',       'La Grande Épicerie Maroc',
        'Carrefour Maroc Traiteur',    'Palais Jamaï Fès',
        'Royal Mansour Marrakech',     'Fauchon Maroc Distributeur',
        'Radisson Blu Casablanca',     'Pâtisserie Bennis Casa',
        'Hôtel La Mamounia Marrakech', 'Atlas Hospitality Group',
        'Elite Catering Services'
    ];

    -- Statuts achats MP (15) — 7 mois précédent + 8 mois courant
    v_purchase_statuses := ARRAY[
        'paid','paid','paid','paid','paid','partial','cancelled',
        'paid','partial','unpaid','paid','unpaid','paid','partial','unpaid'
    ];

    -- Statuts ventes PF (20) — 10 mois précédent + 10 mois courant (interleaved)
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
        v_ice  := '001' || LPAD(((v_i * 5678901) % 90000000 + 10000000)::text, 8, '0') || '0002';
        INSERT INTO public.suppliers (user_id, company_id, name, phone, address, ice)
        VALUES (v_user_id, v_company_id, v_supplier_names[v_i],
                '052' || LPAD(((v_i * 6789012) % 9000000 + 1000000)::text, 7, '0'),
                v_addr, v_ice)
        RETURNING id INTO v_s_id;
        v_supplier_ids := array_append(v_supplier_ids, v_s_id);
    END LOOP;

    -- 7. Créer les clients (15)
    FOR v_i IN 1..15 LOOP
        v_addr := v_moroccan_streets[((v_i - 1) % 10) + 1] || ', ' || v_moroccan_cities[((v_i - 1) % 10) + 1];
        v_ice  := '002' || LPAD(((v_i * 7890123) % 90000000 + 10000000)::text, 8, '0') || '0002';
        INSERT INTO public.clients (user_id, company_id, name, phone, address, ice)
        VALUES (v_user_id, v_company_id, v_client_names[v_i],
                '06' || LPAD(((v_i * 8901234) % 90000000 + 10000000)::text, 8, '0'),
                v_addr, v_ice)
        RETURNING id INTO v_c_id;
        v_client_ids := array_append(v_client_ids, v_c_id);
    END LOOP;

    -- 8. Achats matières premières (15) sur 2 mois
    -- Grandes quantités pour alimenter les ordres de production
    FOR v_i IN 1..15 LOOP
        v_status       := v_purchase_statuses[v_i];
        v_month_offset := CASE WHEN v_i <= 7 THEN 1 ELSE 0 END;
        v_day := CASE
            WHEN v_i <= 7 THEN (v_i - 1) * 3 + 1   -- jours 1,4,7,10,13,16,19
            ELSE (v_i - 8) * 2 + 1                   -- jours 1,3,5,7,9,11,13,15
        END;
        v_date    := (date_trunc('month', current_date)
                      - (v_month_offset || ' months')::interval
                      + (v_day          || ' days')::interval)::date;
        v_s_id    := v_supplier_ids[((v_i - 1) % 10) + 1];
        v_n_items := 1 + (v_i % 3);

        v_total := 0;
        FOR v_j IN 1..v_n_items LOOP
            v_p_idx := ((v_i + v_j * 3 - 1) % 10) + 1;  -- indices 1-10 uniquement
            v_qty   := 10 + (v_i + v_j) % 10;             -- 11-19 unités par ligne
            v_total := v_total + v_qty * v_product_achat[v_p_idx];
        END LOOP;

        v_paid := CASE v_status
            WHEN 'paid'      THEN v_total
            WHEN 'partial'   THEN ROUND(v_total * 0.5, 2)
            ELSE 0
        END;

        v_ach_seq := v_ach_seq + 1;
        INSERT INTO public.purchases (user_id, company_id, supplier_id, reference, date, status, total, paid)
        VALUES (v_user_id, v_company_id, v_s_id,
                'ACH-' || v_year || '-' || LPAD(v_ach_seq::text, 3, '0'),
                v_date, v_status, v_total, v_paid)
        RETURNING id INTO v_purchase_id;

        IF v_status != 'cancelled' THEN
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := ((v_i + v_j * 3 - 1) % 10) + 1;
                v_qty   := 10 + (v_i + v_j) % 10;
                v_price := v_product_achat[v_p_idx];

                INSERT INTO public.purchase_items (purchase_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_purchase_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_price);

                v_stock_avant            := v_stock_current[v_p_idx];
                v_stock_current[v_p_idx] := v_stock_current[v_p_idx] + v_qty;

                UPDATE public.stock SET quantity = v_stock_current[v_p_idx]
                WHERE product_id = v_product_ids[v_p_idx] AND company_id = v_company_id;

                INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, stock_avant, stock_apres)
                VALUES (v_user_id, v_company_id, v_product_ids[v_p_idx], 'in', v_qty, 'purchase', v_purchase_id, v_date, v_stock_avant, v_stock_current[v_p_idx]);
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
                v_qty   := 10 + (v_i + v_j) % 10;
                INSERT INTO public.purchase_items (purchase_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_purchase_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_achat[v_p_idx]);
            END LOOP;
        END IF;
    END LOOP;

    -- 8b. Ordres de production (10) — flux : consommation MP + fabrication PF
    -- Séquence : après les achats (stock MP positif), avant les ventes (stock PF disponible)
    FOR v_i IN 1..10 LOOP
        v_month_offset := CASE WHEN v_i <= 5 THEN 1 ELSE 0 END;
        v_day          := ((v_i - 1) % 5) * 4 + 8;  -- jours 8, 12, 16, 20, 24
        v_date         := (date_trunc('month', current_date)
                           - (v_month_offset || ' months')::interval
                           + (v_day          || ' days')::interval)::date;

        -- Produit fini fabriqué ce lot (tourne sur 11-20)
        v_p_idx  := 10 + ((v_i - 1) % 10) + 1;
        v_pf_qty := 30 + v_i * 5;  -- 35 à 80 unités produites (marge pour couvrir les ventes)

        -- Stock IN : produit fini
        v_stock_avant            := v_stock_current[v_p_idx];
        v_stock_current[v_p_idx] := v_stock_current[v_p_idx] + v_pf_qty;
        UPDATE public.stock SET quantity = v_stock_current[v_p_idx]
        WHERE product_id = v_product_ids[v_p_idx] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[v_p_idx], 'in', v_pf_qty, 'manual', NULL, v_date,
                'Production: ' || v_product_names[v_p_idx], v_stock_avant, v_stock_current[v_p_idx]);

        -- Stock OUT × 2 : matières premières consommées
        FOR v_j IN 1..2 LOOP
            v_mp_idx              := ((v_i * 3 + v_j * 2 - 1) % 10) + 1;  -- indices 1-10
            v_qty                 := 5 + v_i + v_j * 2;                    -- 8 à 19 unités
            -- Clamp : ne jamais consommer plus que le stock disponible
            IF v_qty > v_stock_current[v_mp_idx] THEN
                v_qty := GREATEST(v_stock_current[v_mp_idx], 0)::int;
            END IF;
            IF v_qty > 0 THEN
                v_stock_avant         := v_stock_current[v_mp_idx];
                v_stock_current[v_mp_idx] := v_stock_current[v_mp_idx] - v_qty;
                UPDATE public.stock SET quantity = v_stock_current[v_mp_idx]
                WHERE product_id = v_product_ids[v_mp_idx] AND company_id = v_company_id;
                INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
                VALUES (v_user_id, v_company_id, v_product_ids[v_mp_idx], 'out', v_qty, 'manual', NULL, v_date,
                        'Consommation: ' || v_product_names[v_p_idx], v_stock_avant, v_stock_current[v_mp_idx]);
            END IF;
        END LOOP;
    END LOOP;

    -- 9. Ventes produits finis (20) sur 2 mois
    FOR v_i IN 1..20 LOOP
        v_status       := v_sale_statuses[v_i];
        v_month_offset := CASE WHEN v_i <= 10 THEN 1 ELSE 0 END;
        v_day          := ((v_i - 1) % 10) * 2 + 1;  -- jours 1,3,5,...,19
        v_date         := (date_trunc('month', current_date)
                           - (v_month_offset || ' months')::interval
                           + (v_day          || ' days')::interval)::date;
        v_c_id    := v_client_ids[((v_i - 1) % 15) + 1];
        v_n_items := 1 + (v_i % 2);  -- 1 ou 2 items (mobilier = gros articles)

        SELECT name, address, ice, phone
        INTO v_client_name, v_client_address, v_client_ice, v_client_phone
        FROM public.clients WHERE id = v_c_id;

        -- Total (indices 11-20 = produits finis seulement)
        v_total := 0;
        FOR v_j IN 1..v_n_items LOOP
            v_p_idx := 10 + ((v_i + v_j * 5 - 1) % 10) + 1;  -- indices 11-20
            v_qty   := 6 + (v_i + v_j) % 8;                   -- 6 à 13 unités PF
            v_total := v_total + v_qty * v_product_vente[v_p_idx];
        END LOOP;

        v_paid := CASE v_status
            WHEN 'paid'      THEN v_total
            WHEN 'partial'   THEN ROUND(v_total * 0.5, 2)
            ELSE 0
        END;

        v_ven_seq := v_ven_seq + 1;
        INSERT INTO public.sales (user_id, company_id, client_id, reference, date, status, total, paid)
        VALUES (v_user_id, v_company_id, v_c_id,
                'VEN-' || v_year || '-' || LPAD(v_ven_seq::text, 3, '0'),
                v_date, v_status, v_total, v_paid)
        RETURNING id INTO v_sale_id;

        IF v_status != 'cancelled' THEN
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := 10 + ((v_i + v_j * 5 - 1) % 10) + 1;
                v_qty   := 6 + (v_i + v_j) % 8;
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

                    INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, stock_avant, stock_apres)
                    VALUES (v_user_id, v_company_id, v_product_ids[v_p_idx], 'out', v_qty, 'sale', v_sale_id, v_date, v_stock_avant, v_stock_current[v_p_idx]);
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
                total, paid,
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
                v_total, v_paid,
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
                v_qty   := 6 + (v_i + v_j) % 8;
                INSERT INTO public.document_items (document_id, product_id, product_name, quantity, pieces_count, unit_price)
                VALUES (v_doc_id, v_product_ids[v_p_idx], v_product_names[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_vente[v_p_idx]);
            END LOOP;

            IF v_payment_id IS NOT NULL THEN
                v_rec_seq := v_rec_seq + 1;
                INSERT INTO public.documents (
                    user_id, company_id, client_id, sale_id, payment_id,
                    type, number, date, status, payment_status,
                    total, paid,
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
                    v_total, v_paid,
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
                    v_qty   := 6 + (v_i + v_j) % 8;
                    INSERT INTO public.document_items (document_id, product_id, product_name, quantity, pieces_count, unit_price)
                    VALUES (v_doc_id, v_product_ids[v_p_idx], v_product_names[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_vente[v_p_idx]);
                END LOOP;
            END IF;

        ELSE
            FOR v_j IN 1..v_n_items LOOP
                v_p_idx := 10 + ((v_i + v_j * 5 - 1) % 10) + 1;
                v_qty   := 6 + (v_i + v_j) % 8;
                INSERT INTO public.sale_items (sale_id, product_id, quantity, pieces_count, unit_price)
                VALUES (v_sale_id, v_product_ids[v_p_idx], v_qty, v_product_pieces[v_p_idx], v_product_vente[v_p_idx]);
            END LOOP;
        END IF;
    END LOOP;

    -- 10. Ajustements stock : forcer rupture et faible sur quelques produits
    -- Beurre extra-fin kg (index 3) → rupture (seuil=10)
    v_target := 0;
    IF v_stock_current[3] != v_target THEN
        v_stock_avant := v_stock_current[3];
        v_qty := (v_target - v_stock_current[3])::int;
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[3] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[3], 'adjust', v_qty, 'manual', NULL, current_date, 'Ajustement inventaire', v_stock_avant, v_target);
        v_stock_current[3] := v_target;
    END IF;

    -- Amandes en poudre kg (index 7) → faible (3, seuil=5)
    v_target := 3;
    IF v_stock_current[7] != v_target THEN
        v_stock_avant := v_stock_current[7];
        v_qty := (v_target - v_stock_current[7])::int;
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[7] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[7], 'adjust', v_qty, 'manual', NULL, current_date, 'Ajustement inventaire', v_stock_avant, v_target);
        v_stock_current[7] := v_target;
    END IF;

    -- Chebakia kg (index 13) → rupture (seuil=8)
    v_target := 0;
    IF v_stock_current[13] != v_target THEN
        v_stock_avant := v_stock_current[13];
        v_qty := (v_target - v_stock_current[13])::int;
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[13] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[13], 'adjust', v_qty, 'manual', NULL, current_date, 'Ajustement inventaire', v_stock_avant, v_target);
        v_stock_current[13] := v_target;
    END IF;

    -- Plateau mariage prestige 48pcs (index 19) → faible (2, seuil=3)
    v_target := 2;
    IF v_stock_current[19] != v_target THEN
        v_stock_avant := v_stock_current[19];
        v_qty := (v_target - v_stock_current[19])::int;
        UPDATE public.stock SET quantity = v_target WHERE product_id = v_product_ids[19] AND company_id = v_company_id;
        INSERT INTO public.stock_movements (user_id, company_id, product_id, type, quantity, reference_type, reference_id, date, note, stock_avant, stock_apres)
        VALUES (v_user_id, v_company_id, v_product_ids[19], 'adjust', v_qty, 'manual', NULL, current_date, 'Ajustement inventaire', v_stock_avant, v_target);
        v_stock_current[19] := v_target;
    END IF;

    RETURN QUERY SELECT v_user_id, v_company_id;
END;
$$;

-- ============================================================
-- GRANTS
-- ============================================================
GRANT ALL ON FUNCTION public.create_app_user_demo_revente(text, text, text)    TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.create_app_user_demo_production(text, text, text) TO anon, authenticated, service_role;
