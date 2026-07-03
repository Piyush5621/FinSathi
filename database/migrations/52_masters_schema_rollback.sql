-- Revert Migration 52: Master Data Foundation Rollback

-- 1. Drop Policies
DROP POLICY IF EXISTS tenant_isolation_uom_groups ON public.uom_groups;
DROP POLICY IF EXISTS tenant_isolation_uoms ON public.units_of_measure;
DROP POLICY IF EXISTS tenant_isolation_companies ON public.companies;
DROP POLICY IF EXISTS tenant_isolation_brands ON public.brands;
DROP POLICY IF EXISTS tenant_isolation_categories ON public.categories;
DROP POLICY IF EXISTS tenant_isolation_cat_attr ON public.category_attribute_templates;
DROP POLICY IF EXISTS tenant_isolation_tax_cat ON public.tax_categories;
DROP POLICY IF EXISTS tenant_isolation_gst ON public.gst_rates;
DROP POLICY IF EXISTS tenant_isolation_hsn ON public.hsn_masters;
DROP POLICY IF EXISTS tenant_isolation_fy ON public.financial_years;
DROP POLICY IF EXISTS tenant_isolation_num ON public.numbering_series;
DROP POLICY IF EXISTS tenant_isolation_pref ON public.organization_preferences;
DROP POLICY IF EXISTS tenant_isolation_warehouses ON public.warehouses;

-- Re-apply original warehouses policy if possible
CREATE POLICY "Users can manage their own warehouses" ON public.warehouses FOR ALL USING (auth.uid() = user_id);

-- 2. Drop Function
DROP FUNCTION IF EXISTS public.check_user_org_access(UUID);

-- 3. Alter warehouses back to original
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS warehouse_type;
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS address;
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS contact_phone;
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS created_by;
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS updated_by;
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS layout_config;

-- 4. Drop Master Tables
DROP TABLE IF EXISTS public.organization_preferences CASCADE;
DROP TABLE IF EXISTS public.numbering_series CASCADE;
DROP TABLE IF EXISTS public.financial_years CASCADE;
DROP TABLE IF EXISTS public.hsn_masters CASCADE;
DROP TABLE IF EXISTS public.gst_rates CASCADE;
DROP TABLE IF EXISTS public.tax_categories CASCADE;
DROP TABLE IF EXISTS public.category_attribute_templates CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.units_of_measure CASCADE;
DROP TABLE IF EXISTS public.uom_groups CASCADE;
