-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE (Authentication & Profile)
create table public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  password text not null, -- BCrypt hash
  name text not null,
  business_name text,
  business_type text,
  phone text,
  city text,
  state text,
  address text,
  gstin text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CUSTOMERS TABLE (CRM)
create table public.customers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade, -- Multi-tenancy
  name text not null,
  email text,
  phone text,
  address text,
  gstin text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

-- 4. SALES/INVOICES TABLE
create table public.sales (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_no text not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  total numeric(12, 2) not null default 0.00,
  subtotal numeric(12, 2) default 0.00,
  tax_amount numeric(12, 2) default 0.00,
  discount numeric(10, 2) default 0.00,
  payment_status text check (payment_status in ('paid', 'unpaid', 'partial', 'overdue')) default 'unpaid',
  payment_method text, -- 'cash', 'upi', 'bank'
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.inventory enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

-- (Optional) Example Policies if using Supabase Auth directly
-- create policy "Users can view their own data" on public.users for select using (auth.uid() = id);
