-- ==============================================================================
-- KaroBar (कारोबार) — Master Consolidated Database Schema (Final Authoritative)
-- Target Engine: PostgreSQL 15+ / Supabase
-- ==============================================================================
-- This single script provisions the complete, hardened KaroBar schema from scratch.
-- Includes:
--   1. Extensions & Primitives
--   2. Identity, Organizations & Multi-Store
--   3. Staff & RBAC (Role-Based Access Control)
--   4. Master Catalog & Products (UOM, Categories, Brands, Products, Variants)
--   5. Inventory Engine & Stock Tracking (Multi-Batch, Movements, Adjustments)
--   6. Customers & Khata (Credit Ledger, Repayments, Balances)
--   7. POS Billing & Invoicing (Sales, Line Items, Returns)
--   8. Purchases & Supplier Hub (Suppliers, POs, Receivings, Returns, Payments)
--   9. Expenses & Cashbook (Petty Cash Movements, Adjustments, Categorization)
--  10. Audit, Notifications & Backups
--  11. Materialized Views & High-Performance Indexes
--  12. Triggers & Stored Procedures (Atomic Stock Decrement, Auto-Stock Calculation)
--  13. Core Seed Data (Standard Roles, Permissions, Role-Permission Mappings)
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. EXTENSIONS & PRIMITIVES
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. DOMAIN: IDENTITY, ORGANIZATIONS & MULTI-STORE
-- ==============================================================================

-- 2.1 Organizations (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT DEFAULT 'retail',
    phone TEXT,
    city TEXT,
    state TEXT,
    address TEXT,
    gstin TEXT,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Users (Business Owners / Primary Accounts)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    business_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'owner',
    city TEXT,
    state TEXT,
    address TEXT,
    gstin TEXT,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    jwt_version INTEGER NOT NULL DEFAULT 1,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_password_changed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Stores (Multi-Store / Branch Locations)
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    phone TEXT,
    gstin TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 User Store Active Selection Preferences
CREATE TABLE IF NOT EXISTS public.user_store_preferences (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    active_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Admin Users (Superadmin Platform Ops)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    permissions JSONB DEFAULT '["*"]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. DOMAIN: STAFF & ROLE-BASED ACCESS CONTROL (RBAC)
-- ==============================================================================

-- 3.1 Roles (Owner, Manager, Cashier, Accountant, Warehouse Staff, Delivery Staff)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Granular Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    module TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 Role-Permission Mappings
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 3.4 Staff Members (Employees)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'Cashier',
    position TEXT,
    pin VARCHAR(10),
    is_login_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    jwt_version INTEGER NOT NULL DEFAULT 1,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    salary_type TEXT DEFAULT 'fixed',
    base_salary NUMERIC(10, 2) DEFAULT 0.00,
    qr_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 Store Staff Assignments
CREATE TABLE IF NOT EXISTS public.store_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, staff_id)
);

-- 3.6 Individual Staff Permission Overrides
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
    is_granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(staff_id, permission_id)
);

-- 3.7 Staff Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'late', 'on_leave')),
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    total_hours NUMERIC(5, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (staff_id, date)
);

-- ==============================================================================
-- 4. DOMAIN: MASTER CATALOG & PRODUCTS
-- ==============================================================================

-- 4.1 UOM Groups
CREATE TABLE IF NOT EXISTS public.uom_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4.2 Units of Measure
CREATE TABLE IF NOT EXISTS public.units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    uom_group_id UUID REFERENCES public.uom_groups(id) ON DELETE CASCADE NOT NULL,
    code VARCHAR(15) NOT NULL,
    name VARCHAR(50) NOT NULL,
    is_base BOOLEAN NOT NULL DEFAULT TRUE,
    base_unit_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL,
    conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_org_uom_code UNIQUE (organization_id, code)
);

-- 4.3 Companies / Manufacturers
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    gstin VARCHAR(15),
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_org_company_name UNIQUE (organization_id, name)
);

-- 4.4 Brands
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_org_brand_name UNIQUE (organization_id, name)
);

-- 4.5 Product Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description TEXT,
    hsn_sac_code VARCHAR(10),
    default_tax_rate NUMERIC(5,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_org_category_slug UNIQUE (organization_id, slug)
);

