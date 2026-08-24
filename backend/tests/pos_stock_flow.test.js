import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { SalesService } from "../src/services/SalesService.js";
import { SalesRepository } from "../src/repositories/SalesRepository.js";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { StockRepository } from "../src/modules/inventory/repositories/StockRepository.js";
import { BatchSelectionEngine } from "../src/modules/inventory/services/BatchSelectionEngine.js";
import { ValidationError } from "../src/modules/masters/errors/appErrors.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";
import { supabase } from "../src/config/db.js";

// Mock Database Memory Arrays
let mockSales = [];
let mockWarehouseStock = [];
let mockMovements = [];
let mockBatches = [];
let mockLegacyInventory = [];
let mockUsers = [];
let mockWarehouses = [];
let mockCustomers = [];

describe("POS Stock Flow & Karobar Stock Engine Integration Tests", () => {
  before(() => {
    const whLocks = {};

    // 1. Mock StockRepository with atomic row locking (SELECT FOR UPDATE simulation)
    StockRepository.lockWarehouseStock = async (orgId, warehouseId, productId, variantId) => {
      const vId = variantId || null;
      const lockKey = `${orgId}:${warehouseId}:${productId}:${vId}`;

      // Acquire lock: spin-wait if a lock exists
      while (whLocks[lockKey]) {
        await new Promise(resolve => setTimeout(resolve, 2));
      }
      whLocks[lockKey] = true;

      // Fail-safe auto-release timeout to prevent deadlocks on unhandled failures
      setTimeout(() => {
        whLocks[lockKey] = false;
      }, 50);

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
        
        // Release lock
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
      return mockBatches.filter(
        b => b.product_id === productId &&
             b.warehouse_id === warehouseId &&
             b.organization_id === orgId &&
             (b.status === 'active' || !b.status)
      );
    };

    // 2. Mock SalesRepository
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
      if (idx !== -1) {
        mockSales.splice(idx, 1);
      }
    };

    SalesRepository.findById = async (userId, id) => {
      return mockSales.find(s => s.id === id && s.user_id === userId) || null;
    };

    // 3. Mock adminSupabase & supabase query builders for tests
    const createQueryMock = (tableName) => {
      let filterOrg = null;
      let filterUser = null;
      let filterId = null;
      let filterBatch = null;
      let filterProd = null;
      let filterBatchNum = null;

      const builder = {
        select: (cols) => {
          return {
            eq: (col, val) => {
              if (col === "id") filterId = val;
              if (col === "organization_id") filterOrg = val;
              if (col === "user_id") filterUser = val;
              if (col === "batch_id") filterBatch = val;
              if (col === "product_id") filterProd = val;
              if (col === "batch_number") filterBatchNum = val;
              return builder.select(cols);
            },
            or: () => builder.select(cols),
            is: () => builder.select(cols),
            order: () => builder.select(cols),
            limit: () => builder.select(cols),
            maybeSingle: async () => {
              if (tableName === "users") {
                const u = mockUsers.find(x => x.id === filterId || x.id === filterUser);
                return { data: u || null, error: null };
              }
              if (tableName === "warehouses") {
                const wh = mockWarehouses.find(x => x.organization_id === filterOrg || x.user_id === filterUser || x.id === filterId);
                return { data: wh || mockWarehouses[0] || null, error: null };
              }
              if (tableName === "inventory_batches") {
                const b = mockBatches.find(x => 
                  (filterId && x.id === filterId) ||
                  (filterBatchNum && x.batch_number === filterBatchNum && x.product_id === filterProd)
                );
                return { data: b || null, error: null };
              }
              if (tableName === "customers") {
                const c = mockCustomers.find(x => x.id === filterId);
                return { data: c || null, error: null };
              }
              if (tableName === "organization_preferences") {
                return { data: { preferences: { batchSelectionStrategy: "FEFO" } }, error: null };
              }
              if (tableName === "organizations") {
                return { data: { business_type: "Medical" }, error: null };
              }
              return { data: null, error: null };
            },
            single: async () => {
              const res = await builder.select(cols).maybeSingle();
              return res;
            }
          };
        },
        insert: (data) => {
          const arr = Array.isArray(data) ? data : [data];
          const createdRecords = arr.map(item => {
            const record = {
              id: item.id || `${tableName}-${Math.floor(Math.random() * 1000000)}`,
              created_at: new Date().toISOString(),
              stock: item.stock ?? (item.quantity ?? 0),
              ...item
            };
            if (tableName === "inventory_batches") mockBatches.push(record);
            if (tableName === "sales") mockSales.push(record);
            if (tableName === "warehouses") mockWarehouses.push(record);
            return record;
          });
          const returnRecord = Array.isArray(data) ? createdRecords : createdRecords[0];

          return {
            select: () => ({
              single: async () => ({ data: returnRecord, error: null }),
              maybeSingle: async () => ({ data: returnRecord, error: null }),
              then: (resolve) => resolve({ data: createdRecords, error: null })
            }),
            single: async () => ({ data: returnRecord, error: null }),
            maybeSingle: async () => ({ data: returnRecord, error: null })
          };
        },
        update: (data) => {
          return {
            eq: (col, val) => {
              if (tableName === "inventory_batches" && col === "id") {
                const b = mockBatches.find(x => x.id === val);
                if (b) Object.assign(b, data);
              }
              if (tableName === "inventory" && col === "id") {
                const inv = mockLegacyInventory.find(x => x.id === val);
                if (inv) Object.assign(inv, data);
              }
              if (tableName === "customers" && col === "id") {
                const c = mockCustomers.find(x => x.id === val);
                if (c) Object.assign(c, data);
              }
              return builder;
            },
            select: () => builder,
            single: async () => ({ data, error: null })
          };
        }
      };
      return builder;
    };

    adminSupabase.from = createQueryMock;
    supabase.from = createQueryMock;
  });

  beforeEach(() => {
    mockSales = [];
    mockWarehouseStock = [];
    mockMovements = [];
    mockBatches = [];
    mockLegacyInventory = [];
    mockUsers = [
      { id: "user-100", organization_id: "org-100", business_name: "Sharma General Store" }
    ];
    mockWarehouses = [
      { id: "wh-100", organization_id: "org-100", user_id: "user-100", name: "Main Warehouse", is_main_hub: true, is_active: true }
    ];
    mockCustomers = [
      { id: "cust-1", name: "Pooja Verma", phone: "+919876543210", outstanding_balance: 0 }
    ];
  });

  test("1. Normal POS Sale — Deducts warehouse_stock, records movements & batches, skips legacy inventory", async () => {
    const orgId = "org-100";
    const whId = "wh-100";
    const prodId = "prod-sugar-5k";
    const userId = "user-100";

    // Setup initial opening stock in warehouse_stock
    await StockService.postOpeningStock(orgId, {
      warehouseId: whId,
      productId: prodId,
      quantity: 50,
      unitCost: 210.00,
      batchNumber: "SUG-JUN-2026"
    }, userId);

    // Initial legacy inventory state with 50 units
    mockLegacyInventory.push({ id: prodId, stock: 50 });

    // Execute POS Sale of 5 units
    const salePayload = {
      customer_id: "cust-1",
      items: [
        {
          productId: prodId,
          quantity: 5,
          price: 255.00,
          cost_price: 210.00,
          name: "Sugar (5kg)"
        }
      ],
      subtotal: 1275.00,
      tax_amount: 0,
      discount_percent: 0,
      total: 1275.00,
      payment_method: "cash",
      payment_status: "paid",
      amount_paid: 1275.00
    };

    const sale = await SalesService.createSale(userId, salePayload);

    // 1. Verify sale creation
    assert.ok(sale);
    assert.ok(sale.id);
    assert.equal(sale.total, 1275.00);
    assert.equal(mockSales.length, 1);

    // 2. Verify warehouse_stock balance: on_hand was 50 -> now 45
    const whBalance = await StockService.getWarehouseBalance(whId, prodId, null, orgId);
    assert.equal(whBalance.onHand, 45);
    assert.equal(whBalance.available, 45);

    // 3. Verify inventory_movements ledger entry
    const saleMovements = mockMovements.filter(m => m.movement_type === "sale" && m.reference_id === sale.id);
    assert.equal(saleMovements.length, 1);
    assert.equal(saleMovements[0].product_id, prodId);
    assert.equal(saleMovements[0].quantity, -5);
    assert.equal(saleMovements[0].reference_type, "sales");
    assert.equal(saleMovements[0].total_cost, 1050.00);

    // 4. Verify batch deduction
    assert.equal(mockBatches.length, 1);
    assert.equal(mockBatches[0].stock, 45);

    // 5. Confirm that POS did NOT write to legacy inventory.stock
    const legacyItem = mockLegacyInventory.find(i => i.id === prodId);
    assert.equal(legacyItem.stock, 50, "Legacy inventory.stock must NOT be decremented directly by POS");
  });

  test("2. FEFO Batch Deduction — Auto-selects and deducts from batch with closest expiry", async () => {
    const orgId = "org-100";
    const whId = "wh-100";
    const prodId = "prod-milk-tetra";
    const userId = "user-100";

    // Setup opening stock in warehouse
    await StockService.postOpeningStock(orgId, {
      warehouseId: whId,
      productId: prodId,
      quantity: 30,
      unitCost: 60.00
    }, userId);

    // Create 2 batches: one expiring soon, one expiring late
    mockBatches.push(
      { id: "batch-late", organization_id: orgId, warehouse_id: whId, product_id: prodId, batch_number: "BATCH-LATE", expiry_date: "2026-12-31", stock: 15 },
      { id: "batch-soon", organization_id: orgId, warehouse_id: whId, product_id: prodId, batch_number: "BATCH-SOON", expiry_date: "2026-06-30", stock: 15 }
    );

    // POS sale without specifying batchId
    const salePayload = {
      customer_id: "cust-1",
      items: [
        {
          productId: prodId,
          quantity: 4,
          price: 74.00,
          cost_price: 60.00,
          name: "Amul Milk (1L)"
        }
      ],
      subtotal: 296.00,
      total: 296.00,
      payment_method: "upi",
      payment_status: "paid"
    };

    const sale = await SalesService.createSale(userId, salePayload);

    // Verify movement was assigned to the batch expiring soon
    const movement = mockMovements.find(m => m.reference_id === sale.id);
    assert.equal(movement.batch_id, "batch-soon");

    // Verify batch-soon stock decremented: 15 - 4 = 11
    const soonBatch = mockBatches.find(b => b.id === "batch-soon");
    assert.equal(soonBatch.stock, 11);
  });

  test("3. Insufficient Stock Failure & Rollback — Fails sale with ValidationError and leaves no orphan records", async () => {
    const orgId = "org-100";
    const whId = "wh-100";
    const prodId = "prod-ghee-tin";
    const userId = "user-100";

    // Seed only 2 units in warehouse
    await StockService.postOpeningStock(orgId, {
      warehouseId: whId,
      productId: prodId,
      quantity: 2,
      unitCost: 540.00
    }, userId);

    // Attempt POS checkout for 5 units (exceeds 2 available)
    const salePayload = {
      customer_id: "cust-1",
      items: [
        {
          productId: prodId,
          quantity: 5,
          price: 630.00,
          name: "Amul Ghee (1L)"
        }
      ],
      subtotal: 3150.00,
      total: 3150.00,
      payment_method: "cash",
      payment_status: "paid"
    };

    await assert.rejects(
      async () => SalesService.createSale(userId, salePayload),
      (err) => {
        assert.ok(err instanceof ValidationError || err.message.includes("Insufficient stock"));
        return true;
      }
    );

    // Assert: No sale record remains committed in mockSales
    assert.equal(mockSales.length, 0, "Failed sale must be completely rolled back");

    // Assert: warehouse_stock balance remains unchanged at 2
    const balance = await StockService.getWarehouseBalance(whId, prodId, null, orgId);
    assert.equal(balance.onHand, 2);
    assert.equal(balance.available, 2);

    // Assert: No sale movements created
    const saleMovements = mockMovements.filter(m => m.movement_type === "sale");
    assert.equal(saleMovements.length, 0);
  });

  test("4. High-Concurrency Race Condition — Exactly 1 unit available vs 2 simultaneous POS requests", async () => {
    const orgId = "org-100";
    const whId = "wh-100";
    const prodId = "prod-olive-oil-rare";
    const userId = "user-100";

    // Seed EXACTLY 1 unit in warehouse stock
    await StockService.postOpeningStock(orgId, {
      warehouseId: whId,
      productId: prodId,
      quantity: 1,
      unitCost: 800.00,
      batchNumber: "RARE-BATCH-01"
    }, userId);

    const salePayload1 = {
      customer_id: "cust-1",
      items: [{ productId: prodId, quantity: 1, price: 950.00, cost_price: 800.00, name: "Olive Oil" }],
      subtotal: 950.00,
      total: 950.00,
      payment_method: "cash",
      payment_status: "paid"
    };

    const salePayload2 = {
      customer_id: "cust-1",
      items: [{ productId: prodId, quantity: 1, price: 950.00, cost_price: 800.00, name: "Olive Oil" }],
      subtotal: 950.00,
      total: 950.00,
      payment_method: "upi",
      payment_status: "paid"
    };

    // Fire both checkout requests simultaneously
    const results = await Promise.allSettled([
      SalesService.createSale(userId, salePayload1),
      SalesService.createSale(userId, salePayload2)
    ]);

    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");

    // Concurrency Invariants:
    // 1. Exactly one request succeeds, and exactly one request fails
    assert.equal(fulfilled.length, 1, "Exactly 1 sale must succeed");
    assert.equal(rejected.length, 1, "The competing concurrent sale must fail due to stock depletion");

    // 2. The failing request must throw insufficient stock error
    assert.ok(rejected[0].reason.message.includes("Insufficient stock"));

    // 3. Warehouse stock must be exactly 0 (never negative)
    const finalBalance = await StockService.getWarehouseBalance(whId, prodId, null, orgId);
    assert.equal(finalBalance.onHand, 0, "Warehouse on_hand stock must be exactly 0");
    assert.equal(finalBalance.available, 0, "Warehouse available stock must be exactly 0");

    // 4. Exactly one sale committed and one movement recorded
    assert.equal(mockSales.length, 1, "Only 1 sale record should exist in the database");
    const saleMovements = mockMovements.filter(m => m.movement_type === "sale");
    assert.equal(saleMovements.length, 1, "Only 1 inventory movement should be logged");
  });
});
