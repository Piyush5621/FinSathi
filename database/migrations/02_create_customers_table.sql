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

-- Enable RLS
alter table public.customers enable row level security;
