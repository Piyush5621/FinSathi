-- 3. INVENTORY TABLE (Products/Stock)
create table public.inventory (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  sku text,
  name text not null,
  description text,
  company text, -- Brand/Manufacturer
  price numeric(10, 2) default 0.00,
  stock integer default 0,
  gst_percent numeric(5, 2) default 0.00, -- e.g., 18.00
  low_stock_threshold integer default 10,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.inventory enable row level security;
