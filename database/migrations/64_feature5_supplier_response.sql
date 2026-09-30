-- Migration 64: Feature 5 Phase 9 - Supplier Response Hardening
-- Creates purchase_request_responses and purchase_request_response_items tables
-- Extends purchase_requests status constraint to include 'countered' and 'completed'
-- Links purchase_orders back to purchase_requests via purchase_request_id

BEGIN;

-- 1. Extend purchase_requests status constraint
ALTER TABLE public.purchase_requests DROP CONSTRAINT IF EXISTS chk_purchase_request_status;
ALTER TABLE public.purchase_requests ADD CONSTRAINT chk_purchase_request_status 
  CHECK (status IN ('draft', 'sent', 'cancelled', 'accepted', 'rejected', 'countered', 'expired', 'completed'));

-- 2. Create purchase_request_responses table
CREATE TABLE IF NOT EXISTS public.purchase_request_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    supplier_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'countered')),
    responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_request_responses_pr_id ON public.purchase_request_responses(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_responses_supplier_id ON public.purchase_request_responses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_responses_supplier_user ON public.purchase_request_responses(supplier_user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_responses_idempotency ON public.purchase_request_responses(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3. Create purchase_request_response_items table
CREATE TABLE IF NOT EXISTS public.purchase_request_response_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES public.purchase_request_responses(id) ON DELETE CASCADE,
    purchase_request_item_id UUID NOT NULL REFERENCES public.purchase_request_items(id) ON DELETE CASCADE,
    supplier_product_id UUID REFERENCES public.supplier_products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    unit VARCHAR(32) DEFAULT 'pcs',
    requested_quantity NUMERIC(15, 3) NOT NULL CHECK (requested_quantity > 0),
    available_quantity NUMERIC(15, 3),
    offered_quantity NUMERIC(15, 3) NOT NULL CHECK (offered_quantity >= 0),
    requested_price NUMERIC(15, 2),
    offered_price NUMERIC(15, 2) NOT NULL CHECK (offered_price >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_response_items_response_id ON public.purchase_request_response_items(response_id);
CREATE INDEX IF NOT EXISTS idx_pr_response_items_pr_item_id ON public.purchase_request_response_items(purchase_request_item_id);

-- 4. Add purchase_request_id column to purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS purchase_request_id UUID REFERENCES public.purchase_requests(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_purchase_request_id ON public.purchase_orders (purchase_request_id);

COMMIT;
