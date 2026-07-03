-- Migration 54: Inventory Engine & Warehouse Stock (Sprint 4)
-- Safe, idempotent script for PostgreSQL 16+

-- 1. Inventory Batches
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    supplier_batch VARCHAR(100) NULL,
    manufacturing_date DATE NULL,
    expiry_date DATE NULL,
    purchase_cost NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, quarantined, hold
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_prod_wh_batch UNIQUE (organization_id, product_id, warehouse_id, batch_number)
);
CREATE INDEX IF NOT EXISTS idx_batches_lookup ON public.inventory_batches(organization_id, product_id, warehouse_id);

-- 2. Inventory Serial Numbers
CREATE TABLE IF NOT EXISTS public.inventory_serial_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT NOT NULL,
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    serial_number VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Available', -- Available, Reserved, Sold, Returned, Damaged, Scrapped, Lost
    warranty_expiry_date DATE NULL,
    sold_at TIMESTAMPTZ NULL,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_serial_unique UNIQUE (organization_id, serial_number)
);
CREATE INDEX IF NOT EXISTS idx_serials_lookup ON public.inventory_serial_numbers(organization_id, serial_number);

-- 3. Warehouse Summary Stock Table
CREATE TABLE IF NOT EXISTS public.warehouse_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT NOT NULL,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE NULL,
    on_hand NUMERIC(12,4) NOT NULL DEFAULT 0.0000 CHECK (on_hand >= 0.0000),
    reserved NUMERIC(12,4) NOT NULL DEFAULT 0.0000 CHECK (reserved >= 0.0000),
    available NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    incoming NUMERIC(12,4) NOT NULL DEFAULT 0.0000 CHECK (incoming >= 0.0000),
    outgoing NUMERIC(12,4) NOT NULL DEFAULT 0.0000 CHECK (outgoing >= 0.0000),
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_wh_prod_var UNIQUE (organization_id, warehouse_id, product_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_wh_stock_lookup ON public.warehouse_stock(organization_id, warehouse_id, product_id, variant_id);

-- 4. Immutable Inventory Movement Ledger (Partitioned by Month)
-- PostgreSQL range partition requires PRIMARY KEY to include partitioning column (created_at)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    warehouse_id UUID NOT NULL,
    product_id UUID NOT NULL,
    variant_id UUID NULL,
    batch_id UUID NULL,
    serial_number VARCHAR(100) NULL,
    quantity NUMERIC(12,4) NOT NULL, -- positive = addition, negative = deduction
    movement_type VARCHAR(30) NOT NULL, -- opening_stock, purchase_receipt, purchase_return, sale, etc.
    reference_type VARCHAR(50) NOT NULL, -- sales, purchase_orders, adjustments, transfers, reservations
    reference_id UUID NOT NULL,
    unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    total_cost NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    valuation_method VARCHAR(15) NOT NULL DEFAULT 'FIFO',
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial monthly partition schemas for range tracking
CREATE TABLE IF NOT EXISTS public.inventory_movements_default 
    PARTITION OF public.inventory_movements DEFAULT;

CREATE INDEX IF NOT EXISTS idx_movements_lookup ON public.inventory_movements(organization_id, warehouse_id, product_id);

-- 5. Inventory Adjustments Table
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT NOT NULL,
    adjustment_number VARCHAR(50) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    remarks TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed', -- completed, draft
    adjustment_type VARCHAR(30) NOT NULL, -- adjustment_increase, adjustment_decrease
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_adj_num UNIQUE (organization_id, adjustment_number)
);
CREATE INDEX IF NOT EXISTS idx_adjustments_org ON public.inventory_adjustments(organization_id);

-- 6. Inventory Transfers Table
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    source_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT NOT NULL,
    target_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT NOT NULL,
    transfer_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, shipped, completed, cancelled
    shipped_at TIMESTAMPTZ NULL,
    received_at TIMESTAMPTZ NULL,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_trans_num UNIQUE (organization_id, transfer_number)
);
CREATE INDEX IF NOT EXISTS idx_transfers_org ON public.inventory_transfers(organization_id);

-- 7. Inventory Reservations
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT NOT NULL,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE NULL,
    quantity NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, released, expired
    reference_type VARCHAR(50) NOT NULL, -- draft_invoice, sales_order, hold
    reference_id UUID NOT NULL,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL
);
CREATE INDEX IF NOT EXISTS idx_reservations_lookup ON public.inventory_reservations(organization_id, status, expires_at);

-- 8. Daily Inventory Snapshots (Analytics/AI)
CREATE TABLE IF NOT EXISTS public.inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE RESTRICT NOT NULL,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE NULL,
    on_hand NUMERIC(12,4) NOT NULL,
    reserved NUMERIC(12,4) NOT NULL,
    available NUMERIC(12,4) NOT NULL,
    average_cost NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_wh_prod_var_date UNIQUE (organization_id, warehouse_id, product_id, variant_id, snapshot_date)
);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
CREATE POLICY tenant_isolation_batches ON public.inventory_batches FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_serials ON public.inventory_serial_numbers FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_wh_stock ON public.warehouse_stock FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_movements ON public.inventory_movements FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_adjustments ON public.inventory_adjustments FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_transfers ON public.inventory_transfers FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_reservations ON public.inventory_reservations FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_snapshots ON public.inventory_snapshots FOR ALL USING (public.check_user_org_access(organization_id));

-- Helper function to perform lock & default seeding of warehouse stock
CREATE OR REPLACE FUNCTION public.lock_warehouse_stock(
    p_org_id UUID,
    p_warehouse_id UUID,
    p_product_id UUID,
    p_variant_id UUID
) RETURNS SETOF public.warehouse_stock AS $$
BEGIN
    -- Try to insert if not exist to ensure row exists for locking
    INSERT INTO public.warehouse_stock (organization_id, warehouse_id, product_id, variant_id, on_hand, reserved, available)
    VALUES (p_org_id, p_warehouse_id, p_product_id, p_variant_id, 0.0000, 0.0000, 0.0000)
    ON CONFLICT (organization_id, warehouse_id, product_id, variant_id) DO NOTHING;

    RETURN QUERY
    SELECT *
    FROM public.warehouse_stock
    WHERE organization_id = p_org_id
      AND warehouse_id = p_warehouse_id
      AND product_id = p_product_id
      AND (variant_id = p_variant_id OR (variant_id IS NULL AND p_variant_id IS NULL))
    FOR UPDATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
