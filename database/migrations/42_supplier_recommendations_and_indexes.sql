-- Migration 42: Supplier Recommendations (Architecture Hook — Phase 4 AI)
-- Schema created now; AI logic will be added in Phase 4

CREATE TABLE IF NOT EXISTS supplier_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recommendation_type TEXT CHECK (recommendation_type IN (
    'reorder', 'pricing_alert', 'stock_alert', 'supplier_switch', 'credit_warning', 'general'
  )),
  recommendation TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  product_name TEXT,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Migration 43: Performance Indexes for Network Module
CREATE INDEX IF NOT EXISTS idx_trade_transactions_receiver ON trade_transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_sender ON trade_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_status ON trade_transactions(status);
CREATE INDEX IF NOT EXISTS idx_business_connections_requester ON business_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_business_connections_receiver ON business_connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_business_connections_status ON business_connections(status);
CREATE INDEX IF NOT EXISTS idx_supplier_product_links_lookup ON supplier_product_links(supplier_id, buyer_id);
CREATE INDEX IF NOT EXISTS idx_network_notifications_user ON network_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_purchase_imports_buyer ON purchase_imports(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trade_credit_accounts ON trade_credit_accounts(supplier_id, buyer_id);
CREATE INDEX IF NOT EXISTS idx_trade_returns_buyer ON trade_returns(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trade_returns_supplier ON trade_returns(supplier_id);
