-- Add Cost Price and Wholesale Price to Inventory
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cost_price numeric(10, 2) DEFAULT 0.00;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS wholesale_price numeric(10, 2) DEFAULT 0.00;

-- Ensure Sales table has items JSONB column (to support existing logic)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB;

-- Add updated_at to inventory for tracking stock updates
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());
