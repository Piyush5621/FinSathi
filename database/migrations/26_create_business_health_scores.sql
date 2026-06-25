-- Migration 26: Create business_health_scores table for historical trend logging
CREATE TABLE IF NOT EXISTS public.business_health_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  sales_score INTEGER NOT NULL CHECK (sales_score >= 0 AND sales_score <= 100),
  cash_flow_score INTEGER NOT NULL CHECK (cash_flow_score >= 0 AND cash_flow_score <= 100),
  inventory_score INTEGER NOT NULL CHECK (inventory_score >= 0 AND inventory_score <= 100),
  collection_score INTEGER NOT NULL CHECK (collection_score >= 0 AND collection_score <= 100),
  profile_score INTEGER NOT NULL CHECK (profile_score >= 0 AND profile_score <= 100),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, recorded_at::date)
);

ALTER TABLE public.business_health_scores DISABLE ROW LEVEL SECURITY;
