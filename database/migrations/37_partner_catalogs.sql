-- Migration 37: Partner Catalogs

-- Supplier's published product catalog
CREATE TABLE IF NOT EXISTS partner_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Items within a supplier's catalog
CREATE TABLE IF NOT EXISTS partner_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID REFERENCES partner_catalogs(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC DEFAULT 0,
  mrp NUMERIC DEFAULT 0,
  moq INTEGER DEFAULT 1,
  gst_percent NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  category TEXT,
  brand TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);
