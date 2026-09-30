-- ==============================================================================
-- Canonical Migration 10: Core Seed Defaults (Roles, Perms, GST Rates)
-- ==============================================================================

-- 1. Standard RBAC Roles
INSERT INTO public.roles (name, description, is_system) VALUES
  ('Owner', 'Full business owner with access to all settings, financial data, and stores', TRUE),
  ('Manager', 'Store manager with operations access across inventory, purchases, and sales', TRUE),
  ('Cashier', 'POS operator with checkout and basic billing view permissions', TRUE),
  ('Accountant', 'Financial auditor with view access to reports, ledger, and GST', TRUE),
  ('Warehouse Staff', 'Stock handler managing inventory counts, receiving, and transfers', TRUE),
  ('Delivery Staff', 'Logistics handler managing customer order deliveries', TRUE)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 2. Granular Permissions
INSERT INTO public.permissions (key, label, module, description) VALUES
  ('view_catalog', 'View Product Catalog', 'Catalog', 'Allow viewing products and categories'),
  ('edit_catalog', 'Edit Product Catalog', 'Catalog', 'Allow creating and updating products'),
  ('delete_inventory', 'Delete Inventory Item', 'Catalog', 'Allow deleting items from catalog'),
  ('view_billing', 'View POS & Billing', 'Sales', 'Allow viewing sale receipts and invoices'),
  ('create_sales', 'Create POS Bills', 'Sales', 'Allow ringing up sales at terminal'),
  ('approve_po', 'Approve Purchase Orders', 'Procurement', 'Allow approving purchase orders to suppliers'),
  ('post_invoices', 'Post Purchase Invoices', 'Procurement', 'Allow posting receiving invoices to ledger'),
  ('run_counts', 'Run Stock Counts', 'Inventory', 'Allow physical stock reconciliation'),
  ('adjust_costs', 'Adjust Costs & Variances', 'Inventory', 'Allow modifying cost prices'),
  ('admin_setup', 'System Administration', 'Admin', 'Allow modifying organization and store settings')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

-- 3. Role-Permission Defaults
DO $$
DECLARE
    r_owner UUID;
    r_manager UUID;
    r_cashier UUID;
    r_accountant UUID;
    r_warehouse UUID;
    r_delivery UUID;
BEGIN
    SELECT id INTO r_owner FROM public.roles WHERE name = 'Owner';
    SELECT id INTO r_manager FROM public.roles WHERE name = 'Manager';
    SELECT id INTO r_cashier FROM public.roles WHERE name = 'Cashier';
    SELECT id INTO r_accountant FROM public.roles WHERE name = 'Accountant';
    SELECT id INTO r_warehouse FROM public.roles WHERE name = 'Warehouse Staff';
    SELECT id INTO r_delivery FROM public.roles WHERE name = 'Delivery Staff';

    -- Owner
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_owner, id FROM public.permissions
    ON CONFLICT DO NOTHING;

    -- Manager
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_manager, id FROM public.permissions WHERE key IN ('view_catalog', 'edit_catalog', 'approve_po', 'post_invoices', 'run_counts', 'view_billing', 'create_sales')
    ON CONFLICT DO NOTHING;

    -- Cashier
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_cashier, id FROM public.permissions WHERE key IN ('view_catalog', 'view_billing', 'create_sales')
    ON CONFLICT DO NOTHING;

    -- Accountant
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_accountant, id FROM public.permissions WHERE key IN ('view_catalog', 'post_invoices', 'view_billing')
    ON CONFLICT DO NOTHING;

    -- Warehouse Staff
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_warehouse, id FROM public.permissions WHERE key IN ('view_catalog', 'run_counts')
    ON CONFLICT DO NOTHING;

    -- Delivery Staff
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_delivery, id FROM public.permissions WHERE key IN ('view_catalog')
    ON CONFLICT DO NOTHING;
END $$;

-- 4. Standard GST Rates
INSERT INTO public.gst_rates (rate, cgst, sgst, igst, description) VALUES
  (0.00, 0.00, 0.00, 0.00, 'Nil / Exempted'),
  (5.00, 2.50, 2.50, 5.00, 'GST 5%'),
  (12.00, 6.00, 6.00, 12.00, 'GST 12%'),
  (18.00, 9.00, 9.00, 18.00, 'GST 18% (Standard)'),
  (28.00, 14.00, 14.00, 28.00, 'GST 28%')
ON CONFLICT (rate) DO NOTHING;

-- 5. Disable RLS for all public tables (Backend Pool / Service Role pattern)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;
