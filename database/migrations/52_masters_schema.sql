-- Migration 52: Master Data Foundation (Sprint 2)
-- Safe, idempotent script for PostgreSQL 16+

-- 1. Create UOM Groups Table
CREATE TABLE IF NOT EXISTS public.uom_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL
);

-- Index for RLS
CREATE INDEX IF NOT EXISTS idx_uom_groups_org ON public.uom_groups(organization_id);

-- 2. Create Units of Measure Table
CREATE TABLE IF NOT EXISTS public.units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    uom_group_id UUID REFERENCES public.uom_groups(id) ON DELETE CASCADE NOT NULL,
    code VARCHAR(15) NOT NULL,
    name VARCHAR(50) NOT NULL,
    is_base BOOLEAN NOT NULL DEFAULT TRUE,
    base_unit_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL NULL,
    conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1.0000,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_uom_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_uoms_org ON public.units_of_measure(organization_id);

-- 3. Create Companies (Manufacturers) Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    manufacturer_license VARCHAR(100) NULL,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_company_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_companies_org ON public.companies(organization_id);

-- 4. Create Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_brand_name UNIQUE (organization_id, company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_brands_org ON public.brands(organization_id);

-- 5. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    materialized_path TEXT NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_category_slug UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_org ON public.categories(organization_id);

-- 6. Create Category Attribute Templates Table
CREATE TABLE IF NOT EXISTS public.category_attribute_templates (
    category_id UUID PRIMARY KEY REFERENCES public.categories(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    attribute_schema JSONB NOT NULL, -- Describes form rendering & json validations
    -- Audit Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_cat_attr_templates_org ON public.category_attribute_templates(organization_id);

-- 7. Create Tax Categories Table
CREATE TABLE IF NOT EXISTS public.tax_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_tax_categories_org ON public.tax_categories(organization_id);

-- 8. Create GST Rates Table
CREATE TABLE IF NOT EXISTS public.gst_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    tax_category_id UUID REFERENCES public.tax_categories(id) ON DELETE CASCADE NOT NULL,
    rate NUMERIC(5,2) NOT NULL CHECK (rate >= 0.00),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_gst_rates_org ON public.gst_rates(organization_id);

-- 9. Create HSN Masters Table
CREATE TABLE IF NOT EXISTS public.hsn_masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    hsn_code VARCHAR(10) NOT NULL,
    gst_rate_id UUID REFERENCES public.gst_rates(id) ON DELETE SET NULL,
    description TEXT NULL,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_hsn_code UNIQUE (organization_id, hsn_code)
);

CREATE INDEX IF NOT EXISTS idx_hsn_masters_org ON public.hsn_masters(organization_id);

-- 10. Create Financial Years Table
CREATE TABLE IF NOT EXISTS public.financial_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(10) NOT NULL, -- e.g. FY26-27
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_financial_years_org ON public.financial_years(organization_id);

-- 11. Create Numbering Series Table
CREATE TABLE IF NOT EXISTS public.numbering_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- e.g., 'invoice', 'purchase_order', 'grn', 'sales_return', 'purchase_return'
    prefix VARCHAR(10) NOT NULL,
    suffix VARCHAR(10) NULL,
    next_number INTEGER NOT NULL DEFAULT 1,
    padding_zeroes INTEGER NOT NULL DEFAULT 5,
    fiscal_year VARCHAR(10) NOT NULL,
    reset_policy VARCHAR(20) NOT NULL DEFAULT 'never', -- never, yearly, monthly
    branch_id UUID NULL,
    warehouse_id UUID NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    -- Audit & Soft Delete Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    CONSTRAINT uq_org_doc_fy_prefix UNIQUE (organization_id, document_type, fiscal_year, prefix)
);

CREATE INDEX IF NOT EXISTS idx_numbering_series_org ON public.numbering_series(organization_id);

-- 12. Create Organization Preferences Table
CREATE TABLE IF NOT EXISTS public.organization_preferences (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
    currency_symbol VARCHAR(5) NOT NULL DEFAULT '₹',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    billing_preferences JSONB NULL,
    inventory_preferences JSONB NULL,
    -- Audit Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL,
    updated_by UUID NULL
);

-- 13. Update & Modify existing warehouses table
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS warehouse_type VARCHAR(50) NOT NULL DEFAULT 'general'; -- general, cold_storage, transit, etc.
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS address TEXT NULL;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS contact_phone TEXT NULL;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS updated_by UUID NULL;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS deleted_by UUID NULL;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS layout_config JSONB NULL; -- prepares layout validation zones/shelves/bins

-- Safe backfill for existing warehouses from user_id mapped to organizations
UPDATE public.warehouses w
SET organization_id = u.organization_id
FROM public.users u
WHERE w.user_id = u.id AND w.organization_id IS NULL;

-- 14. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.uom_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units_of_measure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_attribute_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsn_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.numbering_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_preferences ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on warehouses in case it was altered
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- 15. Create RLS Policies
-- Template RLS logic checking user organization_id claim
CREATE OR REPLACE FUNCTION public.check_user_org_access(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND organization_id = target_org_id
        UNION ALL
        SELECT 1 FROM public.staff WHERE id = auth.uid() AND organization_id = target_org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies mapping
CREATE POLICY tenant_isolation_uom_groups ON public.uom_groups FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_uoms ON public.units_of_measure FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_companies ON public.companies FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_brands ON public.brands FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_categories ON public.categories FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_cat_attr ON public.category_attribute_templates FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_tax_cat ON public.tax_categories FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_gst ON public.gst_rates FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_hsn ON public.hsn_masters FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_fy ON public.financial_years FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_num ON public.numbering_series FOR ALL USING (public.check_user_org_access(organization_id));
CREATE POLICY tenant_isolation_pref ON public.organization_preferences FOR ALL USING (public.check_user_org_access(organization_id));

-- Re-apply RLS policy for warehouses scoped by organization_id
DROP POLICY IF EXISTS "Users can manage their own warehouses" ON public.warehouses;
CREATE POLICY tenant_isolation_warehouses ON public.warehouses FOR ALL USING (public.check_user_org_access(organization_id));
