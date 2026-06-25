-- Admin Control Additions

-- 1. Add suspend/activate flag to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Create activity_logs for user action tracking
CREATE TABLE IF NOT EXISTS public.activity_logs (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
   action TEXT NOT NULL,
   method TEXT,
   endpoint TEXT,
   status_code INTEGER,
   details JSONB,
   created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect activity logs with RLS so only owners and admins can read
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity" ON public.activity_logs
   FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON public.activity_logs
   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Create admin_audit_logs for command center tracking
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   admin_id TEXT NOT NULL,
   action TEXT NOT NULL,
   target_resource TEXT,
   ip_address TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin tables should technically be completely locked from public
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
