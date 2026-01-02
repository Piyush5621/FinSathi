-- 0. Clean up
DROP TABLE IF EXISTS public.inventory_batches CASCADE;

-- 1. Create inventory_batches table
-- ADJUSTMENT: Detected that public.inventory.id is INTEGER, so we match that type here.
-- We also assume using SERIAL for the new table's ID is safer for consistency.
CREATE TABLE public.inventory_batches (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES public.inventory(id) ON DELETE CASCADE,
  batch_name text,
  sku_variant text, 
  cost_price numeric(10,2) DEFAULT 0.00,
  selling_price numeric(10,2) NOT NULL,
  wholesale_price numeric(10,2) DEFAULT 0.00,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  zero_stock_since timestamp with time zone
);

-- 2. Enable RLS
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

-- 3. Migrate existing inventory rows
INSERT INTO public.inventory_batches (inventory_id, batch_name, cost_price, selling_price, wholesale_price, stock)
SELECT 
  id,
  'Initial Stock',
  COALESCE(cost_price, 0),
  COALESCE(price, 0),
  COALESCE(wholesale_price, 0),
  COALESCE(stock, 0)
FROM public.inventory;

-- 4. Trigger Function
CREATE OR REPLACE FUNCTION public.update_inventory_total_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.inventory
    SET stock = (
      SELECT COALESCE(SUM(stock), 0) FROM public.inventory_batches WHERE inventory_id = OLD.inventory_id
    )
    WHERE id = OLD.inventory_id;
    RETURN OLD;
  ELSE
    UPDATE public.inventory
    SET stock = (
      SELECT COALESCE(SUM(stock), 0) FROM public.inventory_batches WHERE inventory_id = NEW.inventory_id
    )
    WHERE id = NEW.inventory_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Trigger
DROP TRIGGER IF EXISTS trigger_update_inventory_stock ON public.inventory_batches;

CREATE TRIGGER trigger_update_inventory_stock
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_total_stock();
