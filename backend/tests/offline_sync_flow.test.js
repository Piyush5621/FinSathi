import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { SalesService } from "../src/services/SalesService.js";
import { SalesRepository } from "../src/repositories/SalesRepository.js";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { StockRepository } from "../src/modules/inventory/repositories/StockRepository.js";
import { ValidationError } from "../src/modules/masters/errors/appErrors.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";
import { supabase } from "../src/config/db.js";

// Mock Database Memory Arrays
let mockSales = [];
let mockWarehouseStock = [];
let mockMovements = [];
let mockBatches = [];
let mockUsers = [];
let mockWarehouses = [];
let mockCustomers = [];

describe("Offline POS Synchronization & Idempotency Flow Tests", () => {
  before(() => {
    const whLocks = {};

    // 1. Mock StockRepository with atomic row locking
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

    // 3. Mock adminSupabase & supabase query builders
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
                return { data: u || mockUsers[0] || null, error: null };
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
                return { data: { business_type: "Retail" }, error: null };
              }
              return { data: null, error: null };
            },
            single: async () => builder.select(cols).maybeSingle(),
            then: (resolve) => {
              if (tableName === "sales") {
                const salesForUser = mockSales.filter(s => !filterUser || s.user_id === filterUser);
                resolve({ data: salesForUser, error: null });
              } else if (tableName === "warehouses") {
                resolve({ data: mockWarehouses, error: null });
              } else {
                resolve({ data: [], error: null });
              }
            }
          };
        },
        insert: (data) => {
          const arr = Array.isArray(data) ? data : [data];
          const created = arr.map(item => ({
            id: item.id || `ins-${Math.random()}`,
            ...item
          }));
          return {
            select: () => ({
              maybeSingle: async () => ({ data: created[0], error: null }),
              single: async () => ({ data: created[0], error: null }),
              then: (resolve) => resolve({ data: created, error: null })
            }),
            maybeSingle: async () => ({ data: created[0], error: null }),
            single: async () => ({ data: created[0], error: null })
          };
        },
        update: (data) => ({
          eq: (col, val) => {
            if (tableName === "inventory_batches" && col === "id") {
              const b = mockBatches.find(x => x.id === val);
              if (b) Object.assign(b, data);
            }
            if (tableName === "customers" && col === "id") {
              const c = mockCustomers.find(x => x.id === val);
              if (c) Object.assign(c, data);
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
    mockSales = [];
    mockWarehouseStock = [
      {
        id: "whs-tea-1",
        organization_id: "org-offline-1",
        warehouse_id: "wh-offline-1",
        product_id: "prod-tea-1",
        variant_id: null,
        on_hand: 50,
        reserved: 0,
        available: 50
      }
    ];
    mockMovements = [];
    mockBatches = [
      {
        id: "batch-t1",
        organization_id: "org-offline-1",
        warehouse_id: "wh-offline-1",
        product_id: "prod-tea-1",
        batch_number: "BATCH-TEA-01",
        stock: 50,
        cost_price: 120.00,
        expiry_date: "2027-12-31",
        status: "active"
      }
    ];
    mockUsers = [
      { id: "user-offline-1", organization_id: "org-offline-1" }
    ];
    mockWarehouses = [
      { id: "wh-offline-1", organization_id: "org-offline-1", user_id: "user-offline-1", name: "Main Store Hub", is_active: true, is_main_hub: true }
    ];
    mockCustomers = [
      { id: "cust-1", name: "Anand Kumar", outstanding_balance: 0.00 }
    ];
  });

  test("1. Single Offline Bill Sync: Processes through StockService, creates sale, and deducts stock", async () => {
    const userId = "user-offline-1";
    const offlinePayload = {
      customer_id: "cust-1",
      idempotency_key: "OFFLINE-1001-abc",
      invoice_no: "OFF-1001",
      warehouse_id: "wh-offline-1",
      organization_id: "org-offline-1",
      items: [
        {
          productId: "prod-tea-1",
          quantity: 2, // 2 units
          price: 150.00,
          cost_price: 120.00,
          batchId: "batch-t1"
        }
      ],
      subtotal: 300.00,
      total: 300.00,
      payment_method: "cash",
      payment_status: "paid",
      amount_paid: 300.00
    };

    const sale = await SalesService.createSale(userId, offlinePayload);

    // 1. Sale is created
    assert.ok(sale.id);
    assert.strictEqual(mockSales.length, 1);
    assert.strictEqual(sale.invoice_no, "OFF-1001");

    // 2. Stock is deducted from 50 -> 48
    const stock = mockWarehouseStock.find(s => s.product_id === "prod-tea-1");
    assert.strictEqual(stock.on_hand, 48);
    assert.strictEqual(stock.available, 48);

    // 3. Batch stock is deducted from 50 -> 48
    const batch = mockBatches.find(b => b.id === "batch-t1");
    assert.strictEqual(batch.stock, 48);

    // 4. Inventory movement is recorded
    assert.strictEqual(mockMovements.length, 1);
    assert.strictEqual(mockMovements[0].quantity, -2);
    assert.strictEqual(mockMovements[0].movement_type, "sale");
  });

  test("2. Idempotency on Network Retry: Replaying same offline bill with same idempotency key returns existing sale without double-deducting stock", async () => {
    const userId = "user-offline-1";
    const offlinePayload = {
      customer_id: "cust-1",
      idempotency_key: "OFFLINE-RETRY-002",
      invoice_no: "OFF-2002",
      warehouse_id: "wh-offline-1",
      organization_id: "org-offline-1",
      items: [
        {
          productId: "prod-tea-1",
          quantity: 3,
          price: 150.00,
          cost_price: 120.00,
          batchId: "batch-t1"
        }
      ],
      subtotal: 450.00,
      total: 450.00,
      payment_method: "cash",
      payment_status: "paid",
      amount_paid: 450.00
    };

    // First attempt (e.g. server saved it, but client disconnected before receiving response)
    const sale1 = await SalesService.createSale(userId, offlinePayload);
    assert.ok(sale1.id);
    assert.strictEqual(mockSales.length, 1);

    // Stock deducted 50 - 3 = 47
    const stockAfterFirst = mockWarehouseStock.find(s => s.product_id === "prod-tea-1").on_hand;
    assert.strictEqual(stockAfterFirst, 47);

    // Second attempt on reconnect with same idempotency_key
    const sale2 = await SalesService.createSale(userId, offlinePayload);

    // Verify it returns the exact same sale
    assert.strictEqual(sale2.id, sale1.id);
    assert.strictEqual(mockSales.length, 1, "Must NOT create a second sales record");

    // Stock must remain 47 (NOT deducted again to 44)
    const stockAfterSecond = mockWarehouseStock.find(s => s.product_id === "prod-tea-1").on_hand;
    assert.strictEqual(stockAfterSecond, 47, "Must NOT double deduct inventory stock");
  });

  test("3. Sequential Batch Sync of 5 Offline Bills: Exactly 5 sales created and stock correctly decremented", async () => {
    const userId = "user-offline-1";

    for (let i = 1; i <= 5; i++) {
      const payload = {
        customer_id: "cust-1",
        idempotency_key: `OFFLINE-BATCH-${i}`,
        invoice_no: `OFF-BATCH-${i}`,
        warehouse_id: "wh-offline-1",
        organization_id: "org-offline-1",
        items: [
          {
            productId: "prod-tea-1",
            quantity: 2, // 2 units each * 5 = 10 units total
            price: 150.00,
            cost_price: 120.00,
            batchId: "batch-t1"
          }
        ],
        subtotal: 300.00,
        total: 300.00,
        payment_method: "cash",
        payment_status: "paid"
      };

      await SalesService.createSale(userId, payload);
    }

    // Exactly 5 sales created
    assert.strictEqual(mockSales.length, 5);

    // Initial stock 50 - 10 = 40
    const stock = mockWarehouseStock.find(s => s.product_id === "prod-tea-1");
    assert.strictEqual(stock.on_hand, 40);
    assert.strictEqual(stock.available, 40);

    // 5 inventory movements recorded
    assert.strictEqual(mockMovements.length, 5);
  });

  test("4. Insufficient Stock Failure & Rollback: Offline bill with excess quantity fails without leaving orphan sale", async () => {
    const userId = "user-offline-1";

    const excessPayload = {
      customer_id: "cust-1",
      idempotency_key: "OFFLINE-EXCESS-001",
      invoice_no: "OFF-EXCESS",
      warehouse_id: "wh-offline-1",
      organization_id: "org-offline-1",
      items: [
        {
          productId: "prod-tea-1",
          quantity: 100, // Stock is only 50
          price: 150.00,
          cost_price: 120.00,
          batchId: "batch-t1"
        }
      ],
      subtotal: 15000.00,
      total: 15000.00,
      payment_method: "cash",
      payment_status: "paid"
    };

    await assert.rejects(
      async () => SalesService.createSale(userId, excessPayload),
      /Insufficient stock/
    );

    // Verify orphan sale was rolled back and deleted
    assert.strictEqual(mockSales.length, 0);

    // Verify stock remains unaffected at 50
    const stock = mockWarehouseStock.find(s => s.product_id === "prod-tea-1");
    assert.strictEqual(stock.on_hand, 50);
  });
});
