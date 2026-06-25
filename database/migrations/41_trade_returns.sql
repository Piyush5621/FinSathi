-- Migration 41: Trade Returns & Damage Management (v2.1)

CREATE TABLE IF NOT EXISTS trade_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES trade_transactions(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  return_no TEXT,
  total_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Requested' CHECK (status IN (
    'Requested', 'Approved', 'Rejected', 'Picked Up', 'Completed'
  )),
  reason TEXT,
  notes TEXT,
  credit_note_issued BOOLEAN DEFAULT false,
  credit_note_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES trade_returns(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  reason TEXT CHECK (reason IN ('Damaged', 'Wrong Item', 'Expired', 'Quality Issue', 'Other'))
);
