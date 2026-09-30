-- ==============================================================================
-- KaroBar Migration 65: Feature 7 — Expenses & Cashbook Hardening
-- ==============================================================================

-- 1. Harden public.expenses with required payment_method, organization_id, and system-generation guards
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';

ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN DEFAULT false;

ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Backfill existing records safely using established relationships
-- Backfill organization_id from users
UPDATE public.expenses e
SET organization_id = u.organization_id
FROM public.users u
WHERE e.user_id = u.id AND e.organization_id IS NULL AND u.organization_id IS NOT NULL;

-- Backfill store_id from stores if null
UPDATE public.expenses e
SET store_id = s.id
FROM (
  SELECT DISTINCT ON (user_id) id, user_id 
  FROM public.stores 
  ORDER BY user_id, created_at ASC
) s
WHERE e.user_id = s.user_id AND e.store_id IS NULL;

-- Ensure payment_method is populated
UPDATE public.expenses 
SET payment_method = 'Cash' 
WHERE payment_method IS NULL;

-- Mark system-generated purchase expenses based on receiving service history
UPDATE public.expenses 
SET is_system_generated = true 
WHERE category = 'Purchases' OR description ILIKE 'Purchase Order Received%';

-- 3. Create dedicated cash adjustments table for manual float/petty cash movements
CREATE TABLE IF NOT EXISTS public.cash_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  notes TEXT,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.cash_adjustments DISABLE ROW LEVEL SECURITY;

-- 4. Create performance indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_expenses_org_store_date 
  ON public.expenses (organization_id, store_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_store_date 
  ON public.expenses (store_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_payment_method 
  ON public.expenses (payment_method);

CREATE INDEX IF NOT EXISTS idx_expenses_category 
  ON public.expenses (category);

CREATE INDEX IF NOT EXISTS idx_cash_adjustments_org_store_date 
  ON public.cash_adjustments (organization_id, store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_adjustments_store_date 
  ON public.cash_adjustments (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_adjustments_user 
  ON public.cash_adjustments (user_id);

CREATE INDEX IF NOT EXISTS idx_expenses_idempotency 
  ON public.expenses (user_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;
