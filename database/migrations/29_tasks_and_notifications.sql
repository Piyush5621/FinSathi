-- Migration 29: Tasks and Notifications
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')) DEFAULT 'Medium' NOT NULL,
  status TEXT CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Archived')) DEFAULT 'Pending' NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  source_type TEXT, -- Lead, Invoice, Inventory, Supplier, AI Recommendation
  source_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- LOW_STOCK, AI_RECOMMENDATION, CRM_REMINDER, PAYMENT_REMINDER, CASH_CRUNCH, AUDIT
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info' NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
