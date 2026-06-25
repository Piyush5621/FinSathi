-- 24. DASHBOARD MATERIALIZED VIEWS (Phase 5)
-- Objective: Instant dashboard KPI loading (reduces response time from ~800ms to < 50ms)

-- 1. Create the Materialized View for Dashboard KPIs
-- This aggregates data per user for fast retrieval
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_kpis_view AS
SELECT 
    user_id,
    -- Today's Revenue
    COALESCE(SUM(total) FILTER (WHERE date::date = CURRENT_DATE), 0) AS today_revenue,
    -- Monthly Revenue
    COALESCE(SUM(total) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)), 0) AS month_revenue,
    -- Active Items (In Stock)
    (SELECT COUNT(*) FROM public.inventory i WHERE i.user_id = s.user_id AND i.stock > 0) AS active_stock_items,
    -- Total Customers
    (SELECT COUNT(*) FROM public.customers c WHERE c.user_id = s.user_id) AS total_customers,
    -- Pending Invoices count
    COUNT(*) FILTER (WHERE payment_status = 'unpaid') AS pending_invoices_count,
    -- Last updated timestamp
    NOW() AS last_refreshed
FROM 
    public.sales s
GROUP BY 
    user_id;

-- 2. Create index on user_id for instant lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_kpis_user ON public.dashboard_kpis_view (user_id);

-- 3. Function to refresh the view
CREATE OR REPLACE FUNCTION refresh_dashboard_kpis()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_kpis_view;
END;
$$ LANGUAGE plpgsql;

-- 4. Set up periodic refresh (requires pg_cron in Supabase)
-- SELECT cron.schedule('*/5 * * * *', 'SELECT refresh_dashboard_kpis()');

-- NOTA: If pg_cron isn't enabled, the backend can trigger REFRESH MATERIALIZED VIEW on important write operations.
