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

-- Enable RLS
alter table public.users enable row level security;
