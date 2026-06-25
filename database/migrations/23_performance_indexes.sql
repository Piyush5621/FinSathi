-- 23. PERFORMANCE INDEXES (Phase 4)
-- Objective: Optimize multi-tenant dashboard and report queries

-- 1. Composite Index for Sales/Invoices (Dashboard KPIs)
CREATE INDEX IF NOT EXISTS idx_sales_user_created ON public.sales (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_user_status ON public.sales (user_id, payment_status);

-- 2. Composite Index for Expenses (P&L Reports)
CREATE INDEX IF NOT EXISTS idx_expenses_user_created ON public.expenses (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_id, date);

-- 3. Composite Index for Attendance (Staff Management)
CREATE INDEX IF NOT EXISTS idx_attendance_user_created ON public.attendance (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance (user_id, date);

-- 4. Full-Text Search Optimization (using pg_trgm for better SKU/Name search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm ON public.inventory USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_sku_trgm ON public.inventory USING gin (sku gin_trgm_ops);

-- 5. Customer Search Optimization
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON public.customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (user_id, phone);
