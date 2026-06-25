-- Migration 39: Preferred Suppliers & Supplier Product Links (v2.1)

-- Mark a connected supplier as preferred with priority ranking
CREATE TABLE IF NOT EXISTS preferred_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  auto_match_products BOOLEAN DEFAULT true,
  priority_order INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(buyer_id, supplier_id)
);

-- Permanent product relationship: supplier product name <-> buyer inventory item
-- Once created, future imports from this supplier auto-match these products
CREATE TABLE IF NOT EXISTS supplier_product_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  supplier_product_name TEXT NOT NULL,
  supplier_sku TEXT,
  buyer_inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  auto_import BOOLEAN DEFAULT true,
  confidence_score NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(supplier_id, buyer_id, supplier_product_name)
);
