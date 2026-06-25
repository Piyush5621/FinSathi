-- Migration 44: Enterprise Indexes and Materialized Views

-- 1. Enable pg_trgm extension for fast fuzzy text searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Inventory Search Indexes
-- Normal B-Tree for exact matches
CREATE INDEX IF NOT EXISTS idx_inventory_store_id ON public.inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory(created_at DESC);

-- Trigram indexes for fast ILIKE '%search%' queries
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm ON public.inventory USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_sku_trgm ON public.inventory USING gin (sku gin_trgm_ops);

-- 3. Customer Search Indexes
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON public.customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm ON public.customers USING gin (phone gin_trgm_ops);

-- 4. Sales and Expenses Indexes for Pagination and Sorting
CREATE INDEX IF NOT EXISTS idx_sales_store_id_created_at ON public.sales(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_store_id_created_at ON public.expenses(store_id, created_at DESC);

-- 5. Materialized View for Dashboard Analytics
-- This view aggregates daily sales, revenue, and expenses by store to prevent 
-- scanning millions of rows on every dashboard load.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_analytics AS
SELECT 
    s.store_id,
    DATE(s.created_at) as agg_date,
    COUNT(s.id) as total_invoices,
    SUM(s.total) as daily_revenue,
    COALESCE(SUM(s.amount_paid), 0) as daily_collected,
    COALESCE(SUM(s.total) - SUM(s.amount_paid), 0) as daily_receivables
FROM public.sales s
GROUP BY s.store_id, DATE(s.created_at);

-- Create a unique index to allow refreshing concurrently
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_analytics_unique 
ON mv_dashboard_analytics(store_id, agg_date);

-- Note: The backend chron job should call `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_analytics;` daily or hourly.
