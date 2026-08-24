import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { StockRepository } from "../src/modules/inventory/repositories/StockRepository.js";
import { ValidationError } from "../src/modules/masters/errors/appErrors.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";
import { supabase } from "../src/config/db.js";
import { executeImport } from "../src/controllers/ImportController.js";

// In-memory Database Mock Stores
let mockProducts = [];
let mockWarehouseStock = [];
let mockBatches = [];
let mockMovements = [];
let mockTradeTransactions = [];
let mockPurchaseImports = [];
let mockWarehouses = [];
let mockUsers = [];

describe("B2B Invoice Import & Modern Stock Engine Flow Tests", () => {
  before(() => {
    // 1. StockRepository Mock with row-level locks
    const whLocks = {};
    StockRepository.lockWarehouseStock = async (orgId, warehouseId, productId, variantId) => {
      const vId = variantId || null;
      const lockKey = `${orgId}:${warehouseId}:${productId}:${vId}`;

      while (whLocks[lockKey]) {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      whLocks[lockKey] = true;
      setTimeout(() => { whLocks[lockKey] = false; }, 50);

      let stock = mockWarehouseStock.find(
        (s) =>
          s.warehouse_id === warehouseId &&
          s.product_id === productId &&
          s.variant_id === vId &&
          s.organization_id === orgId
      );

      if (!stock) {
        stock = {
          id: `whs-${Math.random().toString(36).substring(2, 9)}`,
          organization_id: orgId,
          warehouse_id: warehouseId,
          product_id: productId,
          variant_id: vId,
          on_hand: 0.0,
          reserved: 0.0,
          available: 0.0,
          incoming: 0.0,
          outgoing: 0.0
        };
        mockWarehouseStock.push(stock);
      }
      return { ...stock };
    };

    StockRepository.updateWarehouseStock = async (id, orgId, updates) => {
      const idx = mockWarehouseStock.findIndex((s) => s.id === id && s.organization_id === orgId);
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
      const record = { id: `mvt-${Math.random().toString(36).substring(2, 9)}`, created_at: new Date().toISOString(), ...data };
      mockMovements.push(record);
      return record;
    };

    // 2. Query Builder Mock for adminSupabase & supabase
    const createQueryMock = (tableName) => {
      let filterId = null;
      let filterUserId = null;
      let filterBuyerId = null;
      let filterStatus = null;
      let filterOrgId = null;

      const builder = {
        select: (cols) => ({
          eq: (col, val) => {
            if (col === "id") filterId = val;
            if (col === "user_id") filterUserId = val;
            if (col === "buyer_id") filterBuyerId = val;
            if (col === "status") filterStatus = val;
            if (col === "organization_id") filterOrgId = val;
            return builder.select(cols);
          },
          or: () => builder.select(cols),
          order: () => builder.select(cols),
          limit: () => builder.select(cols),
          maybeSingle: async () => {
            if (tableName === "inventory") return { data: mockProducts.find((p) => p.id === filterId) || null, error: null };
            if (tableName === "warehouses") return { data: mockWarehouses.find((w) => (!filterOrgId || w.organization_id === filterOrgId)) || null, error: null };
            if (tableName === "purchase_imports") return { data: mockPurchaseImports.find((p) => p.id === filterId) || null, error: null };
            if (tableName === "trade_transactions") return { data: mockTradeTransactions.find((t) => t.id === filterId) || null, error: null };
            return { data: null, error: null };
          },
          single: async () => {
            if (tableName === "purchase_imports") {
              const imp = mockPurchaseImports.find((p) => p.id === filterId && (!filterBuyerId || p.buyer_id === filterBuyerId));
              if (imp) {
                const tx = mockTradeTransactions.find((t) => t.id === imp.transaction_id);
                return { data: { ...imp, trade_transactions: tx || null }, error: null };
              }
              return { data: null, error: new Error("Not found") };
            }
            if (tableName === "trade_transactions") {
              const tx = mockTradeTransactions.find((t) => t.id === filterId);
              return { data: tx || null, error: tx ? null : new Error("Not found") };
            }
            if (tableName === "inventory") {
              const p = mockProducts.find((x) => x.id === filterId);
              return { data: p || null, error: p ? null : new Error("Not found") };
            }
            if (tableName === "users") {
              const u = mockUsers.find((x) => x.id === filterId);
              return { data: u || { business_name: "Buyer Store" }, error: null };
            }
            return { data: null, error: null };
          }
        }),
        insert: (data) => {
          const arr = Array.isArray(data) ? data : [data];
          const records = arr.map((item) => ({
            id: item.id || `${tableName}-${Math.random().toString(36).substring(2, 9)}`,
            created_at: new Date().toISOString(),
            ...item
          }));

          if (tableName === "inventory") mockProducts.push(...records);
          if (tableName === "inventory_batches") mockBatches.push(...records);
          if (tableName === "purchase_imports") mockPurchaseImports.push(...records);
          if (tableName === "trade_transactions") mockTradeTransactions.push(...records);

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
              const p = mockProducts.find((x) => x.id === val);
              if (p) Object.assign(p, data);
            }
            if (tableName === "purchase_imports" && col === "id") {
              const imp = mockPurchaseImports.find((x) => x.id === val);
              if (imp) Object.assign(imp, data);
            }
            if (tableName === "trade_transactions" && col === "id") {
              const tx = mockTradeTransactions.find((x) => x.id === val);
              if (tx) Object.assign(tx, data);
            }
            return {
              select: () => ({
                single: async () => ({ data: data, error: null })
              }),
              single: async () => ({ data, error: null })
            };
          }
        }),
        upsert: async () => ({ error: null })
      };
      return builder;
    };

    adminSupabase.from = createQueryMock;
    supabase.from = createQueryMock;
  });

  beforeEach(() => {
    mockProducts = [
      { id: "prod-sugar-1", user_id: "buyer-user-1", name: "Madhur Pure Sugar 1kg", sku: "SUGAR-001", stock: 15, cost_price: 42.0, price: 50.0 }
    ];
    mockWarehouseStock = [
      { id: "whs-1", organization_id: "org-buyer-1", warehouse_id: "wh-buyer-1", product_id: "prod-sugar-1", variant_id: null, on_hand: 15, reserved: 0, available: 15 }
    ];
    mockBatches = [];
    mockMovements = [];
    mockTradeTransactions = [
      { id: "tx-b2b-101", invoice_no: "INV-B2B-2026", sender_id: "supplier-user-1", receiver_id: "buyer-user-1", status: "Accepted" }
    ];
    mockPurchaseImports = [
      { id: "imp-101", transaction_id: "tx-b2b-101", buyer_id: "buyer-user-1", status: "Draft" }
    ];
    mockWarehouses = [
      { id: "wh-buyer-1", organization_id: "org-buyer-1", user_id: "buyer-user-1", name: "Main Store Warehouse", is_main_hub: true, is_active: true }
    ];
    mockUsers = [
      { id: "buyer-user-1", business_name: "Sharma Kirana Store" },
      { id: "supplier-user-1", business_name: "Verma Wholesale Traders" }
    ];
  });

  test("1. B2B Invoice Import Flow — Matches existing product and creates new product via StockService", async () => {
    const req = {
      user: { id: "buyer-user-1", organization_id: "org-buyer-1" },
      tenantId: "org-buyer-1",
      body: {
        import_id: "imp-101",
        warehouse_id: "wh-buyer-1",
        items: [
          {
            trade_item_id: "trade-item-1",
            action: "match",
            inventory_id: "prod-sugar-1",
            product_name: "Madhur Pure Sugar 1kg",
            quantity: 25,
            purchase_price: 44.0,
            selling_price: 52.0,
            batch_name: "BATCH-SUGAR-2026",
            expiry_date: "2027-12-31"
          },
          {
            trade_item_id: "trade-item-2",
            action: "create",
            product_name: "Tata Salt 1kg",
            sku: "SALT-001",
            quantity: 30,
            purchase_price: 22.0,
            selling_price: 28.0,
            batch_name: "BATCH-SALT-2026",
            expiry_date: "2028-06-30"
          }
        ]
      }
    };

    let responseStatusCode = 200;
    let responseData = null;
    const res = {
      status: (code) => { responseStatusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await executeImport(req, res);

    assert.equal(responseStatusCode, 200);
    assert.equal(responseData.success, true);
    assert.equal(responseData.data.itemsCreated, 1);
    assert.equal(responseData.data.itemsMatched, 1);

    // 1. Verify warehouse_stock for matched product: 15 + 25 = 40
    const sugarStock = mockWarehouseStock.find((s) => s.product_id === "prod-sugar-1" && s.organization_id === "org-buyer-1");
    assert.ok(sugarStock);
    assert.equal(sugarStock.on_hand, 40, "Matched product warehouse_stock on_hand must increase from 15 to 40");
    assert.equal(sugarStock.available, 40, "Matched product warehouse_stock available must increase from 15 to 40");

    // 2. Verify warehouse_stock for created product: 0 + 30 = 30
    const createdSalt = mockProducts.find((p) => p.name === "Tata Salt 1kg");
    assert.ok(createdSalt);
    const saltStock = mockWarehouseStock.find((s) => s.product_id === createdSalt.id && s.organization_id === "org-buyer-1");
    assert.ok(saltStock);
    assert.equal(saltStock.on_hand, 30, "Created product warehouse_stock on_hand must be 30");
    assert.equal(saltStock.available, 30, "Created product warehouse_stock available must be 30");

    // 3. Verify inventory_batches created for both products
    assert.equal(mockBatches.length, 2);
    const sugarBatch = mockBatches.find((b) => b.product_id === "prod-sugar-1");
    assert.ok(sugarBatch);
    assert.equal(sugarBatch.stock, 25);
    assert.equal(sugarBatch.cost_price, 44.0);
    assert.equal(sugarBatch.selling_price, 52.0);
    assert.equal(sugarBatch.expiry_date, "2027-12-31");

    const saltBatch = mockBatches.find((b) => b.product_id === createdSalt.id);
    assert.ok(saltBatch);
    assert.equal(saltBatch.stock, 30);
    assert.equal(saltBatch.cost_price, 22.0);
    assert.equal(saltBatch.selling_price, 28.0);
    assert.equal(saltBatch.expiry_date, "2028-06-30");

    // 4. Verify immutable inventory_movements recorded
    assert.equal(mockMovements.length, 2);
    for (const mvt of mockMovements) {
      assert.equal(mvt.movement_type, "purchase");
      assert.equal(mvt.reference_type, "trade_transactions");
      assert.equal(mvt.reference_id, "tx-b2b-101");
      assert.ok(mvt.quantity > 0, "Movement quantity must be positive for inward purchase");
    }

    // 5. Verify import and transaction statuses updated
    const completedImport = mockPurchaseImports.find((i) => i.id === "imp-101");
    assert.equal(completedImport.status, "Completed");

    const completedTx = mockTradeTransactions.find((t) => t.id === "tx-b2b-101");
    assert.equal(completedTx.status, "Imported");
  });

  test("2. Idempotency Protection — Retrying an already Completed import fails with 409 Conflict", async () => {
    // Mark import as Completed
    const imp = mockPurchaseImports.find((i) => i.id === "imp-101");
    imp.status = "Completed";

    const initialSugarStock = mockWarehouseStock.find((s) => s.product_id === "prod-sugar-1").on_hand;

    const req = {
      user: { id: "buyer-user-1", organization_id: "org-buyer-1" },
      tenantId: "org-buyer-1",
      body: {
        import_id: "imp-101",
        warehouse_id: "wh-buyer-1",
        items: [
          {
            action: "match",
            inventory_id: "prod-sugar-1",
            quantity: 50,
            purchase_price: 44.0
          }
        ]
      }
    };

    let responseStatusCode = 200;
    let responseData = null;
    const res = {
      status: (code) => { responseStatusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await executeImport(req, res);

    assert.equal(responseStatusCode, 409, "Must return HTTP 409 Conflict on repeated import");
    assert.match(responseData.message || responseData.error, /already been imported/i);

    // Stock must not be duplicated
    const currentSugarStock = mockWarehouseStock.find((s) => s.product_id === "prod-sugar-1").on_hand;
    assert.equal(currentSugarStock, initialSugarStock, "Stock must remain unchanged when retry is rejected");
  });

  test("3. Atomic Rollback on Validation Failure — Invalid quantity fails before any stock modifications", async () => {
    const invalidItems = [
      {
        productId: "prod-sugar-1",
        quantity: -10, // Invalid quantity
        purchase_cost: 44.0
      }
    ];

    const initialSugarStock = mockWarehouseStock.find((s) => s.product_id === "prod-sugar-1").on_hand;

    await assert.rejects(
      async () => StockService.receiveTradeImportStock("org-buyer-1", {
        warehouseId: "wh-buyer-1",
        transactionId: "tx-b2b-101",
        importId: "imp-101",
        invoiceNo: "INV-B2B-2026",
        items: invalidItems
      }, "buyer-user-1"),
      ValidationError
    );

    // Stock must remain unchanged
    const currentSugarStock = mockWarehouseStock.find((s) => s.product_id === "prod-sugar-1").on_hand;
    assert.equal(currentSugarStock, initialSugarStock);
    assert.equal(mockMovements.length, 0);
  });

  test("4. Multi-Tenant Isolation — Organization A import cannot affect Organization B stock", async () => {
    // Org B stock
    mockWarehouseStock.push({
      id: "whs-org-b",
      organization_id: "org-buyer-2",
      warehouse_id: "wh-buyer-2",
      product_id: "prod-sugar-1",
      variant_id: null,
      on_hand: 100,
      reserved: 0,
      available: 100
    });

    const itemsToStock = [
      {
        productId: "prod-sugar-1",
        quantity: 20,
        purchase_cost: 40.0
      }
    ];

    // Receive for Org A
    await StockService.receiveTradeImportStock("org-buyer-1", {
      warehouseId: "wh-buyer-1",
      transactionId: "tx-b2b-101",
      importId: "imp-101",
      invoiceNo: "INV-B2B-2026",
      items: itemsToStock
    }, "buyer-user-1");

    // Org A stock updated (15 + 20 = 35)
    const orgAStock = mockWarehouseStock.find((s) => s.product_id === "prod-sugar-1" && s.organization_id === "org-buyer-1");
    assert.equal(orgAStock.on_hand, 35);

    // Org B stock remains 100
    const orgBStock = mockWarehouseStock.find((s) => s.product_id === "prod-sugar-1" && s.organization_id === "org-buyer-2");
    assert.equal(orgBStock.on_hand, 100, "Org B stock must remain completely unaffected by Org A import");
  });
});
