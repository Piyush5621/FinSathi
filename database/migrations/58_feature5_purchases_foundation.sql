-- ============================================================================
-- Migration 58: Feature 5 — Purchases & Supplier Hub — Phase 1 Foundation
-- ============================================================================
-- 
-- WHAT THIS MIGRATION DOES:
--   1. Fixes purchase_orders: adds missing order_no, total_amount, date,
--      organization_id columns (backend and GstService expect them).
--   2. Fixes purchase_orders.status DEFAULT from 'draft' to 'Draft' (matches constraint).
--   3. Fixes purchase_order_items.inventory_id FK from ON DELETE CASCADE 
--      to ON DELETE SET NULL — prevents historical PO data destruction on product archive.
--   4. Adds variant_id FK to purchase_order_items (Feature 4 variant support).
--   5. Adds received_quantity to purchase_order_items for partial receiving.
--   6. Adds is_archived to suppliers for non-destructive archival.
--   7. Creates purchase_returns and purchase_return_items tables (return foundation).
--   8. Adds performance indexes.
--
-- SAFETY GUARANTEES:
--   - All changes use ADD COLUMN IF NOT EXISTS (idempotent).
--   - No table is dropped or recreated.
--   - Existing rows are preserved and backfilled safely.
--   - FK change on purchase_order_items uses a careful DROP+ADD with transaction.
--   - Zero data loss. 0 purchase orders currently exist (verified via inspection).
--
-- VERIFIED PRE-CONDITIONS (from Phase 1 inspection):
--   - suppliers: 10 rows, intact
--   - purchase_orders: 0 rows
--   - purchase_order_items: 0 rows
--   - supplier_payments: 0 rows  
--   - product_variants table EXISTS with id (UUID PK)
--   - audit_logs has different schema than controller expects (noted, fix in comment)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Fix purchase_orders schema
-- ============================================================================

-- 1a. Add missing order_no column
-- Backend expects: unique per user, text, used for PO reference numbers
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS order_no TEXT;

-- 1b. Add missing total_amount column
-- Backend and DashboardService both select/insert total_amount
-- The table currently has 'total' (Migration 15 legacy). Keep 'total' for backward compat.
-- Add total_amount as the canonical total column going forward.
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- 1c. Add date column (GstService uses .gte('date', ...) and .lte('date', ...))
-- This is the effective purchase/invoice date separate from created_at
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS date DATE;

-- 1d. Add organization_id column (GstService uses .or(`organization_id.eq.${orgId},user_id.eq.${userId}`))
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 1e. Add expected_delivery_date (normalized name vs legacy expected_delivery timestamptz)
-- Keep legacy expected_delivery for backward compat; add normalized date column
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;

-- 1f. Fix status DEFAULT — currently 'draft' (lowercase) but constraint requires title-case 'Draft'
-- PostgreSQL allows ALTER COLUMN SET DEFAULT
ALTER TABLE public.purchase_orders
  ALTER COLUMN status SET DEFAULT 'Draft';

-- 1g. Backfill date from created_at for any existing POs (currently 0 rows, safe no-op)
UPDATE public.purchase_orders
  SET date = created_at::DATE
  WHERE date IS NULL;

-- 1h. Backfill expected_delivery_date from expected_delivery where available
UPDATE public.purchase_orders
  SET expected_delivery_date = expected_delivery::DATE
  WHERE expected_delivery_date IS NULL AND expected_delivery IS NOT NULL;

-- 1i. Backfill total_amount from 'total' column where total_amount is still 0
-- (Catches any legacy rows that had data in 'total' but not 'total_amount')
UPDATE public.purchase_orders
  SET total_amount = GREATEST(total_amount, COALESCE(total, 0))
  WHERE total_amount = 0 AND COALESCE(total, 0) > 0;

-- 1j. Add unique index on (user_id, order_no) for safe duplicate prevention
-- Must handle NULLs (order_no might be null on old rows) — use partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_user_order_no
  ON public.purchase_orders (user_id, order_no)
  WHERE order_no IS NOT NULL;

