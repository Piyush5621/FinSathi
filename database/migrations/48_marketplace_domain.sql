-- Migration 48: Marketplace Domain
-- Run in Supabase Dashboard SQL Editor

-- 1. Business Exchange Listings
-- Unified JSONB table for all marketplace listing types
CREATE TABLE IF NOT EXISTS public.business_exchange_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    listing_type TEXT NOT NULL CHECK (listing_type IN ('BUY', 'SELL', 'DEAD_STOCK', 'WAREHOUSE', 'LOGISTICS', 'TENDER', 'FRANCHISE', 'SUPPLIER_NEED')),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- Type specific fields: price, quantity, location, budget, etc.
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'FULFILLED', 'DRAFT', 'ARCHIVED')),
    view_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for search and performance
CREATE INDEX IF NOT EXISTS idx_exchange_listing_type ON public.business_exchange_listings (listing_type, status);
CREATE INDEX IF NOT EXISTS idx_exchange_user ON public.business_exchange_listings (user_id);
-- GIN Index for searching the JSONB metadata (e.g. location or tags)
CREATE INDEX IF NOT EXISTS idx_exchange_metadata ON public.business_exchange_listings USING GIN (metadata);
