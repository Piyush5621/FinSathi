-- Migration 49: Reputation Domain
-- Run in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS public.business_reputation_metrics (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    completed_trades INTEGER DEFAULT 0,
    cancelled_trades INTEGER DEFAULT 0,
    disputes_raised INTEGER DEFAULT 0,
    disputes_lost INTEGER DEFAULT 0,
    late_payments INTEGER DEFAULT 0,
    avg_payment_delay_days NUMERIC DEFAULT 0.0,
    response_rate_pct INTEGER DEFAULT 0,
    gst_verified BOOLEAN DEFAULT false,
    profile_completeness_pct INTEGER DEFAULT 0,
    connection_acceptance_rate_pct INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    review_average NUMERIC DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.business_reputation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'TRADE_COMPLETED', 'LATE_PAYMENT', 'GST_VERIFIED'
    impact_score INTEGER NOT NULL, -- Positive or negative impact on calculated trust
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rep_history_user ON public.business_reputation_history(user_id);