-- 4.6 Tax Categories & Standard GST Rates
CREATE TABLE IF NOT EXISTS public.tax_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gst_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate NUMERIC(5,2) UNIQUE NOT NULL,
    cgst NUMERIC(5,2) NOT NULL,
    sgst NUMERIC(5,2) NOT NULL,
    igst NUMERIC(5,2) NOT NULL,
    description VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hsn_masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hsn_code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.7 Products Master (Catalog Entity)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    uom_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL,
    hsn_code VARCHAR(10),
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    description TEXT,
    purchase_price NUMERIC(12,2) DEFAULT 0.00,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(12,2) DEFAULT 0.00,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    min_stock_level INTEGER DEFAULT 5,
    max_stock_level INTEGER DEFAULT 1000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    has_variants BOOLEAN NOT NULL DEFAULT FALSE,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4.8 Product Variants & Barcodes
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    variant_name VARCHAR(100) NOT NULL,
    purchase_price NUMERIC(12,2),
    selling_price NUMERIC(12,2) NOT NULL,
    mrp NUMERIC(12,2),
    attributes JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    barcode VARCHAR(100) NOT NULL,
    barcode_type VARCHAR(20) DEFAULT 'EAN-13',
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_barcode UNIQUE (barcode)
);

-- ==============================================================================
-- 5. DOMAIN: INVENTORY & STOCK TRACKING
-- ==============================================================================

-- 5.1 Primary Inventory Table (Fast POS Query Engine)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    company TEXT,
    unit TEXT DEFAULT 'pcs',
    price NUMERIC(10, 2) DEFAULT 0.00,
    cost_price NUMERIC(10, 2) DEFAULT 0.00,
    wholesale_price NUMERIC(10, 2) DEFAULT 0.00,
    stock INTEGER DEFAULT 0,
    gst_percent NUMERIC(5, 2) DEFAULT 0.00,
    hsn_code TEXT,
    barcode TEXT,
    low_stock_threshold INTEGER DEFAULT 10,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5.2 Store-Specific Inventory Level
CREATE TABLE IF NOT EXISTS public.store_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    reserved_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    min_stock NUMERIC(12, 3) DEFAULT 5.000,
    max_stock NUMERIC(12, 3) DEFAULT 1000.000,
    reorder_point NUMERIC(12, 3) DEFAULT 10.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.3 Inventory Batches (FIFO / Expiry Tracking)
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id SERIAL PRIMARY KEY,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    batch_name TEXT,
    batch_number TEXT,
    sku_variant TEXT,
    cost_price NUMERIC(10, 2) DEFAULT 0.00,
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(10, 2) DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    expiry_date DATE,
    supplier_id UUID,
    zero_stock_since TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5.4 Stock Movements (Audit Trail of all In/Out transactions)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    batch_id INTEGER REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('PURCHASE_RECEIPT', 'SALE_DISPATCH', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT_UP', 'ADJUSTMENT_DOWN', 'TRANSFER_IN', 'TRANSFER_OUT', 'INITIAL_STOCK')),
    quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(12, 2) DEFAULT 0.00,
    reference_type VARCHAR(30), -- 'SALE', 'PURCHASE_ORDER', 'ADJUSTMENT', 'TRANSFER'
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.5 Inventory Adjustments & Transfers
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    from_store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT NOT NULL,
    to_store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    transfer_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. DOMAIN: CUSTOMERS & KHATA (CREDIT LEDGER)
-- ==============================================================================

-- 6.1 Customers Registry
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    gstin TEXT,
    credit_limit NUMERIC(12, 2) DEFAULT 0.00,
    outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6.2 Customer Payments & Repayments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    sale_id UUID,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT DEFAULT 'cash', -- 'cash', 'upi', 'bank_transfer', 'cheque'
    reference TEXT,
    idempotency_key TEXT,
    date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6.3 Customer Khata Balance Ledger (Double-Entry Log)
CREATE TABLE IF NOT EXISTS public.customer_khata_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('SALE_CREDIT', 'PAYMENT', 'RETURN_CREDIT', 'ADJUSTMENT')),
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    reference_type VARCHAR(20), -- 'SALE', 'PAYMENT', 'RETURN'
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 7. DOMAIN: POS BILLING, SALES & INVOICING
-- ==============================================================================

-- 7.1 Sales (Invoices)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    invoice_number TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(15, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    change_amount NUMERIC(12, 2) DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'cancelled')),
    payment_method TEXT DEFAULT 'cash',
    -- GST Statutory Compliance Fields
    cgst_amount NUMERIC(15, 2) DEFAULT 0.00,
    sgst_amount NUMERIC(15, 2) DEFAULT 0.00,
    igst_amount NUMERIC(15, 2) DEFAULT 0.00,
    is_inter_state BOOLEAN DEFAULT FALSE,
    customer_gstin TEXT,
    place_of_supply TEXT,
    gst_rate NUMERIC(5, 2) DEFAULT 0.00,
    notes TEXT,
    idempotency_key TEXT,
    date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7.2 Sale Items (Line Items)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    batch_id INTEGER REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    hsn_code TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7.3 Sales Returns (Credit Notes)
