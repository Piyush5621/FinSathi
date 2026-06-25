-- WhatsApp Commerce & Government Schemes DB Migration

-- Add WhatsApp tracking columns to the sales (invoices) table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS whatsapp_message_id text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS whatsapp_status text check (whatsapp_status in ('sent', 'delivered', 'read', 'failed'));

-- Create the government schemes table
CREATE TABLE public.schemes (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text not null,
  max_amount numeric(15, 2),
  eligibility_criteria jsonb default '{}'::jsonb,
  state text default 'national',
  category text,
  deadline date,
  application_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for schemes (read-only for all authenticated users)
ALTER TABLE public.schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users on schemes"
  ON public.schemes
  FOR SELECT
  TO authenticated
  USING (true);

-- Create table to track user scheme matches/dismissals
CREATE TABLE public.user_scheme_matches (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  scheme_id uuid references public.schemes(id) on delete cascade not null,
  match_score numeric(5, 2) default 0.00,
  dismissed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, scheme_id)
);

-- Enable RLS for user_scheme_matches
ALTER TABLE public.user_scheme_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scheme matches"
  ON public.user_scheme_matches
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insert Seed Data for Schemes
INSERT INTO public.schemes (name, description, max_amount, eligibility_criteria, state, category, application_url)
VALUES 
  ('PM MUDRA Yojana', 'Micro credit scheme to provide loans to non-corporate, non-farm small/micro enterprises.', 1000000, '{"tags": ["micro", "small"]}', 'national', 'Loan', 'https://www.mudra.org.in'),
  ('CGTMSE', 'Credit Guarantee Fund Trust for Micro and Small Enterprises without collateral.', 50000000, '{"business_type": ["Service", "Manufacturing", "Retail"]}', 'national', 'Guarantee', 'https://www.cgtmse.in'),
  ('PMEGP', 'Prime Minister Employment Generation Programme for setting up new micro-enterprises.', 5000000, '{"tags": ["new", "manufacturing", "service"]}', 'national', 'Subsidy', 'https://www.kviconline.gov.in'),
  ('ZED Certification Scheme', 'Financial assistance to MSMEs in obtaining ZED certification.', 50000, '{"tags": ["manufacturing"]}', 'national', 'Certification', 'https://zed.msme.gov.in')
ON CONFLICT DO NOTHING;
