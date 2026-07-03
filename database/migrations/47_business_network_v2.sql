-- Migration 47: Business Network v2 - Domain Driven Base
-- Run in Supabase Dashboard SQL Editor

-- 1. Business Network Profiles (Profile Domain)
-- Separates public network identity from the auth `users` table
CREATE TABLE IF NOT EXISTS public.business_network_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    verified_gst BOOLEAN DEFAULT false,
    profile_completeness_pct INTEGER DEFAULT 0 CHECK (profile_completeness_pct >= 0 AND profile_completeness_pct <= 100),
    about_text TEXT,
    year_established INTEGER,
    website_url TEXT,
    trade_volume_bracket TEXT, -- e.g., '10L-50L', '1Cr+'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id)
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_business_network_profiles_user ON public.business_network_profiles (user_id);

-- 2. Business Network Audit Logs (Observability / Security)
CREATE TABLE IF NOT EXISTS public.business_network_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    domain TEXT NOT NULL, -- e.g., 'Profile', 'Marketplace', 'Partner', 'Trade', 'Reputation'
    event_type TEXT NOT NULL, -- e.g., 'BusinessConnected', 'TrustScoreUpdated'
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for querying audit logs by user or domain
CREATE INDEX IF NOT EXISTS idx_bn_audit_user ON public.business_network_audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bn_audit_domain ON public.business_network_audit_logs (domain, created_at DESC);
