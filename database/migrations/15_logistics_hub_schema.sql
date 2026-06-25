-- Logistics & Supply Chain Expansion
CREATE TABLE public.warehouses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  capacity_used INTEGER DEFAULT 0,
  is_main_hub BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.purchase_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft', -- draft, ordered, shipped, received, cancelled
  total NUMERIC(12, 2) DEFAULT 0,
  expected_delivery TIMESTAMP WITH TIME ZONE,
  tracking_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.po_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL
);

-- RLS Policies
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own warehouses" ON public.warehouses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own purchase orders" ON public.purchase_orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own po items" ON public.po_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = po_id AND user_id = auth.uid())
);
