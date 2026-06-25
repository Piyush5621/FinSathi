-- Migration 34: Legacy Store Migration and Default Roles Seeding

-- 1. Seed Roles table
INSERT INTO public.roles (name, description) VALUES
  ('Owner', 'Full business owner with access to settings and multi-store settings'),
  ('Manager', 'Store manager with full store operations permissions except database settings'),
  ('Cashier', 'POS operator with billing permissions'),
  ('Accountant', 'View reports, ledger operations and salary payments'),
  ('Warehouse Staff', 'Add inventory products and manage stock and PO restocks'),
  ('Delivery Staff', 'Manage delivery trips and logistics status')
ON CONFLICT (name) DO NOTHING;

-- 2. Retrofit Legacy Users
DO $$
DECLARE
  user_rec RECORD;
  default_store_id UUID;
BEGIN
  FOR user_rec IN SELECT id, business_name FROM public.users LOOP
    -- Check if a store already exists for the user
    SELECT id INTO default_store_id FROM public.stores WHERE user_id = user_rec.id LIMIT 1;
    
    IF default_store_id IS NULL THEN
      -- Create a default Main Branch store
      INSERT INTO public.stores (user_id, name, address, is_active)
      VALUES (user_rec.id, COALESCE(user_rec.business_name, 'Main Branch'), 'Head Office Address', TRUE)
      RETURNING id INTO default_store_id;
    END IF;

    -- Upsert preferences
    INSERT INTO public.user_store_preferences (user_id, active_store_id)
    VALUES (user_rec.id, default_store_id)
    ON CONFLICT (user_id) DO UPDATE SET active_store_id = default_store_id;

    -- Safe Retrofit Map
    UPDATE public.inventory SET store_id = default_store_id WHERE user_id = user_rec.id AND store_id IS NULL;
    UPDATE public.staff SET store_id = default_store_id WHERE user_id = user_rec.id AND store_id IS NULL;
    UPDATE public.sales SET store_id = default_store_id WHERE user_id = user_rec.id AND store_id IS NULL;
    UPDATE public.expenses SET store_id = default_store_id WHERE user_id = user_rec.id AND store_id IS NULL;
  END LOOP;
END $$;
```,Description:
