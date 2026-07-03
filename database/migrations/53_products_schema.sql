-- Migration 53: Product Catalog Foundation (Sprint 3)
-- Safe, idempotent script for PostgreSQL 16+

-- 1. Alter legacy inventory table to support rich Product Master fields
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS short_name VARCHAR(100) NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS product_type VARCHAR(30) NOT NULL DEFAULT 'simple'; -- simple, variant, bundle, service, digital, composite
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS tracking_type VARCHAR(30) NOT NULL DEFAULT 'none'; -- none, serialized, batch_expiry
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(15) NOT NULL DEFAULT 'FIFO'; -- FIFO, WAC, LIFO, FEFO
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft'; -- draft, active, inactive, archived, deleted
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS lifecycle_state VARCHAR(30) NOT NULL DEFAULT 'active'; -- active, end_of_life, discontinued
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL; -- manufacturer mapping
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS selling_uom_id UUID REFERENCES public.units_of_measure(id) ON DELETE RESTRICT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS purchase_uom_id UUID REFERENCES public.units_of_measure(id) ON DELETE RESTRICT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS gst_rate_id UUID REFERENCES public.gst_rates(id) ON DELETE SET NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS hsn_code_id UUID REFERENCES public.hsn_masters(id) ON DELETE SET NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS dimensions JSONB NULL; -- { length, width, height }
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS weight NUMERIC(10,4) NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS updated_by UUID NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS deleted_by UUID NULL;

-- Safe backfill organization_id and map legacy values
UPDATE public.inventory i
SET organization_id = u.organization_id,
    selling_price = COALESCE(price, 0.00),
    mrp = COALESCE(price, 0.00)
FROM public.users u
WHERE i.user_id = u.id AND i.organization_id IS NULL;

-- Indexes for performance lookups on legacy inventory
CREATE INDEX IF NOT EXISTS idx_inventory_org ON public.inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(organization_id, sku);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_product_type ON public.inventory(organization_id, product_type);

-- 2. SKU Registry
CREATE TABLE IF NOT EXISTS public.sku_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_sku UNIQUE(organization_id, sku)
);
CREATE INDEX IF NOT EXISTS idx_sku_reg_lookup ON public.sku_registry(organization_id, sku);

-- 3. Product Variants Table
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    attributes JSONB NOT NULL, -- e.g. {"color": "Red", "size": "M"}
    selling_price NUMERIC(12,2) NULL, -- Overridden price, inherits parent if NULL
    purchase_price NUMERIC(12,2) NULL, -- Overridden price
    gst_rate_id UUID REFERENCES public.gst_rates(id) ON DELETE SET NULL,
    hsn_code_id UUID REFERENCES public.hsn_masters(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    dimensions JSONB NULL,
    weight NUMERIC(10,4) NULL,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_variant_sku UNIQUE(organization_id, sku)
);
CREATE INDEX IF NOT EXISTS idx_variants_org ON public.product_variants(organization_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);

-- 4. Product Barcodes (Multiple Barcodes support)
CREATE TABLE IF NOT EXISTS public.product_barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE NULL,
    barcode_type VARCHAR(30) NOT NULL DEFAULT 'EAN-13', -- EAN-13, UPC, Code128, QR, GS1
    barcode_value VARCHAR(100) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive
    generated_manually BOOLEAN NOT NULL DEFAULT FALSE,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_barcode_val UNIQUE(organization_id, barcode_value)
);
CREATE INDEX IF NOT EXISTS idx_barcodes_lookup ON public.product_barcodes(organization_id, barcode_value);

-- 5. Product Media (Images, PDFs, warranty docs metadata)
CREATE TABLE IF NOT EXISTS public.product_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    media_type VARCHAR(30) NOT NULL, -- image, pdf, warranty, manual, certificate, video
    url TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    -- Audit Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL
);
CREATE INDEX IF NOT EXISTS idx_product_media_org ON public.product_media(organization_id);

-- 6. Product Specifications (Dynamic attribute values)
CREATE TABLE IF NOT EXISTS public.product_specifications (
    product_id UUID PRIMARY KEY REFERENCES public.inventory(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    attributes JSONB NOT NULL, -- dynamic specification key-values
    -- Audit Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL
);

-- 7. Product Bundles (Definition mappings)
CREATE TABLE IF NOT EXISTS public.product_bundles (
    parent_product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    component_product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    quantity NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    PRIMARY KEY (parent_product_id, component_product_id)
);

-- 8. Tags & Collections Setup
CREATE TABLE IF NOT EXISTS public.product_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    CONSTRAINT uq_org_tag_name UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.product_tag_mappings (
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.product_tags(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.product_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    CONSTRAINT uq_org_coll_name UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.product_collection_mappings (
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    collection_id UUID REFERENCES public.product_collections(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (product_id, collection_id)
);

-- 9. Product Relationships (Cross-sell, compatibility metadata)
CREATE TABLE IF NOT EXISTS public.product_relationships (
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    related_product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    relationship_type VARCHAR(30) NOT NULL, -- accessory, alternative, upsell, cross_sell, replacement, compatible
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_id, related_product_id, relationship_type)
);

-- 10. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.sku_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collection_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_relationships ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS Policies linking org claim
CREATE POLICY tenant_isolation_sku ON public.sku_registry FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_variants ON public.product_variants FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_barcodes ON public.product_barcodes FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_media ON public.product_media FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_specs ON public.product_specifications FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_bundles ON public.product_bundles FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_tags ON public.product_tags FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_colls ON public.product_collections FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_rels ON public.product_relationships FOR ALL USING (public.check_user_org_access(organization_id));

-- Re-apply RLS policy for legacy inventory
DROP POLICY IF EXISTS "Users can manage their own inventory" ON public.inventory;
CREATE POLICY tenant_isolation_inventory ON public.inventory FOR ALL USING (public.check_user_org_access(organization_id));
