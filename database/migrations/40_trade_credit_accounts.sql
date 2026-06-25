-- Migration 40: Trade Credit Accounts (v2.1)

CREATE TABLE IF NOT EXISTS trade_credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credit_limit NUMERIC DEFAULT 0,
  outstanding_amount NUMERIC DEFAULT 0,
  utilized_amount NUMERIC DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Overdue', 'Suspended', 'Closed')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(supplier_id, buyer_id)
);
