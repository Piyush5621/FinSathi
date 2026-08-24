import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { ProductService } from "../src/modules/catalog/services/ProductService.js";
import { ProductRepository } from "../src/modules/catalog/repositories/ProductRepository.js";
import { VariantRepository } from "../src/modules/catalog/repositories/VariantRepository.js";
import { BarcodeRepository } from "../src/modules/catalog/repositories/BarcodeRepository.js";
import { BaseRepository } from "../src/modules/masters/repositories/BaseRepository.js";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { StockRepository } from "../src/modules/inventory/repositories/StockRepository.js";
import { SalesService } from "../src/services/SalesService.js";
import { SalesRepository } from "../src/repositories/SalesRepository.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";
import { supabase } from "../src/config/db.js";

// Mock Database State Arrays
let mockProducts = [];
let mockVariants = [];
let mockBarcodes = [];
let mockWarehouseStock = [];
let mockMovements = [];
let mockBatches = [];
let mockSales = [];
let mockUsers = [];
let mockWarehouses = [];
let mockCustomers = [];

describe("Karobar Product Catalog, Variants & POS Flow Integration Tests", () => {
  before(() => {
    // 1. Mock BaseRepository for catalog and masters
    BaseRepository.findById = async (table, id, organizationId) => {
      if (table === "inventory") {
        return mockProducts.find(p => p.id === id && p.organization_id === organizationId && !p.deleted_at) || null;
      }
      if (table === "product_variants") {
        return mockVariants.find(v => v.id === id && v.organization_id === organizationId && !v.deleted_at) || null;
      }
      return null;
    };

    BaseRepository.create = async (table, data) => {
      const record = { 
        id: `${table}-id-${Math.floor(Math.random() * 1000000)}`, 
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(), 
        ...data 
      };
      if (table === "inventory") mockProducts.push(record);
      else if (table === "product_variants") mockVariants.push(record);
      else if (table === "product_barcodes") mockBarcodes.push(record);
      return record;
    };

    BaseRepository.update = async (table, id, organizationId, updates) => {
      let list = table === "inventory" ? mockProducts : mockVariants;
      const idx = list.findIndex(r => r.id === id && r.organization_id === organizationId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
        return list[idx];
      }
      return null;
    };

    // 2. Mock BarcodeRepository & ProductRepository
    BarcodeRepository.findByBarcodeValue = async (barcodeValue, organizationId) => {
      return mockBarcodes.find(b => b.barcode_value === barcodeValue && b.organization_id === organizationId && !b.deleted_at) || null;
    };

    BarcodeRepository.findProductBarcodes = async (productId, organizationId) => {
      return mockBarcodes.filter(b => b.product_id === productId && b.organization_id === organizationId && !b.deleted_at);
    };

    VariantRepository.findProductVariants = async (productId, organizationId) => {
      return mockVariants.filter(v => v.product_id === productId && v.organization_id === organizationId && !v.deleted_at);
    };

    ProductRepository.findByBarcode = async (barcode, organizationId) => {
      const bc = mockBarcodes.find(b => b.barcode_value === barcode && b.organization_id === organizationId && !b.deleted_at);
      if (!bc) return null;
      const product = mockProducts.find(p => p.id === bc.product_id && !p.deleted_at);
      return { product, variantId: bc.variant_id };
    };

    ProductRepository.findSpecifications = async () => null;
    ProductRepository.findBundleComponents = async () => [];

    // 3. Mock StockRepository with variant locking
    const whLocks = {};
    StockRepository.lockWarehouseStock = async (orgId, warehouseId, productId, variantId) => {
      const vId = variantId || null;
      const lockKey = `${orgId}:${warehouseId}:${productId}:${vId}`;

      while (whLocks[lockKey]) {
        await new Promise(resolve => setTimeout(resolve, 2));
      }
      whLocks[lockKey] = true;
      setTimeout(() => { whLocks[lockKey] = false; }, 50);

      let stock = mockWarehouseStock.find(
        s => s.warehouse_id === warehouseId &&
             s.product_id === productId &&
             s.variant_id === vId &&
             s.organization_id === orgId
      );

      if (!stock) {
        stock = {
          id: `wh-stock-${Math.random()}`,
          organization_id: orgId,
          warehouse_id: warehouseId,
          product_id: productId,
          variant_id: vId,
          on_hand: 0.0000,
          reserved: 0.0000,
          available: 0.0000,
          incoming: 0.0000,
          outgoing: 0.0000
        };
        mockWarehouseStock.push(stock);
      }
      return { ...stock };
    };

    StockRepository.updateWarehouseStock = async (id, orgId, updates) => {
      const idx = mockWarehouseStock.findIndex(s => s.id === id && s.organization_id === orgId);
      if (idx !== -1) {
        mockWarehouseStock[idx] = { ...mockWarehouseStock[idx], ...updates };
        const s = mockWarehouseStock[idx];
        const lockKey = `${orgId}:${s.warehouse_id}:${s.product_id}:${s.variant_id}`;
        whLocks[lockKey] = false;
        return { ...mockWarehouseStock[idx] };
      }
      throw new Error("Warehouse stock row not found.");
    };

    StockRepository.createMovement = async (data) => {
      const record = { id: `mvt-${Math.random()}`, created_at: new Date().toISOString(), ...data };
      mockMovements.push(record);
      return record;
    };

    StockRepository.findBatches = async (productId, warehouseId, orgId) => {
      return mockBatches.filter(b => b.product_id === productId && b.warehouse_id === warehouseId && b.organization_id === orgId);
    };

    // 4. Mock SalesRepository
    SalesRepository.create = async (userId, saleData) => {
      const newSale = {
        id: `sale-${Math.floor(Math.random() * 1000000)}`,
        user_id: userId,
        created_at: new Date().toISOString(),
        ...saleData
      };
      mockSales.push(newSale);
      return { ...newSale };
    };

    SalesRepository.deleteById = async (userId, id) => {
      const idx = mockSales.findIndex(s => s.id === id && s.user_id === userId);
      if (idx !== -1) mockSales.splice(idx, 1);
    };

    // 5. Mock adminSupabase & supabase query builder
    const createQueryMock = (tableName) => {
      let filterId = null;
      let filterOrg = null;
      let filterUser = null;
      let filterBarcode = null;
      let filterSearch = null;

      const builder = {
        select: (cols) => {
          const selectObj = {
            eq: (col, val) => {
              if (col === "id") filterId = val;
              if (col === "organization_id") filterOrg = val;
              if (col === "user_id") filterUser = val;
              if (col === "barcode_value") filterBarcode = val;
              return selectObj;
            },
            is: () => selectObj,
            or: (cond) => {
              const match = cond.match(/ilike\.%([^%]+)%/);
              if (match) filterSearch = match[1];
              return selectObj;
            },
            order: () => selectObj,
            limit: () => selectObj,
            range: () => selectObj,
            maybeSingle: async () => {
              if (tableName === "users") return { data: mockUsers.find(x => x.id === filterId || x.id === filterUser) || null, error: null };
              if (tableName === "warehouses") return { data: mockWarehouses[0] || null, error: null };
              if (tableName === "customers") return { data: mockCustomers.find(x => x.id === filterId) || null, error: null };
              if (tableName === "organization_preferences") return { data: { preferences: { batchSelectionStrategy: "FIFO" } }, error: null };
              if (tableName === "organizations") return { data: { business_type: "Grocery" }, error: null };
              if (tableName === "categories" || tableName === "brands") return { data: null, error: null };
              if (tableName === "product_media") return { data: [], error: null };
              if (tableName === "inventory") return { data: mockProducts.find(p => p.id === filterId) || null, error: null };
              if (tableName === "product_barcodes") return { data: mockBarcodes.find(b => b.barcode_value === filterBarcode) || null, error: null };
              return { data: null, error: null };
            },
            single: async () => {
              return await selectObj.maybeSingle();
            },
            then: (resolve) => {
              if (tableName === "inventory") {
                let list = [...mockProducts];
                if (filterOrg) list = list.filter(p => p.organization_id === filterOrg);
                if (filterSearch) list = list.filter(p => p.name?.toLowerCase().includes(filterSearch.toLowerCase()) || p.sku?.toLowerCase().includes(filterSearch.toLowerCase()));
                return resolve({ data: list, count: list.length, error: null });
              }
              if (tableName === "product_media") {
                return resolve({ data: [], error: null });
              }
              resolve({ data: [], count: 0, error: null });
            }
          };
          return selectObj;
        },
        insert: (data) => {
          const arr = Array.isArray(data) ? data : [data];
          const records = arr.map(item => ({
            id: item.id || `${tableName}-${Math.floor(Math.random() * 1000000)}`,
            created_at: new Date().toISOString(),
            ...item
          }));
          if (tableName === "inventory_batches") mockBatches.push(...records);
          if (tableName === "product_barcodes") mockBarcodes.push(...records);
          if (tableName === "product_variants") mockVariants.push(...records);
          if (tableName === "inventory") mockProducts.push(...records);

          const ret = Array.isArray(data) ? records : records[0];
          return {
            select: () => ({
              single: async () => ({ data: ret, error: null }),
              maybeSingle: async () => ({ data: ret, error: null }),
              then: (resolve) => resolve({ data: records, error: null })
            }),
            single: async () => ({ data: ret, error: null })
          };
        },
        update: (data) => ({
          eq: (col, val) => {
            if (tableName === "inventory_batches" && col === "id") {
              const b = mockBatches.find(x => x.id === val);
              if (b) Object.assign(b, data);
            }
            return builder;
          },
          select: () => builder,
          single: async () => ({ data, error: null })
        })
      };
      return builder;
    };

    adminSupabase.from = createQueryMock;
    supabase.from = createQueryMock;
  });

  beforeEach(() => {
    mockProducts = [];
    mockVariants = [];
    mockBarcodes = [];
    mockWarehouseStock = [];
    mockMovements = [];
    mockBatches = [];
    mockSales = [];
    mockUsers = [
      { id: "user-1", organization_id: "org-1", business_name: "Sharma General Store" }
    ];
    mockWarehouses = [
      { id: "wh-1", organization_id: "org-1", user_id: "user-1", name: "Main Warehouse", is_main_hub: true, is_active: true }
    ];
    mockCustomers = [
      { id: "cust-1", name: "Sunita Gupta", phone: "+919810012345", outstanding_balance: 0 }
    ];
  });

  test("1. Product & Variants Creation — Basmati Rice with 1kg (8901) and 5kg (8902) variants", async () => {
    const orgId = "org-1";
    const userId = "user-1";

    // 1. Create Parent Product: Basmati Rice
    const parent = await ProductService.createProduct(orgId, {
      name: "Basmati Rice",
      productType: "variant",
      sellingPrice: 460.00,
      costPrice: 380.00
    }, userId);

    assert.ok(parent.id);
    assert.equal(parent.name, "Basmati Rice");

    // 2. Create Variant 1: 1kg with barcode 8901
    const var1 = await ProductService.createVariant(parent.id, orgId, {
      name: "1kg",
      sku: "BAS-1KG",
      sellingPrice: 120.00,
      purchasePrice: 95.00,
      attributes: { Weight: "1kg" },
      barcodes: [{ value: "8901", type: "EAN-13", isPrimary: true }]
    }, userId);

    assert.ok(var1.id);
    assert.equal(var1.name, "1kg");
    assert.equal(var1.sku, "BAS-1KG");

    // 3. Create Variant 2: 5kg with barcode 8902
    const var2 = await ProductService.createVariant(parent.id, orgId, {
      name: "5kg",
      sku: "BAS-5KG",
      sellingPrice: 460.00,
      purchasePrice: 380.00,
      attributes: { Weight: "5kg" },
      barcodes: [{ value: "8902", type: "EAN-13", isPrimary: true }]
    }, userId);

    assert.ok(var2.id);
    assert.equal(var2.name, "5kg");
    assert.equal(var2.sku, "BAS-5KG");

    // Verify stored barcodes
    assert.equal(mockBarcodes.length, 2);
    const bc8901 = mockBarcodes.find(b => b.barcode_value === "8901");
    const bc8902 = mockBarcodes.find(b => b.barcode_value === "8902");

    assert.equal(bc8901.variant_id, var1.id);
    assert.equal(bc8902.variant_id, var2.id);
  });

  test("2. Barcode Resolution — 8901 resolves to 1kg variant, 8902 resolves to 5kg variant", async () => {
    const orgId = "org-1";
    const userId = "user-1";

    // Setup Parent & Variants
    const parent = await ProductService.createProduct(orgId, { name: "Basmati Rice", productType: "variant" }, userId);
    const var1 = await ProductService.createVariant(parent.id, orgId, {
      name: "1kg",
      sellingPrice: 120.00,
      attributes: { Weight: "1kg" },
      barcodes: [{ value: "8901", isPrimary: true }]
    }, userId);
    const var2 = await ProductService.createVariant(parent.id, orgId, {
      name: "5kg",
      sellingPrice: 460.00,
      attributes: { Weight: "5kg" },
      barcodes: [{ value: "8902", isPrimary: true }]
    }, userId);

    // 1. Search by Barcode 8901
    const match8901 = await ProductRepository.findByBarcode("8901", orgId);
    assert.ok(match8901);
    assert.equal(match8901.product.id, parent.id);
    assert.equal(match8901.variantId, var1.id, "Barcode 8901 must resolve to 1kg variant ID");

    // 2. Search by Barcode 8902
    const match8902 = await ProductRepository.findByBarcode("8902", orgId);
    assert.ok(match8902);
    assert.equal(match8902.product.id, parent.id);
    assert.equal(match8902.variantId, var2.id, "Barcode 8902 must resolve to 5kg variant ID");
  });

  test("3. POS Checkout with Variant ID — Deducts specific variant stock in StockService", async () => {
    const orgId = "org-1";
    const whId = "wh-1";
    const userId = "user-1";

    // 1. Setup Parent & Variants
    const parent = await ProductService.createProduct(orgId, { name: "Basmati Rice", productType: "variant" }, userId);
    const var1 = await ProductService.createVariant(parent.id, orgId, {
      name: "1kg",
      sku: "BAS-1KG",
      sellingPrice: 120.00,
      purchasePrice: 95.00,
      attributes: { Weight: "1kg" },
      barcodes: [{ value: "8901", isPrimary: true }]
    }, userId);
    const var2 = await ProductService.createVariant(parent.id, orgId, {
      name: "5kg",
      sku: "BAS-5KG",
      sellingPrice: 460.00,
      purchasePrice: 380.00,
      attributes: { Weight: "5kg" },
      barcodes: [{ value: "8902", isPrimary: true }]
    }, userId);

    // 2. Post Opening Stock: 10 units for 1kg variant, 20 units for 5kg variant
    await StockService.postOpeningStock(orgId, {
      warehouseId: whId,
      productId: parent.id,
      variantId: var1.id,
      quantity: 10,
      unitCost: 95.00
    }, userId);

    await StockService.postOpeningStock(orgId, {
      warehouseId: whId,
      productId: parent.id,
      variantId: var2.id,
      quantity: 20,
      unitCost: 380.00
    }, userId);

    // 3. POS Checkout: Customer purchases 2 units of 1kg variant (scanned via 8901)
    const salePayload1 = {
      customer_id: "cust-1",
      warehouse_id: whId,
      items: [
        {
          productId: parent.id,
          variantId: var1.id,
          quantity: 2,
          price: 120.00,
          cost_price: 95.00,
          name: "Basmati Rice (1kg)"
        }
      ],
      subtotal: 240.00,
      total: 240.00,
      payment_method: "cash",
      payment_status: "paid",
      amount_paid: 240.00
    };

    const sale1 = await SalesService.createSale(userId, salePayload1);
    assert.ok(sale1.id);

    // 4. Verify 1kg variant balance decremented: 10 -> 8
    const balance1 = await StockService.getWarehouseBalance(whId, parent.id, var1.id, orgId);
    assert.equal(balance1.onHand, 8);
    assert.equal(balance1.available, 8);

    // 5. Verify movement ledger has variant_id set
    const mvt1 = mockMovements.find(m => m.reference_id === sale1.id);
    assert.ok(mvt1);
    assert.equal(mvt1.variant_id, var1.id);
    assert.equal(mvt1.quantity, -2);

    // 6. POS Checkout: Customer purchases 5 units of 5kg variant (scanned via 8902)
    const salePayload2 = {
      customer_id: "cust-1",
      warehouse_id: whId,
      items: [
        {
          productId: parent.id,
          variantId: var2.id,
          quantity: 5,
          price: 460.00,
          cost_price: 380.00,
          name: "Basmati Rice (5kg)"
        }
      ],
      subtotal: 2300.00,
      total: 2300.00,
      payment_method: "upi",
      payment_status: "paid",
      amount_paid: 2300.00
    };

    const sale2 = await SalesService.createSale(userId, salePayload2);
    assert.ok(sale2.id);

    // 7. Verify 5kg variant balance decremented: 20 -> 15
    const balance2 = await StockService.getWarehouseBalance(whId, parent.id, var2.id, orgId);
    assert.equal(balance2.onHand, 15);
    assert.equal(balance2.available, 15);

    const mvt2 = mockMovements.find(m => m.reference_id === sale2.id);
    assert.ok(mvt2);
    assert.equal(mvt2.variant_id, var2.id);
    assert.equal(mvt2.quantity, -5);
  });

  test("4. GET /api/catalog/products?limit=100 — Returns product catalog with limit support", async () => {
    const orgId = "org-1";
    const userId = "user-1";

    // Create 3 products
    await ProductService.createProduct(orgId, { name: "Mustard Oil 1L", sellingPrice: 150.00 }, userId);
    await ProductService.createProduct(orgId, { name: "Wheat Flour 10kg", sellingPrice: 380.00 }, userId);
    await ProductService.createProduct(orgId, { name: "Sugar 1kg", sellingPrice: 45.00 }, userId);

    const searchRes = await ProductService.search(orgId, { limit: 100, page: 1 });
    assert.ok(searchRes.data);
    assert.equal(searchRes.data.length >= 3, true);
    assert.equal(searchRes.count >= 3, true);
  });

  test("5. GET /api/catalog/products?query=Flour — Filters catalog by search term", async () => {
    const orgId = "org-1";
    const userId = "user-1";

    await ProductService.createProduct(orgId, { name: "Wheat Flour 10kg", sku: "FLOUR-10KG", sellingPrice: 380.00 }, userId);

    const searchRes = await ProductService.search(orgId, { query: "Flour", limit: 100 });
    assert.ok(searchRes.data);
    const match = searchRes.data.find(p => p.name.includes("Flour"));
    assert.ok(match);
    assert.equal(match.name, "Wheat Flour 10kg");
  });

  test("6. GET /api/catalog/products?barcode=8901 — Returns barcode-matched product details", async () => {
    const orgId = "org-1";
    const userId = "user-1";

    const parent = await ProductService.createProduct(orgId, { name: "Premium Tea", productType: "variant" }, userId);
    await ProductService.createVariant(parent.id, orgId, {
      name: "250g",
      sellingPrice: 85.00,
      barcodes: [{ value: "890555", isPrimary: true }]
    }, userId);

    const searchRes = await ProductService.search(orgId, { barcode: "890555" });
    assert.ok(searchRes.data);
    assert.equal(searchRes.data.length, 1);
    assert.equal(searchRes.data[0].id, parent.id);
  });

  test("7. Tenant Isolation: Organization A cannot access Organization B's products", async () => {
    const orgA = "org-1";
    const orgB = "org-2";
    const userA = "user-1";
    const userB = "user-2";

    await ProductService.createProduct(orgA, { name: "Org A Secret Blend", sellingPrice: 999.00 }, userA);
    await ProductService.createProduct(orgB, { name: "Org B Special Spice", sellingPrice: 500.00 }, userB);

    const searchA = await ProductService.search(orgA, { limit: 100 });
    const searchB = await ProductService.search(orgB, { limit: 100 });

    const aHasBProduct = searchA.data.some(p => p.name === "Org B Special Spice");
    const bHasAProduct = searchB.data.some(p => p.name === "Org A Secret Blend");

    assert.equal(aHasBProduct, false, "Org A must not see Org B products");
    assert.equal(bHasAProduct, false, "Org B must not see Org A products");
  });
});
