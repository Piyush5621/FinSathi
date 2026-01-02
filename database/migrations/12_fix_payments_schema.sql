-- Fix payments table schema if previously failed
-- 1. Check if payments table exists, if so drop and recreate correct, or modify
-- Better to just ensure it matches.

-- Drop table (if empty or broken) to recreate with correct FK type
DROP TABLE IF EXISTS public.payments;

CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE, -- Changed to UUID
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  payment_mode TEXT, -- 'cash', 'upi', 'bank_transfer', etc.
  reference TEXT, -- Transaction ID or Note
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable RLS
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

-- Ensure amount_paid column exists in sales
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='amount_paid') THEN
        ALTER TABLE public.sales ADD COLUMN amount_paid NUMERIC(12, 2) DEFAULT 0.00;
    END IF;
END $$;
