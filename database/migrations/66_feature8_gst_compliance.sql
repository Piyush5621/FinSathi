-- ============================================================================
-- Migration 66: Feature 8 — GST Compliance Hardening
-- Adds canonical GST breakdown columns, customer state, and safe backfills.
-- ============================================================================

DO $$ 
BEGIN
    -- 1. Add GST breakdown columns to public.sales
    ALTER TABLE public.sales
        ADD COLUMN IF NOT EXISTS organization_id UUID,
        ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(15, 2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(15, 2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(15, 2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(15, 2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS is_inter_state BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS customer_gstin TEXT,
        ADD COLUMN IF NOT EXISTS place_of_supply TEXT,
        ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 0.00;

    -- 2. Add state to public.customers if missing
    ALTER TABLE public.customers
        ADD COLUMN IF NOT EXISTS state TEXT;

    -- 3. Add state to public.stores if missing
    ALTER TABLE public.stores
        ADD COLUMN IF NOT EXISTS state TEXT;

    -- 4. Backfill organization_id on sales from users
    UPDATE public.sales s
    SET organization_id = u.organization_id
    FROM public.users u
    WHERE s.user_id = u.id AND s.organization_id IS NULL AND u.organization_id IS NOT NULL;

    -- 5. Backfill customer_gstin on sales from customers
    UPDATE public.sales s
    SET customer_gstin = c.gstin
    FROM public.customers c
    WHERE s.customer_id = c.id AND s.customer_gstin IS NULL AND c.gstin IS NOT NULL;

    -- 6. Backfill taxable_amount and CGST/SGST/IGST on historical sales
    UPDATE public.sales
    SET 
        taxable_amount = CASE 
            WHEN subtotal > 0 THEN subtotal 
            ELSE GREATEST(0, total - COALESCE(tax_amount, 0)) 
        END,
        cgst_amount = CASE 
            WHEN is_inter_state = TRUE THEN 0.00
            ELSE ROUND(COALESCE(tax_amount, 0) / 2.0, 2)
        END,
        sgst_amount = CASE 
            WHEN is_inter_state = TRUE THEN 0.00
            ELSE COALESCE(tax_amount, 0) - ROUND(COALESCE(tax_amount, 0) / 2.0, 2)
        END,
        igst_amount = CASE 
            WHEN is_inter_state = TRUE THEN COALESCE(tax_amount, 0)
            ELSE 0.00
        END,
        gst_rate = CASE 
            WHEN COALESCE(tax_amount, 0) > 0 AND (CASE WHEN subtotal > 0 THEN subtotal ELSE GREATEST(0, total - COALESCE(tax_amount, 0)) END) > 0 
            THEN ROUND((COALESCE(tax_amount, 0) / (CASE WHEN subtotal > 0 THEN subtotal ELSE GREATEST(0, total - COALESCE(tax_amount, 0)) END)) * 100, 2)
            ELSE 0.00
        END
    WHERE taxable_amount IS NULL OR taxable_amount = 0;

    -- 7. Add performance indexes for GST Reports (GSTR-1, GSTR-3B)
    CREATE INDEX IF NOT EXISTS idx_sales_gst_date_status ON public.sales (date, payment_status);
    CREATE INDEX IF NOT EXISTS idx_sales_gst_org_date ON public.sales (organization_id, date);
    CREATE INDEX IF NOT EXISTS idx_sales_gst_store_date ON public.sales (store_id, date);

END $$;
