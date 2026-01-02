-- 1. Disable RLS to ensure backend can read/write without complex policies for now
ALTER TABLE public.inventory_batches DISABLE ROW LEVEL SECURITY;

-- 2. Force re-sync of migration data (in case it was missed or hidden)
-- We insert 'Initial Stock' only if NO batches exist for a product.
INSERT INTO public.inventory_batches (inventory_id, batch_name, cost_price, selling_price, wholesale_price, stock)
SELECT 
  id,
  'Initial Stock',
  COALESCE(cost_price, 0),
  COALESCE(price, 0),
  COALESCE(wholesale_price, 0),
  COALESCE(stock, 0)
FROM public.inventory p
WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_batches b WHERE b.inventory_id = p.id
);

-- 3. Double check the trigger is active
DROP TRIGGER IF EXISTS trigger_update_inventory_stock ON public.inventory_batches;

CREATE TRIGGER trigger_update_inventory_stock
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_total_stock();
