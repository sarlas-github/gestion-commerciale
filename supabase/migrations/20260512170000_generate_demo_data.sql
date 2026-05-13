CREATE OR REPLACE FUNCTION public.generate_demo_data(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_names text[] := ARRAY['Ordinateur Portable Pro i7', 'Ecran Dell 27p 4K', 'Clavier Logitech MX', 'Souris MX Master 3S', 'Casque Bose QC45', 'Imprimante HP LaserJet', 'Bureau Motorisé Sit-Stand', 'Chaise Herman Miller Aura', 'Disque SSD Samsung 2To', 'Webcam Razer Kiyo Pro', 'Hub USB-C Satechi', 'Enceintes JBL Flip 6', 'Sac à Dos Targus Pro', 'Tapis de Souris SteelSeries', 'Support Bras Double Ecran', 'Multiprise Belkin Pro', 'Adaptateur Apple USB-C', 'Câble Cat7 Snagless 10m', 'Lampe BenQ ScreenBar', 'Clé SanDisk Extreme 256'];
    
    v_client_names text[] := ARRAY['Maroc Telecom Services', 'Attijari Solutions', 'BCP Logistique', 'OCP Group Distri', 'Managem Tech', 'Ciments du Maroc SARL', 'Label Vie Express', 'Cosumar Export', 'Marsa Maroc Souss', 'Royal Air Maroc Cargo', 'Afriquia Logistique', 'Saham Services', 'Akwa Group Partner', 'Alliances Bâtiment', 'Addoha Construction', 'HPS Global Trade', 'Wafa Assurance Buro', 'LafargeHolcim Maroc', 'Taqa Morocco Tech', 'Sonasid Distribution'];
    
    v_client_cities text[] := ARRAY['Casablanca', 'Rabat', 'Tanger', 'Marrakech', 'Agadir', 'Fès', 'Meknès', 'Oujda', 'Kénitra', 'Tétouan'];
    v_client_streets text[] := ARRAY['Boulevard Zerktouni', 'Avenue Mohammed V', 'Rue Taha Hussein', 'Quartier Gauthier', 'Sidi Maârouf', 'Technopark', 'Route d El Jadida', 'Avenue des FAR', 'Boulevard Anfa', 'Quartier de l Ocean'];

    v_supplier_names text[] := ARRAY['Tech Data Morocco', 'Disway Distribution', 'Ingram Micro Casa', 'M2M Group Supply', 'Microchoix Pro', 'Next Step IT', 'Omnishore Supply', 'Data Plus Maroc', 'Azur Systems', 'Global IT Morocco', 'Netcom Distrib', 'Sodexo Buro', 'Top Bureau Tanger', 'Office Depot Casa', 'Lydec Services IT', 'Inwi Business Solutions', 'Orange Business Maroc', 'Intelcia Tech', 'Sitel Group Supply', 'Majorel Tech Support'];
    
    v_product_ids uuid[];
    v_client_ids uuid[];
    v_supplier_ids uuid[];
    v_product_base_prices numeric[];
    
    v_company record;
    v_i int;
    v_j int;
    v_p_idx int;
    v_p_id uuid;
    v_c_id uuid;
    v_s_id uuid;
    v_t_id uuid;
    v_doc_id uuid;
    
    v_price numeric;
    v_qty int;
    v_total numeric;
    v_paid numeric;
    v_date date;
    v_addr text;
    v_ice text;
BEGIN
    -- 0. ONLY READ your existing company data
    SELECT * INTO v_company FROM public.companies WHERE user_id = p_user_id LIMIT 1;

    -- Cleanup
    DELETE FROM public.document_items WHERE document_id IN (SELECT id FROM public.documents WHERE user_id = p_user_id);
    DELETE FROM public.documents WHERE user_id = p_user_id;
    DELETE FROM public.client_payments WHERE user_id = p_user_id;
    DELETE FROM public.supplier_payments WHERE user_id = p_user_id;
    DELETE FROM public.sale_items WHERE sale_id IN (SELECT id FROM public.sales WHERE user_id = p_user_id);
    DELETE FROM public.sales WHERE user_id = p_user_id;
    DELETE FROM public.purchase_items WHERE purchase_id IN (SELECT id FROM public.purchases WHERE user_id = p_user_id);
    DELETE FROM public.purchases WHERE user_id = p_user_id;
    DELETE FROM public.stock_movements WHERE user_id = p_user_id;
    DELETE FROM public.stock WHERE user_id = p_user_id;
    DELETE FROM public.products WHERE user_id = p_user_id;
    DELETE FROM public.clients WHERE user_id = p_user_id;
    DELETE FROM public.suppliers WHERE user_id = p_user_id;

    -- 1. Products (20)
    FOR v_i IN 1..20 LOOP
        INSERT INTO public.products (user_id, name, type, pieces_count, stock_alert, updated_at)
        VALUES (p_user_id, v_product_names[v_i], 'individual', 1, 5, now() - (v_i || ' minutes')::interval)
        RETURNING id INTO v_p_id;
        v_product_ids := array_append(v_product_ids, v_p_id);
        v_price := floor(random() * 400 + 100);
        v_product_base_prices := array_append(v_product_base_prices, v_price);
        INSERT INTO public.stock (user_id, product_id, quantity, updated_at) VALUES (p_user_id, v_p_id, 100, now() - (v_i || ' minutes')::interval);
    END LOOP;

    -- 2. Clients & Suppliers
    FOR v_i IN 1..20 LOOP
        v_addr := v_client_streets[floor(random() * 10 + 1)] || ', ' || v_client_cities[floor(random() * 10 + 1)];
        v_ice := '00' || floor(random() * 90000000 + 10000000)::text || '0000';
        
        INSERT INTO public.clients (user_id, name, phone, address, ice, updated_at)
        VALUES (p_user_id, v_client_names[v_i], '06' || floor(random() * 90000000 + 10000000)::text, v_addr, v_ice, now() - (v_i || ' minutes')::interval)
        RETURNING id INTO v_c_id;
        v_client_ids := array_append(v_client_ids, v_c_id);
        
        INSERT INTO public.suppliers (user_id, name, phone, address, ice, updated_at)
        VALUES (p_user_id, v_supplier_names[v_i], '05' || floor(random() * 90000000 + 10000000)::text, 'Zone Industrielle, ' || v_client_cities[floor(random() * 5 + 1)], 'SUP-' || v_ice, now() - (v_i || ' minutes')::interval)
        RETURNING id INTO v_s_id;
        v_supplier_ids := array_append(v_supplier_ids, v_s_id);
    END LOOP;

    -- 3. Realistic Purchases
    FOR v_i IN 1..3 LOOP
        v_date := current_date - (v_i - 1 || ' days')::interval;
        v_s_id := v_supplier_ids[21-v_i];
        v_total := 0;
        INSERT INTO public.purchases (user_id, supplier_id, date, reference, status, total, paid)
        VALUES (p_user_id, v_s_id, v_date, 'ACH-' || floor(random()*9000+1000)::text, 'unpaid', 0, 0) RETURNING id INTO v_t_id;
        
        FOR v_j IN 1..(floor(random() * 2 + 1)) LOOP
            v_p_idx := floor(random() * 10 + 1);
            v_p_id := v_product_ids[v_p_idx];
            v_qty := floor(random() * 5 + 2);
            v_price := v_product_base_prices[v_p_idx];
            INSERT INTO public.purchase_items (purchase_id, product_id, quantity, unit_price) VALUES (v_t_id, v_p_id, v_qty, v_price);
            INSERT INTO public.stock_movements (user_id, product_id, type, quantity, reference_type, reference_id, date) VALUES (p_user_id, v_p_id, 'out', v_qty, 'purchase', v_t_id, v_date);
            v_total := v_total + (v_qty * v_price);
        END LOOP;
        
        v_paid := CASE WHEN v_i = 1 THEN 0 ELSE v_total END;
        UPDATE public.purchases SET total = v_total, paid = v_paid, status = (CASE WHEN v_paid >= v_total THEN 'paid' ELSE 'unpaid' END) WHERE id = v_t_id;
        IF v_paid > 0 THEN INSERT INTO public.supplier_payments (user_id, purchase_id, amount, date, methode_paiement) VALUES (p_user_id, v_t_id, v_paid, v_date, 'Virement bancaire'); END IF;
    END LOOP;

    -- 4. Realistic Sales
    FOR v_i IN 1..11 LOOP
        v_date := current_date - (v_i - 1 || ' days')::interval;
        v_c_id := v_client_ids[21-v_i];
        v_total := 0;
        
        INSERT INTO public.sales (user_id, client_id, date, reference, status, total, paid)
        VALUES (p_user_id, v_c_id, v_date, 'VEN-' || floor(random()*9000+1000)::text, 'unpaid', 0, 0) RETURNING id INTO v_t_id;
        
        -- Snapshot of client info
        SELECT address, ice, phone INTO v_addr, v_ice, v_price FROM public.clients WHERE id = v_c_id;

        INSERT INTO public.documents (
            user_id, client_id, sale_id, type, number, date, status, total, paid, 
            client_name, client_address, client_ice, client_phone,
            company_name, company_address, company_phone, company_email, company_ice, company_if, company_rc, company_tp, company_rib,
            company_site_web, company_couleur_marque, company_logo_url, mode_paiement
        )
        VALUES (
            p_user_id, v_c_id, v_t_id, 'invoice', 'FAC-' || (EXTRACT(YEAR FROM v_date)) || '-' || LPAD(v_i::text, 3, '0'), v_date, 'confirmed', 0, 0, 
            v_client_names[21-v_i], v_addr, v_ice, v_price::text,
            COALESCE(v_company.name, 'Votre Société'), COALESCE(v_company.address, ''), COALESCE(v_company.phone, ''), COALESCE(v_company.email, ''), 
            COALESCE(v_company.ice, ''), COALESCE(v_company.if_number, ''), COALESCE(v_company.rc, ''), COALESCE(v_company.tp_number, ''), 
            COALESCE(v_company.rib, ''), COALESCE(v_company.site_web, ''), COALESCE(v_company.couleur_marque, '#4f46e5'),
            v_company.logo_url, 'Espèces'
        ) RETURNING id INTO v_doc_id;

        FOR v_j IN 1..(floor(random() * 2 + 1)) LOOP
            v_p_idx := floor(random() * 15 + 1);
            v_p_id := v_product_ids[v_p_idx];
            v_qty := floor(random() * 2 + 1);
            v_price := v_product_base_prices[v_p_idx] * 2.2;
            INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price) VALUES (v_t_id, v_p_id, v_qty, v_price);
            INSERT INTO public.document_items (document_id, product_id, product_name, quantity, unit_price) VALUES (v_doc_id, v_p_id, v_product_names[v_p_idx], v_qty, v_price);
            INSERT INTO public.stock_movements (user_id, product_id, type, quantity, reference_type, reference_id, date) VALUES (p_user_id, v_p_id, 'out', v_qty, 'sale', v_t_id, v_date);
            UPDATE public.stock SET quantity = quantity - v_qty WHERE product_id = v_p_id;
            v_total := v_total + (v_qty * v_price);
        END LOOP;

        v_paid := CASE WHEN v_i = 1 THEN 0 ELSE v_total END;
        UPDATE public.sales SET total = v_total, paid = v_paid, status = (CASE WHEN v_paid >= v_total THEN 'paid' ELSE 'unpaid' END) WHERE id = v_t_id;
        UPDATE public.documents SET total = v_total, paid = v_paid WHERE id = v_doc_id;
        IF v_paid > 0 THEN INSERT INTO public.client_payments (user_id, sale_id, amount, date, methode_paiement) VALUES (p_user_id, v_t_id, v_paid, v_date, 'Espèces'); END IF;
    END LOOP;

    -- 8. PAGE 1 FORCE
    UPDATE public.clients SET updated_at = now() WHERE id = v_client_ids[20];
    UPDATE public.suppliers SET updated_at = now() WHERE id = v_supplier_ids[20];
    UPDATE public.products SET stock_alert = 5, updated_at = now() WHERE id = v_product_ids[20];
    UPDATE public.stock SET quantity = 0, updated_at = now() WHERE product_id = v_product_ids[20];

    RETURN 'Succès : Démo avec Logo et Données Réelles (Full Sync)';
END;
$$;
