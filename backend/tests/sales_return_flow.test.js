import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { StockRepository } from "../src/modules/inventory/repositories/StockRepository.js";
import { SalesService } from "../src/services/SalesService.js";
import { SalesRepository } from "../src/repositories/SalesRepository.js";
import { ValidationError } from "../src/modules/masters/errors/appErrors.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";
import { supabase } from "../src/config/db.js";

// Mock Database State Arrays
let mockProducts = [];
let mockWarehouseStock = [];
let mockBatches = [];
let mockMovements = [];
let mockSales = [];
let mockCustomers = [];

describe("Sales Return & Stock Restoration Flow Tests", () => {
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

    // 2. Mock SalesRepository
    SalesRepository.findById = async (userId, id) => {
      const sale = mockSales.find(s => s.id === id);
      return sale ? { ...sale } : null;
    };

    SalesRepository.update = async (userId, id, updates) => {
      const idx = mockSales.findIndex(s => s.id === id);
      if (idx !== -1) {
        mockSales[idx] = { ...mockSales[idx], ...updates };
        return { ...mockSales[idx] };
      }
      return null;
    };

    // 3. Mock query builders for adminSupabase & supabase
    const createQueryMock = (tableName) => {
      let filterId = null;
      let filterOrg = null;

      const builder = {
        select: (cols) => ({
          eq: (col, val) => {
            if (col === "id") filterId = val;
            if (col === "organization_id") filterOrg = val;
            return builder.select(cols);
          },
          or: () => builder.select(cols),
          order: () => builder.select(cols),
          limit: () => builder.select(cols),
          maybeSingle: async () => {
            if (tableName === "inventory") return { data: mockProducts.find(p => p.id === filterId) || null, error: null };
            if (tableName === "inventory_batches") return { data: mockBatches.find(b => b.id === filterId) || null, error: null };
            if (tableName === "customers") return { data: mockCustomers.find(c => c.id === filterId) || null, error: null };
            if (tableName === "users") return { data: { organization_id: "org-1" }, error: null };
            return { data: null, error: null };
          },
          single: async () => builder.select(cols).maybeSingle()
        }),
        update: (data) => ({
          eq: (col, val) => {
            if (tableName === "inventory_batches" && col === "id") {
              const b = mockBatches.find(x => x.id === val);
              if (b) Object.assign(b, data);
            }
            if (tableName === "inventory" && col === "id") {
              const p = mockProducts.find(x => x.id === val);
              if (p) Object.assign(p, data);
            }
            if (tableName === "customers" && col === "id") {
              const c = mockCustomers.find(x => x.id === val);
              if (c) Object.assign(c, data);
            }
            return {
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
      { id: "prod-biscuits-1", name: "Parle-G 250g", sku: "PARLE-250", stock: 6, cost_price: 20.00, price: 25.00 }
    ];

    mockBatches = [
      { id: "batch-b1", product_id: "prod-biscuits-1", batch_number: "BATCH-PG-01", stock: 6, cost_price: 20.00 }
    ];

    mockWarehouseStock = [
      { id: "whs-1", organization_id: "org-1", warehouse_id: "wh-1", product_id: "prod-biscuits-1", variant_id: null, on_hand: 6, reserved: 0, available: 6 }
    ];

    mockMovements = [];

    mockSales = [
      {
        id: "sale-101",
        user_id: "user-1",
        organization_id: "org-1",
        warehouse_id: "wh-1",
        invoice_no: "INV-2026-901",
        total: 100.00,
        amount_paid: 100.00,
        payment_status: "paid",
        items: [
          {
            id: "prod-biscuits-1",
            productId: "prod-biscuits-1",
            variantId: null,
            name: "Parle-G 250g",
            quantity: 4, // 4 units sold originally
            price: 25.00,
            cost_price: 20.00,
            batchId: "batch-b1"
          }
        ],
        returns: []
      }
    ];

    mockCustomers = [
      { id: "cust-1", name: "Rahul Verma", outstanding_balance: 0.00 }
    ];
  });

  test("1. Partial Return: 10 initial stock -> sold 4 (stock 6) -> return 2 units -> stock becomes 8, batch restored, movement logged", async () => {
    const userId = "user-1";
    const saleId = "sale-101";

    const returnPayload = {
      items: [
        {
          productId: "prod-biscuits-1",
          quantity: 2, // Returning 2 units
          batchId: "batch-b1"
        }
      ],
      reason: "Defective packaging",
      refund_payment_mode: "cash",
      idempotency_key: "RET-KEY-001"
    };

    const res = await SalesService.returnSale(userId, saleId, returnPayload);

    // 1. Verify response
    assert.strictEqual(res.success, true);
    assert.ok(res.returnRecord);
    assert.strictEqual(res.returnRecord.total_refund_amount, 50.00); // 2 * ₹25 = ₹50
    assert.strictEqual(res.sale.return_status, "partially_returned");

    // 2. Verify warehouse_stock balance increased from 6 to 8 (+2)
    const stock = mockWarehouseStock.find(s => s.product_id === "prod-biscuits-1");
    assert.strictEqual(stock.on_hand, 8);
    assert.strictEqual(stock.available, 8);

    // 3. Verify batch stock increased from 6 to 8 (+2)
    const batch = mockBatches.find(b => b.id === "batch-b1");
    assert.strictEqual(batch.stock, 8);

    // 4. Verify immutable inventory_movements record created
    assert.strictEqual(mockMovements.length, 1);
    const mvt = mockMovements[0];
    assert.strictEqual(mvt.product_id, "prod-biscuits-1");
    assert.strictEqual(mvt.quantity, 2, "Movement quantity must be positive (+2) for sales_return");
    assert.strictEqual(mvt.movement_type, "sales_return");
    assert.strictEqual(mvt.reference_type, "sales_returns");
    assert.strictEqual(mvt.batch_id, "batch-b1");

    // 5. Verify legacy product stock updated (6 -> 8)
    const legacyProd = mockProducts.find(p => p.id === "prod-biscuits-1");
    assert.strictEqual(legacyProd.stock, 8);
  });

  test("2. Over-Return Prevention: Attempting to return 3 units when only 2 remain returnable is blocked", async () => {
    const userId = "user-1";
    const saleId = "sale-101";

    // First return: 2 units
    await SalesService.returnSale(userId, saleId, {
      items: [{ productId: "prod-biscuits-1", quantity: 2 }],
      idempotency_key: "RET-KEY-001"
    });

    // Stock is now 8. Sold was 4. 2 were returned, so 2 returnable remain.
    // Second return: Attempt to return 3 units (2 + 3 = 5 > 4 sold)
    await assert.rejects(
      async () => SalesService.returnSale(userId, saleId, {
        items: [{ productId: "prod-biscuits-1", quantity: 3 }],
        idempotency_key: "RET-KEY-002"
      }),
      /Cannot return 3 units.*Only 2 remaining/
    );

    // Verify stock remains 8 (no over-restock occurred)
    const stock = mockWarehouseStock.find(s => s.product_id === "prod-biscuits-1");
    assert.strictEqual(stock.on_hand, 8);
  });

  test("3. Full Return: Returning remaining 2 units marks sale as 'fully_returned' and restores stock to 10", async () => {
    const userId = "user-1";
    const saleId = "sale-101";

    // First return: 2 units
    await SalesService.returnSale(userId, saleId, {
      items: [{ productId: "prod-biscuits-1", quantity: 2 }],
      idempotency_key: "RET-KEY-001"
    });

    // Second return: remaining 2 units
    const res = await SalesService.returnSale(userId, saleId, {
      items: [{ productId: "prod-biscuits-1", quantity: 2 }],
      idempotency_key: "RET-KEY-002"
    });

    assert.strictEqual(res.sale.return_status, "fully_returned");

    // Stock fully restored to initial 10 units
    const stock = mockWarehouseStock.find(s => s.product_id === "prod-biscuits-1");
    assert.strictEqual(stock.on_hand, 10);
    assert.strictEqual(stock.available, 10);
  });

  test("4. Duplicate Return Prevention: Repeating return request with same idempotency key returns 409 and does not double-restock", async () => {
    const userId = "user-1";
    const saleId = "sale-101";

    const payload = {
      items: [{ productId: "prod-biscuits-1", quantity: 2 }],
      idempotency_key: "IDEM-SAME-001"
    };

    // First submission succeeds
    await SalesService.returnSale(userId, saleId, payload);
    const stockAfterFirst = mockWarehouseStock.find(s => s.product_id === "prod-biscuits-1").on_hand;
    assert.strictEqual(stockAfterFirst, 8);

    // Second submission with identical key throws 409
    await assert.rejects(
      async () => SalesService.returnSale(userId, saleId, payload),
      /already been processed/
    );

    // Stock must remain 8 (not incremented to 10)
    const stockAfterSecond = mockWarehouseStock.find(s => s.product_id === "prod-biscuits-1").on_hand;
    assert.strictEqual(stockAfterSecond, 8);
  });

  test("5. Input Validation: Invalid quantity (<= 0) or foreign product rejected", async () => {
    const userId = "user-1";
    const saleId = "sale-101";

    // 1. Zero quantity
    await assert.rejects(
      async () => SalesService.returnSale(userId, saleId, {
        items: [{ productId: "prod-biscuits-1", quantity: 0 }]
      }),
      /Return quantity must be greater than zero/
    );

    // 2. Foreign product not on invoice
    await assert.rejects(
      async () => SalesService.returnSale(userId, saleId, {
        items: [{ productId: "prod-random-999", quantity: 1 }]
      }),
      /does not belong to this sale/
    );
  });
});
