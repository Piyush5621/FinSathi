-- AUTOMATED DUE REMINDERS SCHEMA (FIXED TYPES)

-- 1. Table to store reminder settings per shop owner
CREATE TABLE IF NOT EXISTS reminder_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    threshold DECIMAL DEFAULT 500,
    days_past_due INTEGER DEFAULT 7,
    template TEXT DEFAULT 'Hi {CustomerName}, your pending due of ₹{Amount} for bill {InvoiceNo} is past its due date. Please clear it soon. - {ShopName}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Tracking last reminder in sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS due_date DATE;

-- 3. Reminder Logs for auditing
-- NOTE: Using BIGINT for IDs matching original tables
CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
    phone TEXT,
    message TEXT,
    status TEXT, -- 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
