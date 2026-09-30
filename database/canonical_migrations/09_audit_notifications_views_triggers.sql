-- ==============================================================================
-- Canonical Migration 09: Audit, Notifications, Views, Indexes & Triggers
-- ==============================================================================

-- 1. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB DEFAULT '{}'::jsonb,
    new_values JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Backup History
CREATE TABLE IF NOT EXISTS public.backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    table_counts JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Materialized View for Instant Dashboard KPIs (< 50ms)
DROP MATERIALIZED VIEW IF EXISTS public.dashboard_kpis_view CASCADE;

CREATE MATERIALIZED VIEW public.dashboard_kpis_view AS
SELECT 
    user_id,
    COALESCE(SUM(total) FILTER (WHERE date::date = CURRENT_DATE), 0) AS today_revenue,
    COALESCE(SUM(total) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)), 0) AS month_revenue,
    (SELECT COUNT(*) FROM public.inventory i WHERE i.user_id = s.user_id AND i.stock > 0) AS active_stock_items,
    (SELECT COUNT(*) FROM public.customers c WHERE c.user_id = s.user_id) AS total_customers,
    COUNT(*) FILTER (WHERE payment_status = 'unpaid') AS pending_invoices_count,
    NOW() AS last_refreshed
FROM 
    public.sales s
GROUP BY 
    user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_kpis_user ON public.dashboard_kpis_view (user_id);

-- 5. Stored Procedures & Functions
CREATE OR REPLACE FUNCTION public.refresh_dashboard_kpis()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_kpis_view;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.decrement_stock(row_id UUID, quantity_to_subtract INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.inventory
  SET stock = stock - quantity_to_subtract,
      updated_at = NOW()
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_inventory_total_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.inventory
    SET stock = (
      SELECT COALESCE(SUM(stock), 0) FROM public.inventory_batches WHERE inventory_id = OLD.inventory_id
    )
    WHERE id = OLD.inventory_id;
    RETURN OLD;
  ELSE
    UPDATE public.inventory
    SET stock = (
      SELECT COALESCE(SUM(stock), 0) FROM public.inventory_batches WHERE inventory_id = NEW.inventory_id
    )
    WHERE id = NEW.inventory_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_inventory_stock ON public.inventory_batches;
CREATE TRIGGER trigger_update_inventory_stock
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_total_stock();

-- 6. Core Indexes for Multi-Tenant Query Speed
CREATE INDEX IF NOT EXISTS idx_users_org ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_stores_org ON public.stores(organization_id);
CREATE INDEX IF NOT EXISTS idx_stores_user ON public.stores(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_org_store ON public.inventory(organization_id, store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_stock ON public.inventory(user_id, stock);
CREATE INDEX IF NOT EXISTS idx_sales_org_date ON public.sales(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON public.sales(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON public.sales(store_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_gst_date_status ON public.sales(date, payment_status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_dues ON public.customers(user_id, outstanding_balance) WHERE outstanding_balance > 0;
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_store ON public.purchase_orders(organization_id, store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_store_date ON public.expenses(organization_id, store_id, date DESC);
