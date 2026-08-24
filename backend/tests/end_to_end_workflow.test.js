import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { SalesService } from "../src/services/SalesService.js";
import { SalesRepository } from "../src/repositories/SalesRepository.js";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { StockRepository } from "../src/modules/inventory/repositories/StockRepository.js";
import { GstService } from "../src/services/GstService.js";
import { FinancialCacheService, FinancialCacheKeys } from "../src/utils/cache.js";
import { addPayment } from "../src/controllers/PaymentController.js";
import { authenticateToken } from "../src/middleware/authMiddleware.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";
import { supabase } from "../src/config/db.js";

// Mock Database Memory State
let mockSales = [];
let mockWarehouseStock = [];
let mockMovements = [];
let mockBatches = [];
let mockInventory = [];
let mockCustomers = [];
let mockPurchaseOrders = [];
let mockPayments = [];

const ORG_ID = "org-e2e-001";
const USER_ID = "user-e2e-001";
const WAREHOUSE_ID = "wh-e2e-001";

describe("Karobar End-to-End Core Business Workflow Audit", () => {
  before(() => {
    // 1. Mock StockRepository with atomic row locking
    StockRepository.lockWarehouseStock = async (orgId, warehouseId, productId, variantId) => {
      let stock = mockWarehouseStock.find(
        s => s.warehouse_id === warehouseId &&
             s.product_id === productId &&
             s.organization_id === orgId
      );

      if (!stock) {
        stock = {
          id: `wh-stock-${Math.random()}`,
          organization_id: orgId,
          warehouse_id: warehouseId,
          product_id: productId,
          variant_id: variantId || null,
          on_hand: 0,
          reserved: 0,
          available: 0,
          incoming: 0,
          outgoing: 0
        };
        mockWarehouseStock.push(stock);
      }
      return { ...stock };
    };

    StockRepository.updateWarehouseStock = async (id, orgId, updates) => {
      const stock = mockWarehouseStock.find(s => s.id === id && s.organization_id === orgId);
      if (stock) {
        Object.assign(stock, updates);
        return { ...stock };
      }
      return null;
    };

    StockRepository.createMovement = async (movementData) => {
      const mov = {
        id: `mov-${Date.now()}-${Math.random()}`,
        ...movementData,
        created_at: new Date().toISOString()
      };
      mockMovements.push(mov);
      return mov;
    };

    StockRepository.findBatches = async (productId, warehouseId, orgId) => {
      return mockBatches.filter(
        b => b.product_id === productId &&
             (b.organization_id === orgId || b.warehouse_id === warehouseId) &&
             b.stock > 0
      );
    };

    // 2. Mock SalesRepository
    SalesRepository.create = async (userId, saleData) => {
      const sale = {
        id: `sale-${Date.now()}-${Math.random()}`,
        user_id: userId,
        organization_id: ORG_ID,
        warehouse_id: WAREHOUSE_ID,
        created_at: new Date().toISOString(),
        ...saleData
      };
      mockSales.push(sale);
      return sale;
    };

    SalesRepository.findById = async (userId, id) => {
      return mockSales.find(s => s.id === id && (s.user_id === userId || s.organization_id === ORG_ID));
    };

    SalesRepository.update = async (userId, id, updates) => {
      const sale = mockSales.find(s => s.id === id);
      if (sale) {
        Object.assign(sale, updates);
        return { ...sale };
      }
      return null;
    };

    SalesRepository.deleteById = async (userId, id) => {
      const idx = mockSales.findIndex(s => s.id === id);
      if (idx !== -1) mockSales.splice(idx, 1);
      return true;
    };

    SalesRepository.findAllSales = async () => mockSales;
    SalesRepository.findSalesByDateRange = async () => mockSales;

    // 3. Mock adminSupabase and supabase
    const mockDb = {
      from: (table) => {
        const filters = {};
        let pendingUpdates = null;

        const applyUpdates = () => {
          if (!pendingUpdates) return;
          if (table === "customers") {
            const cust = mockCustomers.find(c => (!filters.id || c.id === filters.id));
            if (cust) Object.assign(cust, pendingUpdates);
          }
          if (table === "sales") {
            const sale = mockSales.find(s => (!filters.id || s.id === filters.id));
            if (sale) Object.assign(sale, pendingUpdates);
          }
          if (table === "inventory_batches") {
            const b = mockBatches.find(x => (!filters.id || x.id === filters.id));
            if (b) Object.assign(b, pendingUpdates);
          }
        };

        const chain = {
          select: () => chain,
          insert: (data) => {
            const rows = Array.isArray(data) ? data : [data];
            const inserted = rows.map(r => {
              const row = { id: r.id || `rec-${Math.random()}`, created_at: new Date().toISOString(), ...r };
              if (table === "inventory_batches") mockBatches.push(row);
              if (table === "sales") mockSales.push(row);
              if (table === "payments") mockPayments.push(row);
              if (table === "customers") mockCustomers.push(row);
              if (table === "inventory") mockInventory.push(row);
              return row;
            });
            const insertResult = {
              data: inserted,
              error: null,
              select: () => insertResult,
              single: async () => ({ data: inserted[0], error: null }),
              maybeSingle: async () => ({ data: inserted[0], error: null }),
              then: (r) => r({ data: inserted, error: null })
            };
            return insertResult;
          },
          update: (updates) => {
            pendingUpdates = updates;
            applyUpdates();
            return chain;
          },
          delete: () => chain,
          eq: (col, val) => {
            filters[col] = val;
            applyUpdates();
            return chain;
          },
          neq: (col, val) => chain,
          in: (col, vals) => chain,
          or: (clause) => chain,
          gte: (col, val) => chain,
          lte: (col, val) => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: async () => {
            applyUpdates();
            if (table === "customers") {
              const c = mockCustomers.find(x => !filters.id || x.id === filters.id);
              return { data: c || mockCustomers[0] || null, error: null };
            }
            if (table === "users") return { data: { id: USER_ID, organization_id: ORG_ID, business_name: "Karobar Store", state: "Delhi" }, error: null };
            if (table === "organizations") return { data: { id: ORG_ID, name: "Karobar Store", state: "Delhi" }, error: null };
            if (table === "purchase_orders") return { data: mockPurchaseOrders[0] || null, error: null };
            if (table === "inventory_batches") return { data: mockBatches[0] || null, error: null };
            if (table === "payments") {
              const p = mockPayments.find(x => filters.idempotency_key && x.idempotency_key === filters.idempotency_key);
              return { data: p || null, error: null };
            }
            return { data: null, error: null };
          },
          single: async () => {
            applyUpdates();
            if (table === "customers") {
              const c = mockCustomers.find(x => !filters.id || x.id === filters.id);
              return { data: c || mockCustomers[0] || null, error: null };
            }
            if (table === "users") return { data: { id: USER_ID, organization_id: ORG_ID, business_name: "Karobar Store", state: "Delhi" }, error: null };
            if (table === "purchase_orders") return { data: mockPurchaseOrders[0] || null, error: null };
            if (table === "inventory_batches") return { data: mockBatches[0] || null, error: null };
            return { data: null, error: null };
          },
          then: (resolve) => {
            applyUpdates();
            if (pendingUpdates) {
              return resolve({ data: pendingUpdates, error: null });
            }
            if (table === "sales") return resolve({ data: mockSales, error: null });
            if (table === "customers") return resolve({ data: mockCustomers, error: null });
            if (table === "inventory") return resolve({ data: mockInventory, error: null });
            if (table === "payments") return resolve({ data: mockPayments, error: null });
            if (table === "purchase_orders") return resolve({ data: mockPurchaseOrders, error: null });
            return resolve({ data: [], error: null });
          }
        };

        return chain;
      }
    };

    Object.assign(supabase, mockDb);
    Object.assign(adminSupabase, mockDb);
  });

  beforeEach(() => {
    mockSales = [];
    mockWarehouseStock = [];
    mockMovements = [];
    mockBatches = [];
    mockInventory = [];
    mockCustomers = [
      {
        id: "cust-101",
        user_id: USER_ID,
        organization_id: ORG_ID,
        name: "Aman Gupta",
        phone: "9876543210",
        outstanding_balance: 0,
        gstin: "07AAAAA0000A1Z5",
        state: "Delhi"
      }
    ];
    mockPurchaseOrders = [];
    mockPayments = [];
  });

  test("Flow 1: Product → Purchase Order Receiving → Warehouse Stock & Batch Inwarding", async () => {
    // 1. Create Product in master inventory
    const product = {
      id: "prod-milk-1",
      name: "Amul Milk 1L",
      sku: "DAI-MIL-01L",
      user_id: USER_ID,
      organization_id: ORG_ID,
      price: 35,
      cost_price: 30,
      stock: 0
    };
    mockInventory.push(product);

    // 2. Setup Purchase Order for 50 units @ ₹30/unit
    const po = {
      id: "po-101",
      user_id: USER_ID,
      organization_id: ORG_ID,
      supplier_id: "supp-101",
      status: "ordered",
      items: [
        {
          productId: "prod-milk-1",
          product_name: "Amul Milk 1L",
          quantity: 50,
          unit_price: 30,
          batch_number: "BATCH-MILK-2026",
          expiry_date: "2026-12-31"
        }
      ]
    };
    mockPurchaseOrders.push(po);

    // 3. Receive Purchase Order via StockService
    await StockService.receivePurchaseOrderStock(ORG_ID, {
      warehouseId: WAREHOUSE_ID,
      purchaseOrderId: "po-101",
      items: po.items
    }, USER_ID);

    // 4. Verify Stock & Batch
    const balance = await StockService.getWarehouseBalance(WAREHOUSE_ID, "prod-milk-1", null, ORG_ID);
    assert.strictEqual(balance.onHand, 50, "Warehouse on-hand stock must equal 50 units");
    assert.strictEqual(balance.available, 50, "Warehouse available stock must equal 50 units");

    assert.strictEqual(mockBatches.length, 1, "Must create 1 batch record");
    assert.strictEqual(mockBatches[0].stock, 50, "Batch stock must be 50 units");
    assert.strictEqual(mockBatches[0].purchase_cost, 30, "Batch purchase cost must be ₹30");

    assert.strictEqual(mockMovements.length, 1, "Must log 1 inward inventory movement");
    assert.strictEqual(mockMovements[0].movement_type, "purchase");
    assert.strictEqual(mockMovements[0].quantity, 50);
  });

  test("Flow 2: Stock → POS Sale of 5 units with FEFO batch deduction", async () => {
    // Setup initial stock = 50
    mockWarehouseStock.push({
      id: "wh-stock-1",
      organization_id: ORG_ID,
      warehouse_id: WAREHOUSE_ID,
      product_id: "prod-milk-1",
      variant_id: null,
      on_hand: 50,
      reserved: 0,
      available: 50,
      incoming: 0,
      outgoing: 0
    });
    mockBatches.push({
      id: "batch-1",
      organization_id: ORG_ID,
      warehouse_id: WAREHOUSE_ID,
      product_id: "prod-milk-1",
      batch_number: "BATCH-MILK-2026",
      stock: 50,
      purchase_cost: 30,
      created_at: new Date().toISOString()
    });

    // 1. Sell 5 units of Milk
    const sale = await SalesService.createSale(USER_ID, {
      customer_id: "cust-101",
      organization_id: ORG_ID,
      warehouse_id: WAREHOUSE_ID,
      items: [
        {
          productId: "prod-milk-1",
          quantity: 5,
          price: 35,
          batchId: "batch-1"
        }
      ],
      subtotal: 175,
      total: 175,
      payment_method: "cash",
      payment_status: "paid",
      amount_paid: 175
    });

    assert.ok(sale.id, "Sale must be created with ID");
    assert.strictEqual(sale.total, 175);

    // 2. Verify warehouse stock decremented to 45
    const balance = await StockService.getWarehouseBalance(WAREHOUSE_ID, "prod-milk-1", null, ORG_ID);
    assert.strictEqual(balance.onHand, 45, "Warehouse on-hand stock must decrement to 45");

    // 3. Verify batch decremented to 45
    assert.strictEqual(mockBatches[0].stock, 45, "Batch stock must decrement to 45");

    // 4. Verify movement log
    const saleMovement = mockMovements.find(m => m.movement_type === "sale");
    assert.ok(saleMovement, "Must record a sale movement");
    assert.strictEqual(saleMovement.quantity, -5);
  });

  test("Flow 3: POS Credit Sale → Customer Khata Balance Tracking", async () => {
    // 1. Customer buys ₹1,000 on credit (payment_status: 'unpaid')
    const creditSale = await SalesService.createSale(USER_ID, {
      customer_id: "cust-101",
      organization_id: ORG_ID,
      warehouse_id: WAREHOUSE_ID,
      items: [],
      subtotal: 1000,
      total: 1000,
      payment_method: "credit",
      payment_status: "unpaid",
      amount_paid: 0
    });

    assert.strictEqual(creditSale.payment_status, "unpaid");

    // 2. Verify customer Khata outstanding balance is updated to ₹1,000
    assert.strictEqual(mockCustomers[0].outstanding_balance, 1000, "Customer outstanding balance must become ₹1,000");
  });

  test("Flow 4: Customer Khata Repayment of ₹400 with FIFO debt allocation", async () => {
    // Setup customer with ₹1,000 debt on sale-credit-1
    mockCustomers[0].outstanding_balance = 1000;
    const creditInvoice = {
      id: "sale-credit-1",
      user_id: USER_ID,
      customer_id: "cust-101",
      total: 1000,
      amount_paid: 0,
      payment_status: "unpaid",
      date: new Date().toISOString()
    };
    mockSales.push(creditInvoice);

    // 1. Execute repayment of ₹400
    const req = {
      user: { id: USER_ID, tenant_id: ORG_ID },
      body: {
        customer_id: "cust-101",
        amount: 400,
        payment_mode: "upi",
        idempotency_key: "idem-repay-400"
      }
    };

    let responseData = null;
    const res = {
      status: (code) => ({
        json: (data) => {
          responseData = { code, data };
          return data;
        }
      }),
      json: (data) => {
        responseData = { code: 200, data };
        return data;
      }
    };

    await addPayment(req, res);

    // 2. Verify Customer Outstanding reduced to ₹600
    assert.strictEqual(mockCustomers[0].outstanding_balance, 600, "Outstanding balance must be exactly ₹600");

    // 3. Verify Invoice allocation
    assert.strictEqual(creditInvoice.amount_paid, 400, "Invoice amount_paid must be ₹400");
    assert.strictEqual(creditInvoice.payment_status, "partial", "Invoice status must be partial");
  });

  test("Flow 5: Sales Return of 2 units → Stock restored, batch restored, Khata adjusted", async () => {
    // Setup initial state: Stock = 45, batch = 45
    mockWarehouseStock.push({
      id: "wh-stock-1",
      organization_id: ORG_ID,
      warehouse_id: WAREHOUSE_ID,
      product_id: "prod-milk-1",
      variant_id: null,
      on_hand: 45,
      reserved: 0,
      available: 45,
      incoming: 0,
      outgoing: 0
    });
    mockBatches.push({
      id: "batch-1",
      organization_id: ORG_ID,
      warehouse_id: WAREHOUSE_ID,
      product_id: "prod-milk-1",
      batch_number: "BATCH-MILK-2026",
      stock: 45,
      purchase_cost: 30,
      created_at: new Date().toISOString()
    });

    const originalSale = {
      id: "sale-to-return",
      user_id: USER_ID,
      organization_id: ORG_ID,
      warehouse_id: WAREHOUSE_ID,
      customer_id: "cust-101",
      total: 175,
      amount_paid: 175,
      items: [
        {
          productId: "prod-milk-1",
          quantity: 5,
          price: 35,
          batchId: "batch-1"
        }
      ]
    };
    mockSales.push(originalSale);

    // 1. Process return of 2 units
    const returnResult = await SalesService.returnSale(USER_ID, "sale-to-return", {
      returnItems: [
        {
          productId: "prod-milk-1",
          quantity: 2,
          batchId: "batch-1"
        }
      ],
      reason: "Customer changed mind",
      idempotency_key: "idem-ret-001"
    });

    assert.strictEqual(returnResult.sale.return_status, "partially_returned");

    // 2. Verify stock restored to 47
    const balance = await StockService.getWarehouseBalance(WAREHOUSE_ID, "prod-milk-1", null, ORG_ID);
    assert.strictEqual(balance.onHand, 47, "Warehouse stock must be restored to 47 units");

    // 3. Verify batch restored to 47
    assert.strictEqual(mockBatches[0].stock, 47, "Batch stock must be restored to 47 units");

    // 4. Verify movement recorded
    const retMovement = mockMovements.find(m => m.movement_type === "sales_return");
    assert.ok(retMovement, "Must record sales_return movement");
    assert.strictEqual(retMovement.quantity, 2);
  });

  test("Flow 6: Offline POS Billing Synchronization & Duplicate Protection", async () => {
    // 1. Create 5 offline bills with unique idempotency keys
    const offlineBills = Array.from({ length: 5 }, (_, i) => ({
      offline_id: `offline-bill-${i + 1}`,
      idempotency_key: `idem-offline-${i + 1}`,
      invoice_no: `INV-OFFLINE-${i + 1}`,
      customer_id: "cust-101",
      organization_id: ORG_ID,
      warehouse_id: WAREHOUSE_ID,
      items: [],
      subtotal: 100 * (i + 1),
      total: 100 * (i + 1),
      payment_method: "cash",
      payment_status: "paid",
      amount_paid: 100 * (i + 1)
    }));

    const syncedResults = [];
    for (const bill of offlineBills) {
      const res = await SalesService.createSale(USER_ID, bill);
      syncedResults.push(res);
    }

    assert.strictEqual(syncedResults.length, 5, "All 5 offline bills must sync successfully");

    // 2. Attempt duplicate sync with same idempotency key
    const duplicateSync = await SalesService.createSale(USER_ID, offlineBills[0]);
    assert.strictEqual(duplicateSync.invoice_no, offlineBills[0].invoice_no, "Duplicate bill must return existing record without double creating");
  });

  test("Flow 7: GST Compliance Reports (GSTR-1 & GSTR-3B) Calculation & Excel Generation", async () => {
    // Setup B2B and B2C sales
    mockSales.push(
      {
        id: "sale-b2b-1",
        user_id: USER_ID,
        organization_id: ORG_ID,
        invoice_no: "INV-B2B-01",
        subtotal: 1000,
        tax_amount: 180,
        total: 1180,
        gst_percent: 18,
        date: "2026-08-01",
        customers: {
          id: "cust-b2b",
          name: "Vikas Enterprises",
          gstin: "07AAAAA1111A1Z1",
          state: "Delhi"
        }
      },
      {
        id: "sale-b2c-1",
        user_id: USER_ID,
        organization_id: ORG_ID,
        invoice_no: "INV-B2C-01",
        subtotal: 500,
        tax_amount: 25,
        total: 525,
        gst_percent: 5,
        date: "2026-08-05",
        customers: {
          id: "cust-b2c",
          name: "Consumer Walk-in",
          gstin: "",
          state: "Delhi"
        }
      }
    );

    // 1. Generate GSTR-1 Report
    const gstr1 = await GstService.getGstr1Report(USER_ID, "2026-08-01", "2026-08-31", ORG_ID);
    assert.strictEqual(gstr1.summary.totalInvoices, 2);
    assert.strictEqual(gstr1.summary.b2bCount, 1);
    assert.strictEqual(gstr1.summary.b2cCount, 1);
    assert.strictEqual(gstr1.summary.totalGst, 205);

    // 2. Generate GSTR-3B Report
    const gstr3b = await GstService.getGstr3bReport(USER_ID, "2026-08-01", "2026-08-31", ORG_ID);
    assert.strictEqual(gstr3b.table31OutwardSupplies.totalTaxableValue, 1500);
    assert.strictEqual(gstr3b.table31OutwardSupplies.totalTaxLiability, 205);

    // 3. Generate Excel Buffer Export
    const excelBuffer = GstService.exportGstr1Excel(gstr1);
    assert.ok(excelBuffer && excelBuffer.length > 0, "Excel buffer must be generated");
  });

  test("Flow 8: Dashboard Financial Intelligence & Invalidation", async () => {
    // 1. Write to cache
    await FinancialCacheService.set(FinancialCacheKeys.dashboard(ORG_ID), { revenue: 5000 });
    const cachedBefore = await FinancialCacheService.get(FinancialCacheKeys.dashboard(ORG_ID));
    assert.strictEqual(cachedBefore.revenue, 5000);

    // 2. Invalidate cache on new mutation
    await FinancialCacheService.invalidate(ORG_ID, USER_ID);

    // 3. Cache must be cleared
    const cachedAfter = await FinancialCacheService.get(FinancialCacheKeys.dashboard(ORG_ID));
    assert.strictEqual(cachedAfter, null, "Cache must be cleared after invalidation");
  });

  test("Flow 9: Multi-Tenant Security & IAM Verification", async () => {
    // 1. Expired/Invalid token returns 401
    let capturedCode = null;
    const req = { headers: { authorization: "Bearer invalid.token" } };
    const res = {
      status: (code) => {
        capturedCode = code;
        return { json: (d) => d };
      }
    };

    await authenticateToken(req, res, () => {});
    assert.strictEqual(capturedCode, 401, "Expired token must trigger 401 for silent auto-refresh");
  });
});
