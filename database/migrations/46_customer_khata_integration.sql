-- Migration 46: Customer Khata Integration

-- Add outstanding_balance to customers for Khata (Udhaar) tracking
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2) DEFAULT 0.00;

-- Optional index for faster lookup on outstanding balance (e.g. "Customers with Dues")
CREATE INDEX IF NOT EXISTS idx_customers_outstanding_balance ON public.customers(user_id, outstanding_balance) WHERE outstanding_balance > 0;
