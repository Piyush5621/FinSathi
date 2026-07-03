-- Revert Migration 53: Product Catalog Foundation Rollback

-- 1. Drop Policies
DROP POLICY IF EXISTS tenant_isolation_sku ON public.sku_registry;
DROP POLICY IF EXISTS tenant_isolation_variants ON public.product_variants;
DROP POLICY IF EXISTS tenant_isolation_barcodes ON public.product_barcodes;
DROP POLICY IF EXISTS tenant_isolation_media ON public.product_media;
DROP POLICY IF EXISTS tenant_isolation_specs ON public.product_specifications;
DROP POLICY IF EXISTS tenant_isolation_bundles ON public.product_bundles;
DROP POLICY IF EXISTS tenant_isolation_tags ON public.product_tags;
DROP POLICY IF EXISTS tenant_isolation_colls ON public.product_collections;
DROP POLICY IF EXISTS tenant_isolation_rels ON public.product_relationships;
DROP POLICY IF EXISTS tenant_isolation_inventory ON public.inventory;

-- Re-apply original legacy inventory policy
CREATE POLICY "Users can manage their own inventory" ON public.inventory FOR ALL USING (auth.uid() = user_id);

-- 2. Drop Tables
DROP TABLE IF EXISTS public.product_relationships CASCADE;
DROP TABLE IF EXISTS public.product_collection_mappings CASCADE;
DROP TABLE IF EXISTS public.product_collections CASCADE;
DROP TABLE IF EXISTS public.product_tag_mappings CASCADE;
DROP TABLE IF EXISTS public.product_tags CASCADE;
DROP TABLE IF EXISTS public.product_bundles CASCADE;
DROP TABLE IF EXISTS public.product_specifications CASCADE;
DROP TABLE IF EXISTS public.product_media CASCADE;
DROP TABLE IF EXISTS public.product_barcodes CASCADE;
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.sku_registry CASCADE;

-- 3. Drop Indexes
DROP INDEX IF EXISTS idx_inventory_org;
DROP INDEX IF EXISTS idx_inventory_sku;
DROP INDEX IF EXISTS idx_inventory_status;
DROP INDEX IF EXISTS idx_inventory_product_type;

-- 4. Revert inventory columns
ALTER TABLE public.inventory DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS short_name;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS product_type;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS tracking_type;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS valuation_method;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS status;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS lifecycle_state;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS brand_id;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS company_id;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS selling_uom_id;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS purchase_uom_id;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS gst_rate_id;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS hsn_code_id;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS mrp;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS selling_price;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS cost_price;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS dimensions;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS weight;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS created_by;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS updated_by;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS deleted_by;
