-- =============================================================================
-- FinSathi — Consolidated Production Database Schema
-- Version: 2.0 (Cleaned Sequence)
-- Target Platform: PostgreSQL (Supabase Compatible)
-- =============================================================================

-- ── 1. EXTENSIONS & PROCEDURES ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 2. MASTER IDENTITY & CONFIGURATION TABLES ────────────────────────────────

-- USERS TABLE (Merchant Accounts)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- BCrypt hash
  name TEXT NOT NULL,
  business_name TEXT,
  business_type TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  address TEXT,
  gstin TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  upi_id TEXT,
  payment_qr_url TEXT,
  invoice_terms TEXT,
  is_active BOOLEAN DEFAULT true
);

-- USER SUBSCRIPTIONS (Plan Scopes & Limits)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
  billing_cycle       TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  status              TEXT DEFAULT 'active' CHECK (status IN ('active','trial','cancelled','expired','past_due')),
  trial_ends_at       TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end  TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  razorpay_sub_id     TEXT UNIQUE,
  razorpay_customer_id TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- USAGE TRACKING (Plan Guard Counters)
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id   UUID,
  metric        TEXT NOT NULL, -- 'invoices_per_month', 'products', 'customers', 'storage_mb'
  month_year    TEXT NOT NULL, -- 'YYYY-MM' format
  current_count INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id, metric, month_year)
);

-- SUBSCRIPTION PAYMENTS
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id),
  razorpay_payment_id TEXT UNIQUE,
  razorpay_sub_id   TEXT,
  amount_paise      INTEGER NOT NULL, -- Stored in Paisa (amount * 100)
  plan              TEXT NOT NULL,
  billing_cycle     TEXT NOT NULL,
  status            TEXT NOT NULL, -- 'captured', 'refunded', 'failed'
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. CRM & CORE SALES TRANSACTION MODULES ──────────────────────────────────

-- CUSTOMERS TABLE (CRM Ledger)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT, -- Added for CRM location tracking
  address TEXT,
  gstin TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INVENTORY TABLE (Products/Catalog)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  company TEXT,
  price NUMERIC(10, 2) DEFAULT 0.00,
  stock INTEGER DEFAULT 0,
  gst_percent NUMERIC(5, 2) DEFAULT 0.00,
  low_stock_threshold INTEGER DEFAULT 10,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  cost_price NUMERIC(10, 2) DEFAULT 0.00,
  wholesale_price NUMERIC(10, 2) DEFAULT 0.00,
  units TEXT DEFAULT 'pcs',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- INVENTORY BATCHES (Lot/Restocking details)
CREATE TABLE IF NOT EXISTS public.inventory_batches (
  id SERIAL PRIMARY KEY,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
  batch_name TEXT,
  sku_variant TEXT, 
  cost_price NUMERIC(10,2) DEFAULT 0.00,
  selling_price NUMERIC(10,2) NOT NULL,
  wholesale_price NUMERIC(10,2) DEFAULT 0.00,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  zero_stock_since TIMESTAMP WITH TIME ZONE
);

-- SALES TABLE (Billing Header)
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_no TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(12, 2) DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) DEFAULT 0.00,
  discount_percent NUMERIC(10, 2) DEFAULT 0.00,
  payment_status TEXT CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'overdue')) DEFAULT 'unpaid',
  payment_method TEXT, -- 'cash', 'upi', 'bank'
  notes TEXT,
  items JSONB,
  amount_paid NUMERIC(12, 2) DEFAULT 0.00,
  whatsapp_message_id TEXT,
  whatsapp_status TEXT CHECK (whatsapp_status IN ('sent', 'delivered', 'read', 'failed')),
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SALE ITEMS (Billing Details)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.inventory(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL,
  tax_percent NUMERIC(5, 2) DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL
);

-- PAYMENTS TABLE (CRM Payment Receipts Ledger)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  payment_mode TEXT,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── 4. LOGISTICS & OUTFLOW EXPENSE MODULES ───────────────────────────────────

-- SUPPLIERS TABLE (Vendors)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- EXPENSES TABLE (Cash Outflow logs)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- WAREHOUSES TABLE
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  capacity_used INTEGER DEFAULT 0,
  is_main_hub BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft', -- draft, ordered, shipped, received, cancelled
  total NUMERIC(12, 2) DEFAULT 0,
  expected_delivery TIMESTAMP WITH TIME ZONE,
  tracking_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PO ITEMS
CREATE TABLE IF NOT EXISTS public.po_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL
);

-- ── 5. STAFF & PAYROLL Hub ───────────────────────────────────────────────────

-- STAFF TABLE
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, 
  name TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  salary_type TEXT CHECK (salary_type IN ('fixed', 'hourly', 'daily')) DEFAULT 'fixed',
  base_salary NUMERIC(12, 2) DEFAULT 0.00,
  join_date DATE DEFAULT (now() AT TIME ZONE 'utc')::date,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  qr_token TEXT, -- Unique token for QR kiosk attendance matching
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE DEFAULT (now() AT TIME ZONE 'utc')::date,
  clock_in TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  clock_out TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('present', 'late', 'absent', 'half_day')) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (staff_id, date)
);

