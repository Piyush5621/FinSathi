-- Migration 45: Purchase Orders Stabilization

-- 1. Update purchase_orders table
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders 
  ADD CONSTRAINT purchase_orders_status_check 
  CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Partially Received', 'Received', 'Completed', 'Cancelled'));

ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

-- 2. Update purchase_order_items table
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;

-- 3. Create Audit Logs table if it doesn't exist (for tracking POs and other system events)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL, -- e.g., 'PurchaseOrder', 'Supplier'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- e.g., 'Created', 'Status Changed', 'Cancelled'
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their store audit logs" 
  ON public.audit_logs FOR SELECT 
  USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert audit logs" 
  ON public.audit_logs FOR INSERT 
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
