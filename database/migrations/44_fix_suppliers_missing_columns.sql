-- Migration 44: Fix missing columns in suppliers table and add indexes

-- Safely add missing columns to public.suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS gstin TEXT,
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS performance_score NUMERIC(5, 2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add indexes for common search and filter fields
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_store_id ON public.suppliers(store_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON public.suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON public.suppliers(gstin);

-- Create trigger for updated_at if not exists (using standard supabase function handle_updated_at if available, otherwise just rely on application layer or explicit trigger)
-- Using a standard updated_at trigger
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_suppliers_updated_at') THEN
        CREATE TRIGGER set_suppliers_updated_at
        BEFORE UPDATE ON public.suppliers
        FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
EXCEPTION
    WHEN undefined_function THEN
        -- If update_modified_column doesn't exist, we skip the trigger.
        NULL;
END
$$;