CREATE TABLE IF NOT EXISTS public.sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    sale_id UUID REFERENCES public.sales(id) ON DELETE RESTRICT NOT NULL,
    return_number VARCHAR(50) NOT NULL,
    return_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    refund_method VARCHAR(20) DEFAULT 'CASH', -- 'CASH', 'CREDIT_NOTE', 'ORIGINAL_PAYMENT'
    return_reason TEXT,
    status VARCHAR(20) DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_return_id UUID REFERENCES public.sales_returns(id) ON DELETE CASCADE NOT NULL,
    sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    batch_id INTEGER REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    refund_amount NUMERIC(12, 2) NOT NULL,
    restock_inventory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. DOMAIN: PURCHASES, SUPPLIERS & PROCUREMENT
-- ==============================================================================

-- 8.1 Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    gstin TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    credit_limit NUMERIC(12, 2) DEFAULT 0.00,
    outstanding_balance NUMERIC(12, 2) DEFAULT 0.00,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8.2 Supplier Product Discovery Catalog
CREATE TABLE IF NOT EXISTS public.supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    min_order_quantity INTEGER DEFAULT 1,
    unit TEXT DEFAULT 'pcs',
    lead_time_days INTEGER DEFAULT 3,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.3 Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    po_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'ordered', 'partial_received', 'received', 'cancelled')),
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    expected_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8.4 Purchase Order Items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_price NUMERIC(10, 2) NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8.5 Goods Receiving Notes (GRN / Purchase Receivings)
CREATE TABLE IF NOT EXISTS public.purchase_receivings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    receiving_number VARCHAR(50) NOT NULL,
    received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    received_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.6 Purchase Returns (Debit Notes)
CREATE TABLE IF NOT EXISTS public.purchase_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    return_number VARCHAR(50) NOT NULL,
    return_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_return_id UUID REFERENCES public.purchase_returns(id) ON DELETE CASCADE NOT NULL,
    purchase_order_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.7 Supplier Payments
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT DEFAULT 'bank_transfer',
    reference TEXT,
    idempotency_key TEXT,
    payment_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8.8 Purchase Requests & RFQ Quotes
