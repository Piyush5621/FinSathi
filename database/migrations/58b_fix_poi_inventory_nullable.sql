-- ============================================================================
-- Migration 58b: Fix purchase_order_items.inventory_id nullability
-- ============================================================================
--
-- The main migration 58 fixed the FK on purchase_order_items.inventory_id
-- from ON DELETE CASCADE to ON DELETE SET NULL. However, the column itself
-- was declared NOT NULL, making the SET NULL action impossible to execute.
--
-- This supplemental migration drops the NOT NULL constraint on inventory_id
-- so that archiving/deleting an inventory product correctly sets inventory_id
-- to NULL instead of blocking the delete or (worse) cascading a deletion.
--
-- SAFETY: 
--   - No data is modified.
--   - Existing rows where inventory_id IS NOT NULL remain unchanged.
--   - purchase_order_id retains NOT NULL (parent PO still required).
--   - Zero rows in purchase_order_items currently (verified during Phase 1).
-- ============================================================================

BEGIN;

-- Make inventory_id nullable so ON DELETE SET NULL can function correctly
ALTER TABLE public.purchase_order_items
  ALTER COLUMN inventory_id DROP NOT NULL;

-- Verification
DO $$
DECLARE
  v_nullable TEXT;
BEGIN
  SELECT is_nullable INTO v_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'purchase_order_items'
    AND column_name = 'inventory_id';

  IF v_nullable != 'YES' THEN
    RAISE EXCEPTION 'MIGRATION FAILED: inventory_id is still NOT NULL!';
  END IF;

  RAISE NOTICE 'Migration 58b PASSED: inventory_id is now nullable (ON DELETE SET NULL will work).';
END $$;

COMMIT;
