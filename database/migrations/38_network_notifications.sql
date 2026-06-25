-- Migration 38: Network Notifications

CREATE TABLE IF NOT EXISTS network_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'connection_request', 'connection_accepted', 'invoice_received',
    'invoice_viewed', 'import_accepted', 'import_rejected',
    'po_received', 'po_accepted', 'return_requested', 'return_approved',
    'credit_limit_warning', 'catalog_update', 'price_change'
  )),
  title TEXT NOT NULL,
  message TEXT,
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