-- 1k. General performance indexes for purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id
  ON public.purchase_orders (user_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_store_id
  ON public.purchase_orders (store_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id
  ON public.purchase_orders (supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON public.purchase_orders (status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_date
  ON public.purchase_orders (date);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at
  ON public.purchase_orders (created_at DESC);

-- ============================================================================
-- SECTION 2: Fix purchase_order_items schema
-- ============================================================================

-- 2a. Fix dangerous ON DELETE CASCADE on inventory_id FK
-- Current: DELETE from inventory CASCADE-deletes historical PO items (DANGEROUS!)
-- Fixed: ON DELETE SET NULL — preserves the PO line item history, sets inventory_id = NULL
-- This is a CRITICAL data integrity fix.
ALTER TABLE public.purchase_order_items
  DROP CONSTRAINT IF EXISTS purchase_order_items_inventory_id_fkey;

ALTER TABLE public.purchase_order_items
  ADD CONSTRAINT purchase_order_items_inventory_id_fkey
  FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE SET NULL;

-- 2b. Add variant_id for variant-aware purchasing (Feature 4 integration)
-- Uses product_variants (the Feature 4 canonical variant table)
-- NULL = product-only purchase, non-NULL = variant-specific purchase
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

-- 2c. Add received_quantity for partial receiving tracking
-- Tracks how much of the ordered quantity has been physically received so far
-- Enables partial receiving and over-receive prevention
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS received_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0;

-- 2d. Add returned_quantity for future purchase return support
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS returned_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0;

-- 2e. Index for variant lookups in PO items
CREATE INDEX IF NOT EXISTS idx_po_items_variant_id
  ON public.purchase_order_items (variant_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_po_items_inventory_id
  ON public.purchase_order_items (inventory_id)
  WHERE inventory_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_po_items_purchase_order_id
  ON public.purchase_order_items (purchase_order_id);

-- ============================================================================
-- SECTION 3: Fix suppliers schema
-- ============================================================================

-- 3a. Add is_archived for non-destructive supplier archival
-- When is_archived = true, supplier is hidden from active lists but preserved in history
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- 3b. Add archived_at timestamp for audit trail
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 3c. Index for filtering active vs archived suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_is_archived
  ON public.suppliers (user_id, is_archived);

-- ============================================================================
-- SECTION 4: Purchase Returns foundation tables
-- ============================================================================

-- 4a. purchase_returns: The return header record
CREATE TABLE IF NOT EXISTS public.purchase_returns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  return_no TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Cancelled')),
  reason TEXT,
  notes TEXT,
  total_return_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  supplier_credit_issued BOOLEAN NOT NULL DEFAULT false,
  supplier_credit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

-- 4b. purchase_return_items: Individual line items being returned
CREATE TABLE IF NOT EXISTS public.purchase_return_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  purchase_return_id UUID NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  reason TEXT CHECK (reason IN (
    'Damaged', 'Expired', 'Wrong Product', 'Excess Quantity',
    'Rejected Goods', 'Quality Issue', 'Other'
  )),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

-- 4c. Indexes for purchase_returns
CREATE INDEX IF NOT EXISTS idx_purchase_returns_user_id
  ON public.purchase_returns (user_id);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_store_id
  ON public.purchase_returns (store_id);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_po_id
  ON public.purchase_returns (purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier_id
  ON public.purchase_returns (supplier_id);

-- 4d. Indexes for purchase_return_items
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return_id
  ON public.purchase_return_items (purchase_return_id);

CREATE INDEX IF NOT EXISTS idx_purchase_return_items_inventory_id
  ON public.purchase_return_items (inventory_id)
  WHERE inventory_id IS NOT NULL;

-- 4e. RLS: disable for now (consistent with other purchase tables in this project)
ALTER TABLE public.purchase_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 5: Fix audit_logs mismatch
-- ============================================================================
-- The PurchaseOrderController's logAudit() inserts:
--   entity_type, entity_id, action, details
-- But the real audit_logs table has:
--   table_name, record_id, old_values, new_values
--
-- Solution: Add the missing columns so logAudit() calls succeed.
-- These columns may already exist from a different migration; use IF NOT EXISTS.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_type TEXT;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_id UUID;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS action TEXT;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS details JSONB;

-- ============================================================================
-- SECTION 6: Verification queries (run inside the transaction to confirm)
-- ============================================================================

-- Verify all critical columns now exist
DO $$
DECLARE
  v_has_order_no BOOLEAN;
  v_has_total_amount BOOLEAN;
  v_has_variant_id BOOLEAN;
  v_has_received_quantity BOOLEAN;
  v_has_is_archived BOOLEAN;
  v_has_date BOOLEAN;
  v_purchase_returns_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'order_no'
  ) INTO v_has_order_no;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'total_amount'
  ) INTO v_has_total_amount;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_items' AND column_name = 'variant_id'
  ) INTO v_has_variant_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_items' AND column_name = 'received_quantity'
  ) INTO v_has_received_quantity;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'is_archived'
  ) INTO v_has_is_archived;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'date'
  ) INTO v_has_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'purchase_returns'
  ) INTO v_purchase_returns_exists;

  IF NOT v_has_order_no THEN
    RAISE EXCEPTION 'MIGRATION FAILED: purchase_orders.order_no still missing!';
  END IF;
  IF NOT v_has_total_amount THEN
    RAISE EXCEPTION 'MIGRATION FAILED: purchase_orders.total_amount still missing!';
  END IF;
  IF NOT v_has_variant_id THEN
    RAISE EXCEPTION 'MIGRATION FAILED: purchase_order_items.variant_id still missing!';
  END IF;
  IF NOT v_has_received_quantity THEN
    RAISE EXCEPTION 'MIGRATION FAILED: purchase_order_items.received_quantity still missing!';
  END IF;
  IF NOT v_has_is_archived THEN
    RAISE EXCEPTION 'MIGRATION FAILED: suppliers.is_archived still missing!';
  END IF;
  IF NOT v_has_date THEN
    RAISE EXCEPTION 'MIGRATION FAILED: purchase_orders.date still missing!';
  END IF;
  IF NOT v_purchase_returns_exists THEN
    RAISE EXCEPTION 'MIGRATION FAILED: purchase_returns table not created!';
  END IF;

  RAISE NOTICE 'Migration 58 verification PASSED: All required columns and tables confirmed.';
END $$;

COMMIT;
