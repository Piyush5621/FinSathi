-- Migration 27: Multi-Store and Staff Mapping Layout
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  gstin TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- Owner, Manager, Cashier, Accountant, Warehouse Staff, Delivery Staff
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.store_staff (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(store_id, staff_id)
);

CREATE TABLE IF NOT EXISTS public.user_store_preferences (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  active_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

-- Disable RLS for backend service role queries
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_store_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