-- PAYROLL TABLE
CREATE TABLE IF NOT EXISTS public.payroll (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  base_pay NUMERIC(12, 2) NOT NULL,
  bonus NUMERIC(12, 2) DEFAULT 0.00,
  deductions NUMERIC(12, 2) DEFAULT 0.00,
  total_paid NUMERIC(12, 2) NOT NULL,
  payment_status TEXT CHECK (payment_status IN ('paid', 'pending')) DEFAULT 'pending',
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_type TEXT DEFAULT 'salary' CHECK (payment_type IN ('salary', 'advance', 'bonus', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── 6. SCHEMES, AUDITING & ALERTS ────────────────────────────────────────────

-- GOVERNMENT SCHEMES TABLE (Subsidy Discoveries)
CREATE TABLE IF NOT EXISTS public.schemes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  max_amount NUMERIC(15, 2),
  eligibility_criteria JSONB DEFAULT '{}'::jsonb,
  state TEXT DEFAULT 'national',
  category TEXT,
  deadline DATE,
  application_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USER SCHEME MATCHES
CREATE TABLE IF NOT EXISTS public.user_scheme_matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  scheme_id UUID REFERENCES public.schemes(id) ON DELETE CASCADE NOT NULL,
  match_score NUMERIC(5, 2) DEFAULT 0.00,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, scheme_id)
);

-- ANOMALY FLAGS
CREATE TABLE IF NOT EXISTS public.anomaly_flags (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sale_id     UUID REFERENCES sales(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('DUPLICATE_INVOICE', 'LARGE_DISCOUNT', 'OFF_HOURS_BILLING')),
  severity    TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger')),
  message     TEXT NOT NULL,
  dismissed   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, sale_id, type)
);

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
   action TEXT NOT NULL,
   method TEXT,
   endpoint TEXT,
   status_code INTEGER,
   details JSONB,
   created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   admin_id TEXT NOT NULL,
   action TEXT NOT NULL,
   target_resource TEXT,
   ip_address TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUTOMATED DUE REMINDERS SETTINGS
CREATE TABLE IF NOT EXISTS public.reminder_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    threshold DECIMAL DEFAULT 500,
    days_past_due INTEGER DEFAULT 7,
    template TEXT DEFAULT 'Hi {CustomerName}, your pending due of ₹{Amount} for bill {InvoiceNo} is past its due date. Please clear it soon. - {ShopName}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- AUTOMATED REMINDER LOGS
CREATE TABLE IF NOT EXISTS public.reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    phone TEXT,
    message TEXT,
    status TEXT, -- 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BUSINESS HEALTH SCORE HISTORY
CREATE TABLE IF NOT EXISTS public.business_health_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  sales_score INTEGER NOT NULL CHECK (sales_score >= 0 AND sales_score <= 100),
  cash_flow_score INTEGER NOT NULL CHECK (cash_flow_score >= 0 AND cash_flow_score <= 100),
  inventory_score INTEGER NOT NULL CHECK (inventory_score >= 0 AND inventory_score <= 100),
  collection_score INTEGER NOT NULL CHECK (collection_score >= 0 AND collection_score <= 100),
  profile_score INTEGER NOT NULL CHECK (profile_score >= 0 AND profile_score <= 100),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, recorded_at::date)
);

-- ── 7. TRIGGERS, VIEWS & RPC FUNCTIONS ───────────────────────────────────────

-- RPC function to atomically decrement stock
CREATE OR REPLACE FUNCTION decrement_stock(row_id UUID, quantity_to_subtract INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory
  SET stock = stock - quantity_to_subtract
  WHERE id = row_id;
END;
$$;

-- Trigger Function: Sync inventory stock based on batches aggregate
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

-- Attach trigger
DROP TRIGGER IF EXISTS trigger_update_inventory_stock ON public.inventory_batches;
CREATE TRIGGER trigger_update_inventory_stock
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_total_stock();

-- Materialized View for Dashboard KPIs
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_kpis_view AS
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

-- Materialized View Concurrent Refresh function
CREATE OR REPLACE FUNCTION refresh_dashboard_kpis()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_kpis_view;
END;
$$ LANGUAGE plpgsql;

-- ── 8. COMPOSITE PERFORMANCE INDEXES ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sales_user_created ON public.sales (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_user_status ON public.sales (user_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_user_created ON public.expenses (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_created ON public.attendance (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance (user_id, date);
CREATE INDEX IF NOT EXISTS idx_payroll_staff_type ON public.payroll (staff_id, payment_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_user_active ON public.anomaly_flags (user_id, dismissed, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_kpis_user ON public.dashboard_kpis_view (user_id);

-- GIN Trigram Search Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm ON public.inventory USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_sku_trgm ON public.inventory USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON public.customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (user_id, phone);

-- ── 9. ROW LEVEL SECURITY (RLS) STATUS ───────────────────────────────────────

-- Disable Row-Level Security explicitly across all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scheme_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_flags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_health_scores DISABLE ROW LEVEL SECURITY;