CREATE TABLE IF NOT EXISTS public.purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    request_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SENT', 'QUOTED', 'COMPLETED', 'CANCELLED')),
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_request_id UUID REFERENCES public.purchase_requests(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    target_price NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_request_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_request_id UUID REFERENCES public.purchase_requests(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    quotation_number VARCHAR(50),
    total_quote NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_request_response_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES public.purchase_request_responses(id) ON DELETE CASCADE NOT NULL,
    request_item_id UUID REFERENCES public.purchase_request_items(id) ON DELETE CASCADE NOT NULL,
    offered_price NUMERIC(12, 2) NOT NULL,
    available_quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. DOMAIN: EXPENSES & CASHBOOK
-- ==============================================================================

-- 9.1 Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.2 Operating Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    payment_method TEXT DEFAULT 'Cash',
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    is_system_generated BOOLEAN DEFAULT FALSE,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9.3 Cash Adjustments (Petty Cash Movements / Cash In-Out)
CREATE TABLE IF NOT EXISTS public.cash_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    notes TEXT,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 10. DOMAIN: AUDIT, NOTIFICATIONS & BACKUPS
-- ==============================================================================

-- 10.1 In-App Notifications
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

-- 10.2 Tenant Audit Logs
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

-- 10.3 Backup History
CREATE TABLE IF NOT EXISTS public.backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    table_counts JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 11. MATERIALIZED VIEWS & HIGH-PERFORMANCE INDEXES
-- ==============================================================================

-- 11.1 Materialized View for Instant Dashboard KPIs (< 50ms)
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

-- 11.2 Optimized Indexes for Multi-Tenant Isolation & Speed
CREATE INDEX IF NOT EXISTS idx_users_org ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_stores_org ON public.stores(organization_id);
CREATE INDEX IF NOT EXISTS idx_stores_user ON public.stores(user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_org_store ON public.inventory(organization_id, store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_stock ON public.inventory(user_id, stock);
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON public.inventory(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku);

CREATE INDEX IF NOT EXISTS idx_sales_org_date ON public.sales(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON public.sales(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON public.sales(store_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_gst_date_status ON public.sales(date, payment_status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_dues ON public.customers(user_id, outstanding_balance) WHERE outstanding_balance > 0;
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_store ON public.purchase_orders(organization_id, store_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_store_date ON public.expenses(organization_id, store_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_adjustments_org_store ON public.cash_adjustments(organization_id, store_id, created_at DESC);

-- ==============================================================================
-- 12. STORED PROCEDURES & TRIGGERS
-- ==============================================================================

-- 12.1 Refresh Dashboard Materialized View
CREATE OR REPLACE FUNCTION public.refresh_dashboard_kpis()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_kpis_view;
END;
$$ LANGUAGE plpgsql;

-- 12.2 Atomic POS Stock Decrement
CREATE OR REPLACE FUNCTION public.decrement_stock(row_id UUID, quantity_to_subtract INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.inventory
  SET stock = stock - quantity_to_subtract,
      updated_at = NOW()
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- 12.3 Sync Batch Stock to Inventory Total Stock
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

-- ==============================================================================
-- 13. SEED CORE SYSTEM DEFAULTS
-- ==============================================================================

-- 13.1 Standard RBAC Roles
INSERT INTO public.roles (name, description, is_system) VALUES
  ('Owner', 'Full business owner with access to all settings, financial data, and stores', TRUE),
  ('Manager', 'Store manager with operations access across inventory, purchases, and sales', TRUE),
  ('Cashier', 'POS operator with checkout and basic billing view permissions', TRUE),
  ('Accountant', 'Financial auditor with view access to reports, ledger, and GST', TRUE),
  ('Warehouse Staff', 'Stock handler managing inventory counts, receiving, and transfers', TRUE),
  ('Delivery Staff', 'Logistics handler managing customer order deliveries', TRUE)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 13.2 Granular Permissions
INSERT INTO public.permissions (key, label, module, description) VALUES
  ('view_catalog', 'View Product Catalog', 'Catalog', 'Allow viewing products and categories'),
  ('edit_catalog', 'Edit Product Catalog', 'Catalog', 'Allow creating and updating products'),
  ('delete_inventory', 'Delete Inventory Item', 'Catalog', 'Allow deleting items from catalog'),
  ('view_billing', 'View POS & Billing', 'Sales', 'Allow viewing sale receipts and invoices'),
  ('create_sales', 'Create POS Bills', 'Sales', 'Allow ringing up sales at terminal'),
  ('approve_po', 'Approve Purchase Orders', 'Procurement', 'Allow approving purchase orders to suppliers'),
  ('post_invoices', 'Post Purchase Invoices', 'Procurement', 'Allow posting receiving invoices to ledger'),
  ('run_counts', 'Run Stock Counts', 'Inventory', 'Allow physical stock reconciliation'),
  ('adjust_costs', 'Adjust Costs & Variances', 'Inventory', 'Allow modifying cost prices'),
  ('admin_setup', 'System Administration', 'Admin', 'Allow modifying organization and store settings')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

-- 13.3 Map Permissions to Default Roles
DO $$
DECLARE
    r_owner UUID;
    r_manager UUID;
    r_cashier UUID;
    r_accountant UUID;
    r_warehouse UUID;
    r_delivery UUID;
BEGIN
    SELECT id INTO r_owner FROM public.roles WHERE name = 'Owner';
    SELECT id INTO r_manager FROM public.roles WHERE name = 'Manager';
    SELECT id INTO r_cashier FROM public.roles WHERE name = 'Cashier';
    SELECT id INTO r_accountant FROM public.roles WHERE name = 'Accountant';
    SELECT id INTO r_warehouse FROM public.roles WHERE name = 'Warehouse Staff';
    SELECT id INTO r_delivery FROM public.roles WHERE name = 'Delivery Staff';

    -- Owner has all permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_owner, id FROM public.permissions
    ON CONFLICT DO NOTHING;

    -- Manager
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_manager, id FROM public.permissions WHERE key IN ('view_catalog', 'edit_catalog', 'approve_po', 'post_invoices', 'run_counts', 'view_billing', 'create_sales')
    ON CONFLICT DO NOTHING;

    -- Cashier
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_cashier, id FROM public.permissions WHERE key IN ('view_catalog', 'view_billing', 'create_sales')
    ON CONFLICT DO NOTHING;

    -- Accountant
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_accountant, id FROM public.permissions WHERE key IN ('view_catalog', 'post_invoices', 'view_billing')
    ON CONFLICT DO NOTHING;

    -- Warehouse Staff
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_warehouse, id FROM public.permissions WHERE key IN ('view_catalog', 'run_counts')
    ON CONFLICT DO NOTHING;

    -- Delivery Staff
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_delivery, id FROM public.permissions WHERE key IN ('view_catalog')
    ON CONFLICT DO NOTHING;
END $$;

-- 13.4 Standard GST Rates
INSERT INTO public.gst_rates (rate, cgst, sgst, igst, description) VALUES
  (0.00, 0.00, 0.00, 0.00, 'Nil / Exempted'),
  (5.00, 2.50, 2.50, 5.00, 'GST 5%'),
  (12.00, 6.00, 6.00, 12.00, 'GST 12%'),
  (18.00, 9.00, 9.00, 18.00, 'GST 18% (Standard)'),
  (28.00, 14.00, 14.00, 28.00, 'GST 28%')
ON CONFLICT (rate) DO NOTHING;

COMMIT;

-- Disable Row Level Security (RLS) for all tables to allow the Node.js backend pool/service-role unobstructed access
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;
