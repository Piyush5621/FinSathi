-- Migration 35: Business Network Core Tables
-- Run in Supabase Dashboard SQL Editor

-- Business connections between two FinSathi merchants
CREATE TABLE IF NOT EXISTS business_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'removed')),
  connection_type TEXT DEFAULT 'Supplier' CHECK (connection_type IN ('Supplier', 'Customer', 'Distributor', 'Retailer', 'Partner')),
  trade_volume NUMERIC DEFAULT 0,
  connected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);

-- Cross-business trade transactions (core data exchange layer)
CREATE TABLE IF NOT EXISTS trade_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES business_connections(id) ON DELETE SET NULL,
  invoice_no TEXT,
  invoice_date DATE DEFAULT CURRENT_DATE,
  total_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Viewed', 'Accepted', 'Rejected', 'Imported', 'Modified')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Line items of a trade transaction
CREATE TABLE IF NOT EXISTS trade_transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES trade_transactions(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity NUMERIC DEFAULT 0,
  purchase_price NUMERIC DEFAULT 0,
  gst_percent NUMERIC DEFAULT 0,
  category TEXT,
  batch_name TEXT,
  expiry_date DATE,
  unit TEXT DEFAULT 'pcs',
  total NUMERIC DEFAULT 0
);
