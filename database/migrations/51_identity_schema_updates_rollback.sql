-- database/migrations/51_identity_schema_updates_rollback.sql
-- Rollback script for Migration 51

-- Drop policies
DROP POLICY IF EXISTS "Tenant isolation for sessions" ON public.identity_sessions;
DROP POLICY IF EXISTS "Tenant isolation for refresh tokens" ON public.identity_refresh_tokens;
DROP POLICY IF EXISTS "Tenant isolation for login history" ON public.identity_login_history;

-- Drop tables
DROP TABLE IF EXISTS public.identity_login_history;
DROP TABLE IF EXISTS public.identity_refresh_tokens;
DROP TABLE IF EXISTS public.identity_sessions;

-- Drop staff columns & references
ALTER TABLE public.staff DROP COLUMN IF EXISTS email;
ALTER TABLE public.staff DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.staff DROP COLUMN IF EXISTS jwt_version;
ALTER TABLE public.staff DROP COLUMN IF EXISTS is_login_enabled;
ALTER TABLE public.staff DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE public.staff DROP COLUMN IF EXISTS failed_login_attempts;
ALTER TABLE public.staff DROP COLUMN IF EXISTS locked_until;
ALTER TABLE public.staff DROP COLUMN IF EXISTS organization_id;

-- Drop users columns & references
ALTER TABLE public.users DROP COLUMN IF EXISTS jwt_version;
ALTER TABLE public.users DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE public.users DROP COLUMN IF EXISTS last_password_changed_at;
ALTER TABLE public.users DROP COLUMN IF EXISTS failed_login_attempts;
ALTER TABLE public.users DROP COLUMN IF EXISTS locked_until;
ALTER TABLE public.users DROP COLUMN IF EXISTS organization_id;

-- Drop organizations table
DROP TABLE IF EXISTS public.organizations;
