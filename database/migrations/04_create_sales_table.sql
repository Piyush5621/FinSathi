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
  discount_percent numeric(10, 2) default 0.00,
  payment_status text check (payment_status in ('paid', 'unpaid', 'partial', 'overdue')) default 'unpaid',
  payment_method text, -- 'cash', 'upi', 'bank'
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.sales enable row level security;
