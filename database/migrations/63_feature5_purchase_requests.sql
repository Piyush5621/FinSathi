-- ==============================================================================
-- KaroBar — Feature 5: Purchases & Supplier Hub
-- Migration 63: Phase 8 — Purchase Requests Foundation
-- ==============================================================================
-- 
-- Creates:
-- 1. public.purchase_requests (Buyer-side purchase request lifecycle)
-- 2. public.purchase_request_items (Item-level snapshot & supplier-product links)
-- 
-- Guarantees:
-- - Immutable historical product snapshot (product_name, sku, unit, requested_price)
-- - Business isolation (scoped to authenticated user/buyer)
-- - Idempotency protection against duplicate submissions / browser retries
-- - Concurrency-safe unique request numbers
-- - Non-destructive cancellation & Phase 9 compatibility (accepted/rejected/expired)
-- ==============================================================================

-- 1. Create public.purchase_requests Table
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  request_number VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  notes TEXT,
  requested_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  idempotency_key VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Status Constraint (Phase 8 uses draft, sent, cancelled; Phase 9 adds accepted, rejected, expired)
  CONSTRAINT chk_purchase_request_status CHECK (
    status IN ('draft', 'sent', 'cancelled', 'accepted', 'rejected', 'expired')
  ),

  -- Unique request number per business
  CONSTRAINT uq_purchase_requests_user_req_no UNIQUE (user_id, request_number),

  -- Unique idempotency key per business
  CONSTRAINT uq_purchase_requests_idempotency UNIQUE (user_id, idempotency_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_requests_user_status 
  ON public.purchase_requests (user_id, status);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_supplier 
  ON public.purchase_requests (supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_store 
  ON public.purchase_requests (store_id);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at 
  ON public.purchase_requests (created_at DESC);


-- 2. Create public.purchase_request_items Table
CREATE TABLE IF NOT EXISTS public.purchase_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  supplier_product_id UUID REFERENCES public.supplier_products(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  
  -- Historical Snapshot Fields (Do not depend on future catalog edits)
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  requested_quantity NUMERIC(12,2) NOT NULL,
  requested_unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
  requested_price NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_pr_item_qty_positive CHECK (requested_quantity > 0),
  CONSTRAINT chk_pr_item_price_nonneg CHECK (requested_price IS NULL OR requested_price >= 0)
);

-- Indexes for items
CREATE INDEX IF NOT EXISTS idx_pr_items_request_id 
  ON public.purchase_request_items (purchase_request_id);

CREATE INDEX IF NOT EXISTS idx_pr_items_supplier_product 
  ON public.purchase_request_items (supplier_product_id);

CREATE INDEX IF NOT EXISTS idx_pr_items_product 
  ON public.purchase_request_items (product_id);
