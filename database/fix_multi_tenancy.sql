-- 1. FIX CUSTOMERS
-- Ensure user_id exists (it does, but just in case)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id);

-- 2. FIX INVOICES
-- This table was missing the user_id column entirely
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id);

-- 3. FIX SALES
-- Ensure user_id exists
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id);

-- 4. FIX INVENTORY
-- Ensure user_id exists
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id);

-- 5. FIX EXPENSES
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id);

-- 6. FIX PAYMENTS
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id);

-- 7. CLEAN UP ZOMBIE DATA
-- We must delete old data that doesn't have a user, because it's showing up for everyone
DELETE FROM public.invoices WHERE user_id IS NULL;
DELETE FROM public.sales WHERE user_id IS NULL;
DELETE FROM public.customers WHERE user_id IS NULL;
DELETE FROM public.inventory WHERE user_id IS NULL;
DELETE FROM public.expenses WHERE user_id IS NULL;
DELETE FROM public.payments WHERE user_id IS NULL;
DELETE FROM public.notifications WHERE user_id IS NULL;
