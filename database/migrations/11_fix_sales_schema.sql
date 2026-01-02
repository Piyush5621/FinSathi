-- Ensure sales table has the correct columns for tax and discount
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tax_amount numeric(12, 2) DEFAULT 0.00;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_percent numeric(10, 2) DEFAULT 0.00;
