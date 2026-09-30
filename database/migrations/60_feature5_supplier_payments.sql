-- ==============================================================================
-- KaroBar Feature 5: Purchases & Supplier Hub
-- Phase 5 Migration: Supplier Payment Hardening & Constraints
-- ==============================================================================

-- 1. Ensure supplier outstanding_balance cannot be negative (overpayment guard at DB level)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_outstanding_balance_check'
  ) THEN
    ALTER TABLE public.suppliers 
    ADD CONSTRAINT suppliers_outstanding_balance_check 
    CHECK (outstanding_balance >= 0);
  END IF;
END $$;

-- 2. Add notes and idempotency_key columns to supplier_payments
ALTER TABLE public.supplier_payments 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.supplier_payments 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 3. Idempotency unique index (per user / business)
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_payments_user_idempotency 
ON public.supplier_payments(user_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- 4. Performance & query indexes for supplier payments & ledger
CREATE INDEX IF NOT EXISTS idx_supplier_payments_user_supplier 
ON public.supplier_payments(user_id, supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_store_id 
ON public.supplier_payments(store_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_po_id 
ON public.supplier_payments(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_date 
ON public.supplier_payments(date);
