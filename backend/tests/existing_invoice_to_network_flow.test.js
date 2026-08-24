import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as TradeController from "../src/controllers/TradeController.js";
import * as ImportController from "../src/controllers/ImportController.js";
import { StockRepository } from "../src/modules/inventory/repositories/StockRepository.js";
import { supabase } from "../src/config/db.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";

describe("Karobar Existing Sales Invoice to Business Network & Inventory Flow Tests", () => {
  let mockSales = [];
  let mockSaleItems = [];
  let mockUsers = [];
  let mockConnections = [];
  let mockTradeTransactions = [];
  let mockTradeTransactionItems = [];
  let mockPurchaseImports = [];
  let mockInventory = [];
  let mockWarehouseStock = [];
  let mockInventoryBatches = [];
  let mockInventoryMovements = [];
  let mockSupplierProductLinks = [];

  const sharmaUserId = "user-sharma-seller";
  const sharmaOrgId = "org-sharma-general-store";
  const vermaUserId = "user-verma-buyer";
  const vermaOrgId = "org-verma-wholesale";
  const unconnectedUserId = "user-stranger";

  const saleId1 = "sale-sharma-1001";
  const invoiceNo1 = "INV-2026-SHARMA-01";

  function applyFilters(tableName, filters) {
    let list = [];
    if (tableName === "sales") list = [...mockSales];
    if (tableName === "sale_items") list = [...mockSaleItems];
    if (tableName === "users") list = [...mockUsers];
    if (tableName === "business_connections") list = [...mockConnections];
    if (tableName === "trade_transactions") list = [...mockTradeTransactions];
    if (tableName === "trade_transaction_items") list = [...mockTradeTransactionItems];
    if (tableName === "purchase_imports") list = [...mockPurchaseImports];
    if (tableName === "inventory") list = [...mockInventory];
    if (tableName === "warehouse_stock") list = [...mockWarehouseStock];
    if (tableName === "inventory_batches") list = [...mockInventoryBatches];
    if (tableName === "inventory_movements") list = [...mockInventoryMovements];
    if (tableName === "supplier_product_links") list = [...mockSupplierProductLinks];

    for (const f of filters) {
      if (f.type === "eq") {
        list = list.filter(item => item[f.col] === f.val);
      } else if (f.type === "or") {
        if (tableName === "business_connections") {
          // Parse requester_id and receiver_id from condition
          const match1 = f.cond.match(/requester_id\.eq\.([^,]+),receiver_id\.eq\.([^)]+)/);
          if (match1) {
            const reqId = match1[1];
            const recId = match1[2];
            list = list.filter(c => 
              (c.requester_id === reqId && c.receiver_id === recId) ||
              (c.requester_id === recId && c.receiver_id === reqId)
            );
          }
        }
      }
    }
    return list;
  }

  function createQueryBuilder(tableName) {
    const filters = [];
    const builder = {
      select: () => builder,
      eq: (col, val) => {
        filters.push({ type: "eq", col, val });
        return builder;
      },
      or: (cond) => {
        filters.push({ type: "or", cond });
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      single: async () => {
        const results = applyFilters(tableName, filters);
        if (tableName === "sales" && results[0]) {
          const items = mockSaleItems.filter(si => si.sale_id === results[0].id);
          return { data: { ...results[0], sale_items: items }, error: null };
        }
        if (tableName === "purchase_imports" && results[0]) {
          const tx = mockTradeTransactions.find(t => t.id === results[0].transaction_id);
          return { data: { ...results[0], trade_transactions: tx || null }, error: null };
        }
        return { data: results[0] || null, error: results[0] ? null : { message: "Not found" } };
      },
      maybeSingle: async () => {
        const results = applyFilters(tableName, filters);
        return { data: results[0] || null, error: null };
      },
      then: (resolve) => {
        const results = applyFilters(tableName, filters);
        if (tableName === "sales") {
          const enriched = results.map(s => ({
            ...s,
            sale_items: mockSaleItems.filter(si => si.sale_id === s.id)
          }));
          return resolve({ data: enriched, error: null });
        }
        if (tableName === "trade_transactions") {
          const enriched = results.map(tx => ({
            ...tx,
            sender: mockUsers.find(u => u.id === tx.sender_id) || null,
            receiver: mockUsers.find(u => u.id === tx.receiver_id) || null
          }));
          return resolve({ data: enriched, error: null });
        }
        resolve({ data: results, error: null });
      }
    };
    return builder;
  }

  before(() => {
    supabase.from = (tableName) => {
      const qb = createQueryBuilder(tableName);
      return {
        select: (fields) => qb,
        insert: (payloads) => ({
          select: () => ({
            single: async () => {
              const row = { id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...(Array.isArray(payloads) ? payloads[0] : payloads) };
              if (tableName === "trade_transactions") mockTradeTransactions.push(row);
              if (tableName === "purchase_imports") mockPurchaseImports.push(row);
              if (tableName === "inventory") mockInventory.push(row);
              return { data: row, error: null };
            }
          }),
          then: (resolve) => {
            const list = Array.isArray(payloads) ? payloads : [payloads];
            for (const item of list) {
              const row = { id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...item };
              if (tableName === "trade_transaction_items") mockTradeTransactionItems.push(row);
              if (tableName === "trade_transactions") mockTradeTransactions.push(row);
            }
            resolve({ error: null });
          }
        }),
        update: (payload) => ({
          eq: (col, val) => ({
            select: () => ({
              single: async () => {
                let target = null;
                if (tableName === "trade_transactions") {
                  target = mockTradeTransactions.find(t => t[col] === val);
                  if (target) Object.assign(target, payload);
                }
                if (tableName === "purchase_imports") {
                  target = mockPurchaseImports.find(p => p[col] === val);
                  if (target) Object.assign(target, payload);
                }
                return { data: target, error: null };
              }
            }),
            then: (resolve) => {
              if (tableName === "purchase_imports") {
                mockPurchaseImports.forEach(p => { if (p[col] === val) Object.assign(p, payload); });
              }
              if (tableName === "trade_transactions") {
                mockTradeTransactions.forEach(t => { if (t[col] === val) Object.assign(t, payload); });
              }
              resolve({ error: null });
            }
          })
        }),
        delete: () => ({
          eq: (col, val) => ({
            then: (resolve) => {
              if (tableName === "trade_transactions") mockTradeTransactions = mockTradeTransactions.filter(t => t[col] !== val);
              resolve({ error: null });
            }
          })
        }),
        upsert: (payload) => ({
          then: (resolve) => {
            mockSupplierProductLinks.push(payload);
            resolve({ error: null });
          },
          catch: () => {}
        })
      };
    };

    // Admin Supabase Mock for Stock Engine
    adminSupabase.from = (tableName) => {
      return {
        insert: (payload) => ({
          select: () => ({
            single: async () => {
              const row = { id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...payload };
              if (tableName === "inventory_batches") mockInventoryBatches.push(row);
              return { data: row, error: null };
            }
          })
        })
      };
    };

    // Stock Repository Mocks
    StockRepository.lockWarehouseStock = async (orgId, warehouseId, productId, variantId) => {
      let stock = mockWarehouseStock.find(s => s.product_id === productId);
      if (!stock) {
        stock = {
          id: `whs-${productId}`,
          organization_id: orgId,
          warehouse_id: warehouseId,
          product_id: productId,
          variant_id: variantId,
          on_hand: 50,
          reserved: 0,
          available: 50
        };
        mockWarehouseStock.push(stock);
      }
      return { ...stock };
    };

    StockRepository.updateWarehouseStock = async (stockId, orgId, updates) => {
      const idx = mockWarehouseStock.findIndex(s => s.id === stockId);
      if (idx >= 0) {
        mockWarehouseStock[idx] = { ...mockWarehouseStock[idx], ...updates };
        return mockWarehouseStock[idx];
      }
      return null;
    };

    StockRepository.createMovement = async (payload) => {
      const mvt = { id: `mvt-${Date.now()}`, ...payload };
      mockInventoryMovements.push(mvt);
      return mvt;
    };
  });

  beforeEach(() => {
    mockUsers = [
      { id: sharmaUserId, business_name: "Sharma General Store", city: "New Delhi", phone: "9810012345" },
      { id: vermaUserId, business_name: "Verma Wholesale Traders", city: "Navi Mumbai", phone: "9820067890" }
    ];

    mockConnections = [
      {
        id: "conn-sharma-verma",
        requester_id: sharmaUserId,
        receiver_id: vermaUserId,
        connection_type: "Supplier",
        status: "accepted",
        trade_volume: 50000
      }
    ];

    mockSales = [
      {
        id: saleId1,
        user_id: sharmaUserId,
        organization_id: sharmaOrgId,
        invoice_no: invoiceNo1,
        date: "2026-08-20",
        total: 18500,
        payment_status: "paid",
        payment_method: "upi"
      }
    ];

    mockSaleItems = [
      {
        id: "si-1",
        sale_id: saleId1,
        product_id: "prod-basmati",
        quantity: 20,
        unit_price: 650,
        gst_rate: 5,
        total: 13650,
        products: { id: "prod-basmati", name: "Daawat Basmati Rice 5kg", sku: "DAAWAT-5KG", category: "Grocery", unit: "bag" }
      },
      {
        id: "si-2",
        sale_id: saleId1,
        product_id: "prod-oil",
        quantity: 10,
        unit_price: 461.9,
        gst_rate: 5,
        total: 4850,
        products: { id: "prod-oil", name: "Fortune Mustard Oil 5L", sku: "FORTUNE-5L", category: "Edible Oils", unit: "can" }
      }
    ];

    mockTradeTransactions = [];
    mockTradeTransactionItems = [];
    mockPurchaseImports = [];
    mockInventory = [];
    mockWarehouseStock = [];
    mockInventoryBatches = [];
    mockInventoryMovements = [];
    mockSupplierProductLinks = [];
  });

  test("1. Seller sends existing sale invoice to connected buyer via /api/network/trade/send-sale", async () => {
    const req = {
      user: { id: sharmaUserId, organization_id: sharmaOrgId },
      tenantId: sharmaOrgId,
      body: {
        sale_id: saleId1,
        receiver_id: vermaUserId,
        notes: "Urgent dispatch for Diwali stock"
      }
    };

    let statusCode = 200;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await TradeController.sendSaleTradeTransaction(req, res);

    assert.equal(statusCode, 201, "Transaction creation must return 201");
    assert.ok(responseData.success);
    assert.equal(mockTradeTransactions.length, 1, "Trade transaction must be created");
    const tx = mockTradeTransactions[0];
    assert.equal(tx.sender_id, sharmaUserId);
    assert.equal(tx.receiver_id, vermaUserId);
    assert.equal(tx.invoice_no, invoiceNo1);
    assert.equal(tx.total_amount, 18500);
    assert.equal(tx.status, "Pending");

    // Items check
    assert.equal(mockTradeTransactionItems.length, 2, "Both invoice items must be transferred");
    assert.equal(mockTradeTransactionItems[0].product_name, "Daawat Basmati Rice 5kg");
    assert.equal(mockTradeTransactionItems[0].quantity, 20);
    assert.equal(mockTradeTransactionItems[1].product_name, "Fortune Mustard Oil 5L");
    assert.equal(mockTradeTransactionItems[1].quantity, 10);
  });

  test("2. Idempotency Guard: Sending the same sale invoice to the same buyer twice returns 409 Conflict", async () => {
    // First send
    const req = {
      user: { id: sharmaUserId, organization_id: sharmaOrgId },
      tenantId: sharmaOrgId,
      body: { sale_id: saleId1, receiver_id: vermaUserId }
    };
    const res = { status: () => res, json: () => res };
    await TradeController.sendSaleTradeTransaction(req, res);

    // Second send
    let secondStatus = 200;
    let secondData = null;
    const res2 = {
      status: (code) => { secondStatus = code; return res2; },
      json: (data) => { secondData = data; return res2; }
    };
    await TradeController.sendSaleTradeTransaction(req, res2);

    assert.equal(secondStatus, 409, "Duplicate send must return 409 Conflict");
    assert.match(secondData.message || secondData.error || secondData.summary, /already been sent/i);
    assert.equal(mockTradeTransactions.length, 1, "Must not create duplicate transaction record");
  });

  test("3. Security Guard: Sending sale invoice to unconnected buyer returns 403 Forbidden", async () => {
    const req = {
      user: { id: sharmaUserId, organization_id: sharmaOrgId },
      tenantId: sharmaOrgId,
      body: { sale_id: saleId1, receiver_id: unconnectedUserId }
    };

    let statusCode = 200;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => data
    };

    await TradeController.sendSaleTradeTransaction(req, res);
    assert.equal(statusCode, 403, "Unconnected buyer send must return 403");
  });

  test("4. Security Guard: Attempting to send non-existent or foreign sale returns 404", async () => {
    const req = {
      user: { id: sharmaUserId, organization_id: sharmaOrgId },
      tenantId: sharmaOrgId,
      body: { sale_id: "sale-foreign-999", receiver_id: vermaUserId }
    };

    let statusCode = 200;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => data
    };

    await TradeController.sendSaleTradeTransaction(req, res);
    assert.equal(statusCode, 404);
  });

  test("5. Buyer (Verma) sees transmitted invoice in Trade Inbox and retrieves details", async () => {
    // Seed transaction
    mockTradeTransactions.push({
      id: "tx-sharma-verma-01",
      sender_id: sharmaUserId,
      receiver_id: vermaUserId,
      invoice_no: invoiceNo1,
      invoice_date: "2026-08-20",
      total_amount: 18500,
      tax_amount: 925,
      status: "Pending"
    });

    const req = {
      user: { id: vermaUserId, organization_id: vermaOrgId },
      query: {}
    };

    let responseData = null;
    const res = {
      status: () => res,
      json: (data) => { responseData = data; return res; }
    };

    await TradeController.getPurchaseInbox(req, res);

    assert.ok(responseData.success);
    const inbox = responseData.data;
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].invoice_no, invoiceNo1);
    assert.equal(inbox[0].total_amount, 18500);
  });

  test("6. Complete End-to-End: Buyer imports invoice into inventory using modern Stock Engine", async () => {
    // 1. Transaction & items
    const txId = "tx-e2e-01";
    mockTradeTransactions.push({
      id: txId,
      sender_id: sharmaUserId,
      receiver_id: vermaUserId,
      invoice_no: "INV-E2E-99",
      total_amount: 13000,
      status: "Pending"
    });
    mockTradeTransactionItems.push({
      id: "tti-1",
      transaction_id: txId,
      product_name: "Daawat Basmati Rice 5kg",
      sku: "DAAWAT-5KG",
      quantity: 20,
      purchase_price: 650,
      gst_percent: 5,
      unit: "bag",
      total: 13650
    });

    // 2. Draft Import
    const draftReq = {
      user: { id: vermaUserId, organization_id: vermaOrgId },
      body: { transaction_id: txId }
    };
    let draftData = null;
    const draftRes = {
      status: () => draftRes,
      json: (data) => { draftData = data; return draftRes; }
    };
    await ImportController.createImportDraft(draftReq, draftRes);

    assert.ok(draftData.success);
    const importId = draftData.data.import.id;

    // 3. Execute Import with 'create' product action
    const execReq = {
      user: { id: vermaUserId, organization_id: vermaOrgId },
      tenantId: vermaOrgId,
      body: {
        import_id: importId,
        items: [
          {
            trade_item_id: "tti-1",
            product_name: "Daawat Basmati Rice 5kg",
            sku: "DAAWAT-5KG",
            quantity: 20,
            purchase_price: 650,
            selling_price: 750,
            action: "create",
            category: "Grains",
            unit: "bag"
          }
        ]
      }
    };

    let execData = null;
    const execRes = {
      status: () => execRes,
      json: (data) => { execData = data; return execRes; }
    };

    await ImportController.executeImport(execReq, execRes);

    assert.ok(execData.success);
    assert.equal(execData.data.itemsCreated, 1);

    // 4. Verify modern Stock Engine balances
    assert.equal(mockInventory.length, 1, "Product must be created in buyer inventory");
    const createdProduct = mockInventory[0];
    assert.equal(createdProduct.name, "Daawat Basmati Rice 5kg");
    assert.equal(createdProduct.cost_price, 650);

    // Verify warehouse stock increased by 20 units (50 initial mock + 20 = 70)
    const stockRow = mockWarehouseStock.find(s => s.product_id === createdProduct.id);
    assert.ok(stockRow, "Warehouse stock row must exist");
    assert.equal(stockRow.on_hand, 70, "Stock on-hand must increase by 20");
    assert.equal(stockRow.available, 70);

    // Verify inventory batch created
    assert.equal(mockInventoryBatches.length, 1);
    assert.equal(mockInventoryBatches[0].stock, 20);
    assert.equal(mockInventoryBatches[0].purchase_cost, 650);

    // Verify inventory movement logged
    assert.equal(mockInventoryMovements.length, 1);
    assert.equal(mockInventoryMovements[0].movement_type, "purchase");
    assert.equal(mockInventoryMovements[0].quantity, 20);
    assert.equal(mockInventoryMovements[0].reference_type, "trade_transactions");

    // Verify transaction status updated to Imported
    const updatedTx = mockTradeTransactions.find(t => t.id === txId);
    assert.equal(updatedTx.status, "Imported");
  });

  test("7. Idempotency Guard: Re-importing already completed import returns 409 Conflict", async () => {
    const importId = "imp-completed-01";
    mockPurchaseImports.push({
      id: importId,
      buyer_id: vermaUserId,
      status: "Completed",
      transaction_id: "tx-comp-01"
    });

    const execReq = {
      user: { id: vermaUserId, organization_id: vermaOrgId },
      tenantId: vermaOrgId,
      body: {
        import_id: importId,
        items: [{ product_name: "Rice", quantity: 10, purchase_price: 100, action: "create" }]
      }
    };

    let statusCode = 200;
    const execRes = {
      status: (code) => { statusCode = code; return execRes; },
      json: (data) => data
    };

    await ImportController.executeImport(execReq, execRes);
    assert.equal(statusCode, 409, "Completed import execution must return 409");
  });
});
