-- Migration to add Advance Tracking to Staff Hub
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'salary' CHECK (payment_type IN ('salary', 'advance', 'bonus', 'other'));
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS notes text;

-- Create an Index for faster 'Hisab' calculations
CREATE INDEX IF NOT EXISTS idx_payroll_staff_type ON public.payroll(staff_id, payment_type);
