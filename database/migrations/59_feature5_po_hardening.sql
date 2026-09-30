-- ============================================================================
-- Migration 59: Feature 5 — Purchase Order Hardening (Constraints & Safety)
-- ============================================================================
--
-- Adds safety CHECK constraints to prevent:
--   - Non-positive or negative quantities in purchase_order_items
--   - Negative cost price, GST rate, or discount amount
--   - Negative subtotal or total_amount in purchase_orders
--
-- Idempotent: Uses DO block to add constraints only if not already present.
-- Zero data loss: 0 purchase orders currently exist.
-- ============================================================================

BEGIN;

-- 1. purchase_order_items quantity > 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_poi_quantity_positive'
  ) THEN
    ALTER TABLE public.purchase_order_items
      ADD CONSTRAINT check_poi_quantity_positive CHECK (quantity > 0);
  END IF;
END $$;

-- 2. purchase_order_items cost_price >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_poi_cost_price_non_negative'
  ) THEN
    ALTER TABLE public.purchase_order_items
      ADD CONSTRAINT check_poi_cost_price_non_negative CHECK (cost_price >= 0);
  END IF;
END $$;

-- 3. purchase_order_items gst_rate >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_poi_gst_rate_non_negative'
  ) THEN
    ALTER TABLE public.purchase_order_items
      ADD CONSTRAINT check_poi_gst_rate_non_negative CHECK (gst_rate >= 0);
  END IF;
END $$;

-- 4. purchase_order_items discount_amount >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_poi_discount_non_negative'
  ) THEN
    ALTER TABLE public.purchase_order_items
      ADD CONSTRAINT check_poi_discount_non_negative CHECK (discount_amount >= 0);
  END IF;
END $$;

-- 5. purchase_orders subtotal >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_po_subtotal_non_negative'
  ) THEN
    ALTER TABLE public.purchase_orders
      ADD CONSTRAINT check_po_subtotal_non_negative CHECK (subtotal >= 0);
  END IF;
END $$;

-- 6. purchase_orders total_amount >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_po_total_amount_non_negative'
  ) THEN
    ALTER TABLE public.purchase_orders
      ADD CONSTRAINT check_po_total_amount_non_negative CHECK (total_amount >= 0);
  END IF;
END $$;

COMMIT;
