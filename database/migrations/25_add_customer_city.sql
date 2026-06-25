-- Migration 25: Add city column to public.customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT;
