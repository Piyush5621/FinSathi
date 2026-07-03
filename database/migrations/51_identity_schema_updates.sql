-- Migration 51: Identity & Access Management Extensions (Revision A++)
-- Safe, idempotent script for PostgreSQL 16+

-- 1. Create Organizations Table (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT NULL,
    phone TEXT NULL,
    city TEXT NULL,
    state TEXT NULL,
    address TEXT NULL,
    gstin TEXT NULL,
    logo_url TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users Table Additions (Business Owners)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS jwt_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_password_changed_at TIMESTAMPTZ NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL;

-- 3. Staff Table Additions (Employees)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS email TEXT NULL UNIQUE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS password_hash TEXT NULL; -- BCrypt hash
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS jwt_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS is_login_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL;

-- 4. Backfill existing data
DO $$
DECLARE
    u RECORD;
    new_org_id UUID;
BEGIN
    -- Backfill users organization if not exists
    FOR u IN SELECT id, name, business_name, business_type, phone, city, state, address, gstin, logo_url FROM public.users WHERE organization_id IS NULL LOOP
        INSERT INTO public.organizations (name, business_type, phone, city, state, address, gstin, logo_url)
        VALUES (COALESCE(u.business_name, u.name || ' Business'), u.business_type, u.phone, u.city, u.state, u.address, u.gstin, u.logo_url)
        RETURNING id INTO new_org_id;
        
        UPDATE public.users SET organization_id = new_org_id WHERE id = u.id;
    END LOOP;
END $$;

-- Enforce NOT NULL for organization_id on users after backfill
ALTER TABLE public.users ALTER COLUMN organization_id SET NOT NULL;

-- Backfill staff organization_id from user_id (linked owner)
UPDATE public.staff s
SET organization_id = u.organization_id
FROM public.users u
WHERE s.user_id = u.id AND s.organization_id IS NULL;

-- 5. Create Sessions Table
CREATE TABLE IF NOT EXISTS public.identity_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NULL,
    device_name TEXT NULL,
    device_id TEXT NULL,
    platform TEXT NULL,
    browser TEXT NULL,
    operating_system TEXT NULL,
    app_version TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL
);

-- Index for session queries
CREATE INDEX IF NOT EXISTS idx_sessions_org ON public.identity_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.identity_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_staff ON public.identity_sessions(staff_id);

-- 6. Create Refresh Tokens Table (Referencing Session)
CREATE TABLE IF NOT EXISTS public.identity_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.identity_sessions(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NULL,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for refresh token queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON public.identity_refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session ON public.identity_refresh_tokens(session_id);

-- 7. Create Login & Security Audit Table
CREATE TABLE IF NOT EXISTS public.identity_login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL NULL,
    actor_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL NULL,
    target_id UUID NULL, -- ID of target resource affected (e.g. staff_id)
    event_type VARCHAR(50) NOT NULL, -- e.g. login_success, login_failed, logout, logout_all_devices, refresh_success, refresh_failed, password_changed, password_reset_requested, password_reset_completed, account_locked, account_unlocked, role_changed, permission_override
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    device TEXT NULL,
    metadata JSONB NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit logs
CREATE INDEX IF NOT EXISTS idx_login_history_org ON public.identity_login_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_login_history_time ON public.identity_login_history(timestamp DESC);

-- 8. Enable Row-Level Security (RLS)
ALTER TABLE public.identity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_login_history ENABLE ROW LEVEL SECURITY;

-- 9. Row-Level Security (RLS) Policies
CREATE POLICY "Tenant isolation for sessions" 
    ON public.identity_sessions FOR ALL 
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()) 
       OR organization_id = (SELECT organization_id FROM public.staff WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for refresh tokens" 
    ON public.identity_refresh_tokens FOR ALL 
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()) 
       OR organization_id = (SELECT organization_id FROM public.staff WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for login history" 
    ON public.identity_login_history FOR ALL 
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()) 
       OR organization_id = (SELECT organization_id FROM public.staff WHERE id = auth.uid()));
