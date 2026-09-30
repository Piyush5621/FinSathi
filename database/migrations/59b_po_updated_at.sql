-- ============================================================================
-- Migration 59b: Add updated_at column to purchase_orders
-- ============================================================================
--
-- Enables audit tracking of record modifications on purchase_orders.
-- ============================================================================

BEGIN;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now());

COMMIT;
