-- Migration 55: POS Hardening & Concurrency Integrity (Feature 2)
-- Safe, idempotent script for PostgreSQL 16+

-- 1. Index on Sales for high-performance invoice lookup & tenant isolation
CREATE INDEX IF NOT EXISTS idx_sales_user_invoice ON public.sales(user_id, invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON public.sales(user_id, date DESC);

-- 2. Index on Sales Notes for fast Idempotency tag matching
CREATE INDEX IF NOT EXISTS idx_sales_notes_trgm ON public.sales USING gin (notes gin_trgm_ops) 
    WHERE notes IS NOT NULL AND notes LIKE '%[IDEM:%';

-- 3. Payments index for customer payments lookup & idempotency reference
CREATE INDEX IF NOT EXISTS idx_payments_user_customer ON public.payments(user_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(user_id, reference) 
    WHERE reference IS NOT NULL;

-- 4. Customer Khata Outstanding Balance Index
CREATE INDEX IF NOT EXISTS idx_customers_user_outstanding ON public.customers(user_id, outstanding_balance) 
    WHERE outstanding_balance > 0;
