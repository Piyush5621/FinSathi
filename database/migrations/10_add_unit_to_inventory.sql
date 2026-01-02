-- Add unit column to inventory
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS units text DEFAULT 'pcs';
