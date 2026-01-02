-- 5. SALE ITEMS (Line Items for Invoices)
create table public.sale_items (
  id uuid default uuid_generate_v4() primary key,
  sale_id uuid references public.sales(id) on delete cascade,
  product_id uuid references public.inventory(id),
  product_name text not null, -- Snapshot name in case product is deleted/changed
  quantity integer not null default 1,
  price numeric(10, 2) not null, -- Unit price at time of sale
  tax_percent numeric(5, 2) default 0.00,
  total numeric(12, 2) not null -- (price * quantity) + tax
);

-- Enable RLS
alter table public.sale_items enable row level security;
