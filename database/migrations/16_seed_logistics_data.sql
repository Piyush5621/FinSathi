-- Seed Logistics Data for Testing
DO $$ 
DECLARE 
    v_user_id UUID;
    v_wh_id UUID;
    v_supp_id UUID;
    v_po_id UUID;
BEGIN
    -- Get a user ID
    SELECT id INTO v_user_id FROM public.users LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- 1. Create Warehouses
        INSERT INTO public.warehouses (user_id, name, location, capacity_used, is_main_hub)
        VALUES (v_user_id, 'Central Terminal - Delhi', 'Rohini Sector 7, Delhi', 65, true)
        RETURNING id INTO v_wh_id;

        INSERT INTO public.warehouses (user_id, name, location, capacity_used, is_main_hub)
        VALUES (v_user_id, 'Regional Hub - Mumbai', 'Bandra West, Mumbai', 30, false);

        -- 2. Create a Supplier
        INSERT INTO public.suppliers (user_id, name, phone, email, address)
        VALUES (v_user_id, 'Tata Steel Ltd.', '9876543210', 'sales@tatasteel.com', 'Jamshedpur, Jharkhand')
        RETURNING id INTO v_supp_id;

        -- 3. Create a Purchase Order
        INSERT INTO public.purchase_orders (user_id, supplier_id, warehouse_id, status, total, tracking_id, expected_delivery)
        VALUES (v_user_id, v_supp_id, v_wh_id, 'shipping', 125000, 'TATA-592-DEL', now() + interval '3 days')
        RETURNING id INTO v_po_id;

        -- 4. Add items to PO (Assuming first inventory item)
        -- Removing user_id filter as it may not exist in this database version
        INSERT INTO public.po_items (po_id, inventory_id, quantity, unit_price)
        SELECT v_po_id, id, 50, COALESCE(price, 0) FROM public.inventory LIMIT 1;
        
    END IF;
END $$;
