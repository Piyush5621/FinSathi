-- Migration 57: KaroBar Feature 4 - Product & Inventory Hardening
-- Unifies Product Catalog and Store-Aware Inventory Ledger

BEGIN;

-- 1. Real Variant Stock tracking
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;

-- 2. Enhance Inventory Batches with Variant & Store awareness
ALTER TABLE public.inventory_batches ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_batches ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

-- 3. Create Store-Specific Inventory Balances Table
CREATE TABLE IF NOT EXISTS public.store_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  stock numeric NOT NULL DEFAULT 0,
  low_stock_threshold integer DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique indexes ensuring 1 row per store+product (simple) or store+product+variant
CREATE UNIQUE INDEX IF NOT EXISTS uq_store_inv_prod ON public.store_inventory (store_id, product_id) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_store_inv_variant ON public.store_inventory (store_id, product_id, variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_inv_store ON public.store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inv_prod ON public.store_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inv_org ON public.store_inventory(organization_id);

-- 4. Create Immutable Stock Movement Ledger Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  batch_id integer REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
  quantity_change numeric NOT NULL,
  balance_after numeric NOT NULL,
  movement_type varchar(50) NOT NULL, -- 'RESTOCK', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'SALE', 'RETURN', 'VOID', 'OPENING_STOCK'
  reason text,
  reference_type varchar(50), -- 'sales', 'purchase_orders', 'adjustments', 'transfers'
  reference_id text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_mov_prod ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_org ON public.stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_store ON public.stock_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_created ON public.stock_movements(created_at DESC);

-- 5. Backfill missing organization_id on inventory rows
UPDATE public.inventory inv
SET organization_id = u.organization_id
FROM public.users u
WHERE inv.user_id = u.id AND inv.organization_id IS NULL AND u.organization_id IS NOT NULL;

-- 6. Synchronize price and selling_price across inventory rows
UPDATE public.inventory
SET selling_price = price
WHERE (selling_price IS NULL OR selling_price = 0) AND price > 0;

UPDATE public.inventory
SET price = selling_price
WHERE (price IS NULL OR price = 0) AND selling_price > 0;

-- 7. Backfill store_inventory from existing inventory rows with store_id
INSERT INTO public.store_inventory (organization_id, store_id, product_id, stock, low_stock_threshold)
SELECT 
  COALESCE(inv.organization_id, u.organization_id, inv.user_id),
  inv.store_id,
  inv.id,
  COALESCE(inv.stock, 0),
  COALESCE(inv.low_stock_threshold, 10)
FROM public.inventory inv
LEFT JOIN public.users u ON inv.user_id = u.id
WHERE inv.store_id IS NOT NULL
ON CONFLICT (store_id, product_id) WHERE variant_id IS NULL
DO UPDATE SET stock = EXCLUDED.stock;

-- 8. Backfill store_inventory for items with NULL store_id using the user's primary store
INSERT INTO public.store_inventory (organization_id, store_id, product_id, stock, low_stock_threshold)
SELECT 
  COALESCE(inv.organization_id, u.organization_id, inv.user_id),
  s.id,
  inv.id,
  COALESCE(inv.stock, 0),
  COALESCE(inv.low_stock_threshold, 10)
FROM public.inventory inv
LEFT JOIN public.users u ON inv.user_id = u.id
CROSS JOIN LATERAL (
  SELECT id FROM public.stores 
  WHERE user_id = inv.user_id AND is_active = true 
  ORDER BY created_at ASC LIMIT 1
) s
WHERE inv.store_id IS NULL
ON CONFLICT (store_id, product_id) WHERE variant_id IS NULL
DO NOTHING;

-- Also update inventory.store_id if it was NULL and store was found
UPDATE public.inventory inv
SET store_id = s.id
FROM (
  SELECT user_id, id FROM (
    SELECT user_id, id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
    FROM public.stores WHERE is_active = true
  ) st WHERE st.rn = 1
) s
WHERE inv.user_id = s.user_id AND inv.store_id IS NULL;

COMMIT;
