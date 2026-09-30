-- Migration 56: Sales & Invoice History Hardening
-- Adds structured returns, cancellation metadata, allows 'cancelled' status, and adds query performance indexes.

-- 1. Add structured returns column
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS returns jsonb DEFAULT '[]'::jsonb;

-- 2. Add cancellation metadata column and updated_at
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cancellation jsonb DEFAULT NULL;

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 3. Update payment_status check constraint to support 'cancelled' and 'returned'
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_status_check;
ALTER TABLE public.sales 
ADD CONSTRAINT sales_payment_status_check 
CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'overdue', 'cancelled', 'returned'));

-- 4. Add performance indexes for pagination and filtering
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON public.sales(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_customer ON public.sales(user_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_status ON public.sales(user_id, payment_status);
