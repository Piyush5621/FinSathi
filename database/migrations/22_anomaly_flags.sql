-- ── Migration 22: Phase 3 AI & Predictive Intelligence ──────────────────────
-- Purpose: Creates the anomaly_flags table for the AnomalyService rules engine.
-- Run this in your Supabase SQL editor.
--
-- NOTE: sales.id is BIGINT (nextval sequence), not UUID.
--       All FK columns referencing sales.id must be BIGINT.

-- Anomaly flags table
CREATE TABLE IF NOT EXISTS anomaly_flags (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sale_id     UUID REFERENCES sales(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('DUPLICATE_INVOICE', 'LARGE_DISCOUNT', 'OFF_HOURS_BILLING')),
  severity    TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger')),
  message     TEXT NOT NULL,
  dismissed   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, sale_id, type)
);

-- Index for fast per-user, un-dismissed queries
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_user_active 
  ON anomaly_flags(user_id, dismissed, created_at DESC);

-- Enable RLS
ALTER TABLE anomaly_flags ENABLE ROW LEVEL SECURITY;

-- Users can only see their own flags
CREATE POLICY "Users can view own anomaly flags"
  ON anomaly_flags FOR SELECT
  USING (user_id = auth.uid());

-- Users can dismiss their own flags
CREATE POLICY "Users can update own anomaly flags"
  ON anomaly_flags FOR UPDATE
  USING (user_id = auth.uid());

-- Service inserts (backend uses service key or anon with user_id set via ownership middleware)
CREATE POLICY "Service can insert anomaly flags"
  ON anomaly_flags FOR INSERT
  WITH CHECK (true);

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- The AnomalyService runs client-side detection and upserts flags here.
-- The UNIQUE constraint on (user_id, sale_id, type) prevents duplicate flags.
-- Dismissed flags are filtered out on GET /api/intelligence/anomalies.
-- Run AnomalyService.runDetection(userId) or POST /api/intelligence/anomalies/scan
-- to trigger a fresh detection pass.
