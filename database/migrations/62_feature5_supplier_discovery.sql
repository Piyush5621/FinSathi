-- ==============================================================================
-- KaroBar Feature 5: Purchases & Supplier Hub
-- Phase 7 Migration: Supplier Discovery Schema
-- ==============================================================================

-- 1. Add discovery and location fields to public.suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS is_discoverable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT '30 Days';

-- 2. Create supplier_products table for published supplier offerings
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  brand TEXT,
  unit TEXT DEFAULT 'pcs',
  price NUMERIC(12, 2),
  available_quantity NUMERIC(12, 2), -- NULL if unpublished/unknown
  min_order_quantity INTEGER DEFAULT 1,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_discoverable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_discoverable 
  ON public.suppliers (is_discoverable, is_archived);

CREATE INDEX IF NOT EXISTS idx_suppliers_city 
  ON public.suppliers (city) 
  WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_coords 
  ON public.suppliers (latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier 
  ON public.supplier_products (supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_products_discoverable 
  ON public.supplier_products (is_discoverable, is_available);

CREATE INDEX IF NOT EXISTS idx_supplier_products_name 
  ON public.supplier_products (product_name);

CREATE INDEX IF NOT EXISTS idx_supplier_products_sku 
  ON public.supplier_products (sku);

CREATE INDEX IF NOT EXISTS idx_supplier_products_category 
  ON public.supplier_products (category);

-- 4. Disable RLS for consistency with other supplier tables
ALTER TABLE public.supplier_products DISABLE ROW LEVEL SECURITY;
