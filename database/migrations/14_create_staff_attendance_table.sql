-- Enable UUID extension if not exists
create extension if not exists "uuid-ossp";

-- 1. STAFF TABLE
create table if not exists public.staff (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade, 
  name text not null,
  phone text,
  position text,
  salary_type text check (salary_type in ('fixed', 'hourly', 'daily')) default 'fixed',
  base_salary numeric(12, 2) default 0.00,
  join_date date default (now() at time zone 'utc')::date,
  status text check (status in ('active', 'inactive')) default 'active',
  qr_token text, -- Unique token for local identifying
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. ATTENDANCE TABLE
create table if not exists public.attendance (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  date date default (now() at time zone 'utc')::date,
  clock_in timestamp with time zone default timezone('utc'::text, now()),
  clock_out timestamp with time zone,
  status text check (status in ('present', 'late', 'absent', 'half_day')) default 'present',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (staff_id, date)
);

-- 3. PAYROLL TABLE (Optional but helpful for 'Salary Generation')
create table if not exists public.payroll (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  month integer not null,
  year integer not null,
  base_pay numeric(12, 2) not null,
  bonus numeric(12, 2) default 0.00,
  deductions numeric(12, 2) default 0.00,
  total_paid numeric(12, 2) not null,
  payment_status text check (payment_status in ('paid', 'pending')) default 'pending',
  payment_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ENABLE RLS
alter table public.staff enable row level security;
alter table public.attendance enable row level security;
alter table public.payroll enable row level security;
