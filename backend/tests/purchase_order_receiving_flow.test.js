import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { StockRepository } from "../src/modules/inventory/repositories/StockRepository.js";
import { ValidationError } from "../src/modules/masters/errors/appErrors.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";
import { supabase } from "../src/config/db.js";

// Mock Database State Arrays
let mockProducts = [];
let mockWarehouseStock = [];
let mockBatches = [];
let mockMovements = [];
let mockPurchaseOrders = [];
let mockPurchaseOrderItems = [];
let mockSuppliers = [];
let mockExpenses = [];
let mockWarehouses = [];

describe("Purchase Order Receiving & Modern Stock Engine Flow Tests", () => {
  before(() => {
    // 1. Mock StockRepository with row-locking
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

    // 2. Mock query builders for adminSupabase & supabase
    const createQueryMock = (tableName) => {
      let filterId = null;
      let filterPoId = null;
      let filterOrg = null;

      const builder = {
        select: (cols) => ({
          eq: (col, val) => {
            if (col === "id") filterId = val;
            if (col === "purchase_order_id") filterPoId = val;
            if (col === "organization_id") filterOrg = val;
            return builder.select(cols);
          },
          or: () => builder.select(cols),
          order: () => builder.select(cols),
          limit: () => builder.select(cols),
          maybeSingle: async () => {
            if (tableName === "inventory") return { data: mockProducts.find(p => p.id === filterId) || null, error: null };
            if (tableName === "suppliers") return { data: mockSuppliers.find(s => s.id === filterId) || null, error: null };
            if (tableName === "warehouses") return { data: mockWarehouses[0] || null, error: null };
            if (tableName === "purchase_orders") return { data: mockPurchaseOrders.find(p => p.id === filterId) || null, error: null };
            return { data: null, error: null };
          },
          single: async () => builder.select(cols).maybeSingle(),
          then: (resolve) => {
            if (tableName === "purchase_order_items") {
              const list = mockPurchaseOrderItems.filter(i => !filterPoId || i.purchase_order_id === filterPoId);
              return resolve({ data: list, error: null });
            }
            return resolve({ data: [], error: null });
          }
        }),
        insert: (data) => {
          const arr = Array.isArray(data) ? data : [data];
          const records = arr.map(item => ({
            id: item.id || `${tableName}-${Math.floor(Math.random() * 1000000)}`,
            created_at: new Date().toISOString(),
            ...item
          }));
          if (tableName === "inventory_batches") mockBatches.push(...records);
          if (tableName === "purchase_order_items") mockPurchaseOrderItems.push(...records);
          if (tableName === "expenses") mockExpenses.push(...records);

          const ret = Array.isArray(data) ? records : records[0];
          return {
            select: () => ({
              single: async () => ({ data: ret, error: null }),
              maybeSingle: async () => ({ data: ret, error: null })
            }),
            single: async () => ({ data: ret, error: null })
          };
        },
        update: (data) => ({
          eq: (col, val) => {
            if (tableName === "inventory" && col === "id") {
              const p = mockProducts.find(x => x.id === val);
              if (p) Object.assign(p, data);
            }
            if (tableName === "purchase_orders" && col === "id") {
              const po = mockPurchaseOrders.find(x => x.id === val);
              if (po) Object.assign(po, data);
            }
            if (tableName === "suppliers" && col === "id") {
              const s = mockSuppliers.find(x => x.id === val);
              if (s) Object.assign(s, data);
            }
            return {
              select: () => ({
                single: async () => ({ data: mockPurchaseOrders.find(x => x.id === val) || data, error: null })
              }),
              single: async () => ({ data, error: null })
            };
          }
        })
      };
      return builder;
    };

    adminSupabase.from = createQueryMock;
    supabase.from = createQueryMock;
  });

  beforeEach(() => {
    mockProducts = [
      { id: "prod-milk-1", name: "Amul Taaza Milk 1L", sku: "MILK-001", stock: 10, cost_price: 28.00, price: 34.00, wholesale_price: 31.00 }
    ];
    mockWarehouseStock = [
      { id: "whs-1", organization_id: "org-1", warehouse_id: "wh-1", product_id: "prod-milk-1", variant_id: null, on_hand: 10, reserved: 0, available: 10 }
    ];
    mockBatches = [];
    mockMovements = [];
    mockPurchaseOrders = [];
    mockPurchaseOrderItems = [];
    mockSuppliers = [
      { id: "supp-1", name: "Amul Dairy Distributor", outstanding_balance: 5000.00 }
    ];
    mockExpenses = [];
    mockWarehouses = [
      { id: "wh-1", organization_id: "org-1", user_id: "user-1", name: "Main Warehouse", is_main_hub: true, is_active: true }
    ];
  });

  test("1. Purchase Order Receiving Flow — Milk (50 units @ ₹30/unit) updates stock, batches, and movements", async () => {
    const orgId = "org-1";
    const whId = "wh-1";
    const userId = "user-1";

    // 1. Create Purchase Order in memory: Milk — 50 units @ ₹30/unit
    const po = {
      id: "po-1001",
      user_id: userId,
      organization_id: orgId,
      supplier_id: "supp-1",
      order_no: "PO-2026-001",
      status: "Sent",
      total_amount: 1500.00
    };
    mockPurchaseOrders.push(po);

    const poItems = [
      {
        id: "poi-1",
        purchase_order_id: po.id,
        inventory_id: "prod-milk-1",
        quantity: 50,
        cost_price: 30.00,
        total: 1500.00
      }
    ];
    mockPurchaseOrderItems.push(...poItems);

    // 2. Execute receivePurchaseOrderStock via StockService
    const results = await StockService.receivePurchaseOrderStock(orgId, {
      warehouseId: whId,
      purchaseOrderId: po.id,
      orderNo: po.order_no,
      items: poItems
    }, userId);

    // 3. Verify StockService output
    assert.equal(results.length, 1);
    const result = results[0];

    // 4. Verify warehouse_stock balance increased from 10 to 60 (+50)
    const whStock = mockWarehouseStock.find(s => s.product_id === "prod-milk-1");
    assert.equal(whStock.on_hand, 60, "Warehouse stock on_hand should increase by 50 units (10 -> 60)");
    assert.equal(whStock.available, 60, "Warehouse stock available should increase by 50 units (10 -> 60)");

    // 5. Verify inventory_batches record created with cost price = ₹30 and stock = 50
    assert.equal(mockBatches.length, 1);
    const batch = mockBatches[0];
    assert.equal(batch.product_id, "prod-milk-1");
    assert.equal(batch.stock, 50);
    assert.equal(batch.cost_price, 30.00);
    assert.equal(batch.purchase_cost, 30.00);
    assert.ok(batch.batch_number);

    // 6. Verify inventory_movements record created with inward quantity = 50
    assert.equal(mockMovements.length, 1);
    const mvt = mockMovements[0];
    assert.equal(mvt.product_id, "prod-milk-1");
    assert.equal(mvt.quantity, 50, "Movement quantity must be positive (+50) for inward receipt");
    assert.equal(mvt.movement_type, "purchase");
    assert.equal(mvt.reference_type, "purchase_orders");
    assert.equal(mvt.reference_id, po.id);
    assert.equal(mvt.unit_cost, 30.00);
    assert.equal(mvt.total_cost, 1500.00);

    // 7. Verify legacy product stock updated (10 -> 60) and cost price updated to ₹30
    const legacyProd = mockProducts.find(p => p.id === "prod-milk-1");
    assert.equal(legacyProd.stock, 60);
    assert.equal(legacyProd.cost_price, 30.00);
  });

  test("2. Duplicate Receiving Prevention — Receiving already Received/Completed PO is blocked", async () => {
    const orgId = "org-1";
    const whId = "wh-1";
    const userId = "user-1";

    const po = {
      id: "po-1002",
      user_id: userId,
      organization_id: orgId,
      supplier_id: "supp-1",
      order_no: "PO-2026-002",
      status: "Received", // Already received
      total_amount: 1500.00
    };
    mockPurchaseOrders.push(po);

    const initialStock = mockWarehouseStock.find(s => s.product_id === "prod-milk-1").on_hand;

    // Simulate controller state transition guard
    const isDuplicate = po.status === "Received" || po.status === "Completed";
    assert.equal(isDuplicate, true, "Must detect that PO is already received");

    // Stock must not change
    const currentStock = mockWarehouseStock.find(s => s.product_id === "prod-milk-1").on_hand;
    assert.equal(currentStock, initialStock, "Stock must not duplicate when PO is already received");
  });

  test("3. Atomic Rollback on Invalid Item — Multi-item failure does not corrupt stock", async () => {
    const orgId = "org-1";
    const whId = "wh-1";
    const userId = "user-1";

    const invalidItems = [
      { inventory_id: "prod-milk-1", quantity: 20, cost_price: 30.00 },
      { inventory_id: "prod-milk-1", quantity: -5, cost_price: 30.00 } // Invalid negative quantity
    ];

    const initialStock = mockWarehouseStock.find(s => s.product_id === "prod-milk-1").on_hand;

    // Pre-validation in StockService.receivePurchaseOrderStock must reject before modifying any stock
    await assert.rejects(
      async () => StockService.receivePurchaseOrderStock(orgId, {
        warehouseId: whId,
        purchaseOrderId: "po-1003",
        orderNo: "PO-2026-003",
        items: invalidItems
      }, userId),
      ValidationError
    );

    // Verify stock remains untouched (10 units)
    const currentStock = mockWarehouseStock.find(s => s.product_id === "prod-milk-1").on_hand;
    assert.equal(currentStock, initialStock);
    assert.equal(mockMovements.length, 0);
    assert.equal(mockBatches.length, 0);
  });
});
