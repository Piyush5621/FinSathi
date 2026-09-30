import { getPostgresPool } from "../../config/postgres.js";

export async function seedSupplierProducts() {
  const pool = getPostgresPool();
  console.log("Seeding authentic supplier product catalogs...");

  const { rows: suppliers } = await pool.query("SELECT id, name FROM public.suppliers");

  const catalogMap = {
    "Hindustan Consumer Supply Ltd": [
      { product_name: "Surf Excel Quick Wash (1kg)", sku: "HCL-DET-01", category: "FMCG", brand: "Surf Excel", unit: "kg", price: 135, available_quantity: 500, min_order_quantity: 5 },
      { product_name: "Lifebuoy Total Soap (125g)", sku: "HCL-SOAP-02", category: "FMCG", brand: "Lifebuoy", unit: "pcs", price: 32, available_quantity: 1200, min_order_quantity: 10 },
      { product_name: "Sunsilk Black Shine Shampoo (180ml)", sku: "HCL-SHAM-03", category: "Personal Care", brand: "Sunsilk", unit: "bottles", price: 110, available_quantity: 450, min_order_quantity: 6 },
      { product_name: "Kissan Fresh Tomato Ketchup (500g)", sku: "HCL-KET-04", category: "Food", brand: "Kissan", unit: "bottles", price: 95, available_quantity: 300, min_order_quantity: 6 },
      { product_name: "Brooke Bond Red Label Tea (500g)", sku: "HCL-TEA-05", category: "Beverages", brand: "Brooke Bond", unit: "box", price: 215, available_quantity: 600, min_order_quantity: 5 }
    ],
    "Amul Fresh Dairy Distributors": [
      { product_name: "Amul Taaza Toned Milk (1L Pouch)", sku: "AMUL-MLK-01", category: "Dairy", brand: "Amul", unit: "pouches", price: 54, available_quantity: 800, min_order_quantity: 10 },
      { product_name: "Amul Butter Pasteurized (500g)", sku: "AMUL-BUT-02", category: "Dairy", brand: "Amul", unit: "box", price: 250, available_quantity: 400, min_order_quantity: 5 },
      { product_name: "Amul Masti Dahi (400g Cup)", sku: "AMUL-DAHI-03", category: "Dairy", brand: "Amul", unit: "cups", price: 35, available_quantity: 350, min_order_quantity: 10 },
      { product_name: "Amul Processed Cheese Block (200g)", sku: "AMUL-CHS-04", category: "Dairy", brand: "Amul", unit: "box", price: 120, available_quantity: 500, min_order_quantity: 5 },
      { product_name: "Amul Malai Paneer (200g)", sku: "AMUL-PAN-05", category: "Dairy", brand: "Amul", unit: "pack", price: 85, available_quantity: 600, min_order_quantity: 6 }
    ],
    "Bharat Beverage & Snack Logistics": [
      { product_name: "Coca-Cola Original (750ml Bottle)", sku: "BBS-COKE-01", category: "Beverages", brand: "Coca-Cola", unit: "bottles", price: 35, available_quantity: 900, min_order_quantity: 12 },
      { product_name: "Thums Up Charged (2L Bottle)", sku: "BBS-THUMS-02", category: "Beverages", brand: "Thums Up", unit: "bottles", price: 85, available_quantity: 750, min_order_quantity: 6 },
      { product_name: "Lay's India's Magic Masala (50g)", sku: "BBS-LAYS-03", category: "Snacks", brand: "Lay's", unit: "packets", price: 18, available_quantity: 1500, min_order_quantity: 24 },
      { product_name: "Kurkure Masala Munch (45g)", sku: "BBS-KURK-04", category: "Snacks", brand: "Kurkure", unit: "packets", price: 18, available_quantity: 1800, min_order_quantity: 24 },
      { product_name: "Real Mixed Fruit Juice (1L Tetra)", sku: "BBS-REAL-05", category: "Beverages", brand: "Real", unit: "tetra", price: 105, available_quantity: 400, min_order_quantity: 6 }
    ],
    "Kisan Agro Grains & Pulses": [
      { product_name: "MP Sharbati Whole Wheat (30kg Sack)", sku: "KISAN-WHT-01", category: "Grains", brand: "Kisan Agro", unit: "sack", price: 1050, available_quantity: 200, min_order_quantity: 1 },
      { product_name: "Tata Sampann Unpolished Chana Dal (1kg)", sku: "KISAN-CHANA-02", category: "Pulses", brand: "Tata Sampann", unit: "kg", price: 88, available_quantity: 500, min_order_quantity: 10 },
      { product_name: "Farm Fresh Moong Dal Dhuli (1kg)", sku: "KISAN-MOONG-03", category: "Pulses", brand: "Kisan Agro", unit: "kg", price: 110, available_quantity: 450, min_order_quantity: 10 },
      { product_name: "Premium Kabuli Chana (1kg)", sku: "KISAN-KAB-04", category: "Pulses", brand: "Kisan Agro", unit: "kg", price: 135, available_quantity: 300, min_order_quantity: 5 },
      { product_name: "Yellow Mustard Seeds (500g)", sku: "KISAN-MUST-05", category: "Spices", brand: "Kisan Agro", unit: "packets", price: 65, available_quantity: 600, min_order_quantity: 10 }
    ],
    "EcoPack Containers & Boxes": [
      { product_name: "Heavy Duty 3-Ply Carton Boxes (M)", sku: "ECO-BOX-01", category: "Packaging", brand: "EcoPack", unit: "pcs", price: 25, available_quantity: 2000, min_order_quantity: 25 },
      { product_name: "100% Biodegradable Carry Bags (100pk)", sku: "ECO-BAG-02", category: "Packaging", brand: "EcoPack", unit: "packs", price: 180, available_quantity: 1000, min_order_quantity: 5 },
      { product_name: "Premium Brown Kraft Paper Bags (50pk)", sku: "ECO-KRAFT-03", category: "Packaging", brand: "EcoPack", unit: "packs", price: 220, available_quantity: 800, min_order_quantity: 4 },
      { product_name: "Industrial Packing Tape (2-Inch Roll)", sku: "ECO-TAPE-04", category: "Packaging", brand: "EcoPack", unit: "rolls", price: 45, available_quantity: 1200, min_order_quantity: 6 }
    ],
    "MahaAgro Commodity Mills": [
      { product_name: "Premium Kolam Rice (50kg Jute Sack)", sku: "MAHA-RICE-01", category: "Grains", brand: "MahaAgro", unit: "sack", price: 2450, available_quantity: 150, min_order_quantity: 1 },
      { product_name: "MP Sharbati Wheat (50kg Sack)", sku: "MAHA-WHT-02", category: "Grains", brand: "MahaAgro", unit: "sack", price: 1850, available_quantity: 200, min_order_quantity: 1 },
      { product_name: "Refined Soyabean Oil (15L Tin)", sku: "MAHA-SOYA-03", category: "Edible Oils", brand: "MahaAgro", unit: "tins", price: 1750, available_quantity: 300, min_order_quantity: 2 }
    ],
    "Western India Oil Extractors": [
      { product_name: "Kachi Ghani Mustard Oil (15L Tin)", sku: "WIO-MUST-01", category: "Edible Oils", brand: "Western Oil", unit: "tins", price: 1850, available_quantity: 250, min_order_quantity: 2 },
      { product_name: "Pure Refined Sunflower Oil (15L Tin)", sku: "WIO-SUN-02", category: "Edible Oils", brand: "Western Oil", unit: "tins", price: 1800, available_quantity: 300, min_order_quantity: 2 },
      { product_name: "Refined Cottonseed Oil (15L Tin)", sku: "WIO-COT-03", category: "Edible Oils", brand: "Western Oil", unit: "tins", price: 1650, available_quantity: 350, min_order_quantity: 2 }
    ],
    "Tirupur Cotton Mills Pvt Ltd": [
      { product_name: "100% Combed Cotton Crew Neck T-Shirt (M)", sku: "TCM-TSHIRT-01", category: "Apparel", brand: "Tirupur Cotton", unit: "pcs", price: 195, available_quantity: 1000, min_order_quantity: 10 },
      { product_name: "Cotton Ribbed Tank Top (Pack of 3)", sku: "TCM-TANK-02", category: "Apparel", brand: "Tirupur Cotton", unit: "packs", price: 320, available_quantity: 600, min_order_quantity: 5 },
      { product_name: "Bio-Washed Cotton Track Pants", sku: "TCM-TRACK-03", category: "Apparel", brand: "Tirupur Cotton", unit: "pcs", price: 380, available_quantity: 500, min_order_quantity: 5 }
    ],
    "Surat Synthetic Fabrics & Denim": [
      { product_name: "Slim Fit Stretch Denim Jeans (32)", sku: "SURAT-DNM-01", category: "Apparel", brand: "Surat Denim", unit: "pcs", price: 550, available_quantity: 400, min_order_quantity: 5 },
      { product_name: "Heavy Twill Cotton Denim Fabric Roll (50m)", sku: "SURAT-ROL-02", category: "Fabrics", brand: "Surat Denim", unit: "rolls", price: 4500, available_quantity: 50, min_order_quantity: 1 },
      { product_name: "Polyester Rayon Shirting Fabric (30m)", sku: "SURAT-SHIRT-03", category: "Fabrics", brand: "Surat Denim", unit: "rolls", price: 2800, available_quantity: 80, min_order_quantity: 1 }
    ],
    "Delhi Wholesale Distributors": [
      { product_name: "Fortune Sunlite Sunflower Oil (1L Pouch)", sku: "DWD-FORT-01", category: "Grocery", brand: "Fortune", unit: "pouches", price: 125, available_quantity: 600, min_order_quantity: 10 },
      { product_name: "Maggi 2-Minute Masala Noodles (Carton of 24)", sku: "DWD-MAGGI-02", category: "Grocery", brand: "Nestlé", unit: "cartons", price: 260, available_quantity: 400, min_order_quantity: 2 },
      { product_name: "Aashirvaad Shudh Chakki Atta (10kg Bag)", sku: "DWD-ATTA-03", category: "Grocery", brand: "Aashirvaad", unit: "bags", price: 390, available_quantity: 350, min_order_quantity: 5 },
      { product_name: "Dettol Antiseptic Liquid (500ml Bottle)", sku: "DWD-DET-04", category: "Personal Care", brand: "Dettol", unit: "bottles", price: 180, available_quantity: 500, min_order_quantity: 6 }
    ]
  };

  let insertedCount = 0;
  for (const supplier of suppliers) {
    const products = catalogMap[supplier.name];
    if (!products) continue;

    for (const p of products) {
      // Check if product with this SKU already exists for this supplier
      const checkRes = await pool.query(
        "SELECT id FROM public.supplier_products WHERE supplier_id = $1 AND sku = $2",
        [supplier.id, p.sku]
      );

      if (checkRes.rows.length === 0) {
        await pool.query(`
          INSERT INTO public.supplier_products (
            supplier_id, product_name, sku, category, brand, unit,
            price, available_quantity, min_order_quantity, is_available, is_discoverable,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, now(), now())
        `, [
          supplier.id,
          p.product_name,
          p.sku,
          p.category,
          p.brand,
          p.unit,
          p.price,
          p.available_quantity,
          p.min_order_quantity
        ]);
        insertedCount++;
      }
    }
  }

  console.log(`Seeded ${insertedCount} supplier products successfully across suppliers.`);
}

if (process.argv[1]?.endsWith("seedSupplierProducts.js")) {
  seedSupplierProducts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
