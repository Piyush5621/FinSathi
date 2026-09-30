-- ==============================================================================
-- KaroBar Feature 5: Purchases & Supplier Hub
-- Phase 6 Migration: Purchase Returns Hardening & Constraints
-- ==============================================================================

-- 1. Add idempotency_key to purchase_returns
ALTER TABLE public.purchase_returns 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Unique index for return idempotency per user / business
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_returns_user_idempotency 
ON public.purchase_returns(user_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- 3. Unique index for return_no per user / business
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_returns_user_return_no 
ON public.purchase_returns(user_id, return_no) 
WHERE return_no IS NOT NULL;

-- 4. Update purchase_orders status check constraint to support return states
ALTER TABLE public.purchase_orders 
DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders 
ADD CONSTRAINT purchase_orders_status_check 
CHECK (status = ANY (ARRAY[
  'Draft'::text, 
  'Sent'::text, 
  'Accepted'::text, 
  'Partially Received'::text, 
  'Received'::text, 
  'Completed'::text, 
  'Cancelled'::text,
  'Partially Returned'::text,
  'Returned'::text
]));

-- 5. Over-return prevention constraint on purchase_order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_poi_returned_le_received'
  ) THEN
    ALTER TABLE public.purchase_order_items 
    ADD CONSTRAINT check_poi_returned_le_received 
    CHECK (returned_quantity <= received_quantity);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_poi_returned_non_negative'
  ) THEN
    ALTER TABLE public.purchase_order_items 
    ADD CONSTRAINT check_poi_returned_non_negative 
    CHECK (returned_quantity >= 0);
  END IF;
END $$;
