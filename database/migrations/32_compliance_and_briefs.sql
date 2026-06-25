-- Migration 32: Compliance and Daily Briefs Caching
CREATE TABLE IF NOT EXISTS public.daily_business_briefs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  brief_date DATE DEFAULT (now() at time zone 'utc')::date NOT NULL,
  summary TEXT NOT NULL,
  action_items JSONB DEFAULT '[]'::jsonb NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, brief_date)
);

CREATE TABLE IF NOT EXISTS public.compliance_audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES public.staff(id) ON DELETE SET NULL, -- NULL if Owner
  module TEXT NOT NULL, -- 'Inventory', 'Billing', 'Staff', 'CRM'
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE
  target_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.daily_business_briefs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_logs DISABLE ROW LEVEL SECURITY;
