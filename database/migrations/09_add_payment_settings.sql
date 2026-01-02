-- Add Payment Settings columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS upi_id text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_qr_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invoice_terms text; -- Optional useful field
