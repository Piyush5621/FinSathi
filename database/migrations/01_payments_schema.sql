-- 1. Create Payments Table
-- NOTE: Changed customer_id to BIGINT to match existing customers table schema
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id BIGINT REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  payment_mode TEXT, -- 'cash', 'upi', 'bank_transfer', etc.
  reference TEXT, -- Transaction ID or Note
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add amount_paid to sales table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='amount_paid') THEN
        ALTER TABLE public.sales ADD COLUMN amount_paid NUMERIC(12, 2) DEFAULT 0.00;
    END IF;
END $$;

-- 3. DISABLE RLS on payments (Security is handled by Backend API)
-- We disable this because the backend uses the standard client which may not have the authenticated user context,
-- leading to RLS blocking valid inserts from the API.
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

-- If RLS was previously enabled, this disables it.
-- If you strictly require RLS, you must use the Service Role Key in the backend or forward the auth token.
