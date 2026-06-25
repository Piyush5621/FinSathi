-- Migration 36: Product Mapping & Import Wizard Tables

-- Permanent product name mappings between supplier names and buyer's inventory
CREATE TABLE IF NOT EXISTS product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
  supplier_product_name TEXT NOT NULL,
  supplier_sku TEXT,
  matched_inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  mapping_type TEXT DEFAULT 'manual' CHECK (mapping_type IN ('manual', 'ai_suggested', 'auto')),
  created_at TIMESTAMP DEFAULT now()
);

-- Tracks an import attempt (one per trade transaction reviewed by buyer)
CREATE TABLE IF NOT EXISTS purchase_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES trade_transactions(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Accepted', 'Completed', 'Rejected')),
  import_notes TEXT,
  items_created INTEGER DEFAULT 0,
  items_matched INTEGER DEFAULT 0,
  items_ignored INTEGER DEFAULT 0,
  imported_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Each import line item with buyer-specific overrides (sell price, MRP, etc.)
CREATE TABLE IF NOT EXISTS purchase_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES purchase_imports(id) ON DELETE CASCADE,
  trade_item_id UUID REFERENCES trade_transaction_items(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,  -- null = will be created new
  action TEXT DEFAULT 'create' CHECK (action IN ('create', 'match', 'ignore')),
  -- Buyer-configurable overrides
  selling_price NUMERIC,
  mrp NUMERIC,
  gst_percent NUMERIC,
  category TEXT,
  unit TEXT,
  min_stock INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  notes TEXT
);
