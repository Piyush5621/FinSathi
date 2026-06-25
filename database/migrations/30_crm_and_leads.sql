-- Migration 30: CRM and Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT CHECK (status IN ('New Lead', 'Contacted', 'Interested', 'Quotation Sent', 'Negotiation', 'Won', 'Lost')) DEFAULT 'New Lead' NOT NULL,
  expected_revenue NUMERIC(12, 2) DEFAULT 0.00,
  source TEXT,
  assigned_to UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('Call', 'Email', 'WhatsApp', 'Meeting')) NOT NULL,
  notes TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes DISABLE ROW LEVEL SECURITY;
