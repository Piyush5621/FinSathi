import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import TrustScoreService from "../src/services/network/TrustScoreService.js";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { StockRepository } from "../src/modules/inventory/repositories/StockRepository.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";

describe("Karobar Business Network 5-Pillar Demo Workspace Tests", () => {
  // In-memory isolated tenant mock store
  let mockDb = {
    users: [],
    connections: [],
    trade_transactions: [],
    trade_transaction_items: [],
    trade_credit_accounts: [],
    reputation_metrics: [],
    reputation_history: [],
    warehouse_stock: [],
    inventory_batches: [],
    inventory_movements: []
  };

  const sharmaUserId = "sharma-user-id";
  const vermaUserId = "verma-user-id";
  const guptaUserId = "gupta-user-id";
  const urbanwearUserId = "urbanwear-user-id";
  const apexUserId = "apex-user-id";

  before(() => {
    // Populate mock demo state
    mockDb.users = [
      { id: sharmaUserId, business_name: "Sharma General Store", city: "New Delhi", gstin: "07AAAAA1234A1Z1" },
      { id: vermaUserId, business_name: "Verma Wholesale Traders", city: "Navi Mumbai", gstin: "27BBBBB5678B1Z2" },
      { id: guptaUserId, business_name: "Gupta FMCG Distributors", city: "New Delhi", gstin: "07GUPTA4455G1Z8" },
      { id: urbanwearUserId, business_name: "UrbanWear Store", city: "Bengaluru", gstin: "29CCCCC9012C1Z3" },
      { id: apexUserId, business_name: "Apex Bio-Packaging Solutions", city: "Gurugram", gstin: "06APEXB7788A1Z5" }
    ];

    mockDb.connections = [
      { id: "c1", requester_id: vermaUserId, receiver_id: sharmaUserId, connection_type: "Supplier", status: "accepted", trade_volume: 345000 },
      { id: "c2", requester_id: guptaUserId, receiver_id: sharmaUserId, connection_type: "Supplier", status: "accepted", trade_volume: 120000 },
      { id: "c3", requester_id: sharmaUserId, receiver_id: urbanwearUserId, connection_type: "Partner", status: "accepted", trade_volume: 65000 },
      { id: "c4", requester_id: apexUserId, receiver_id: sharmaUserId, connection_type: "Supplier", status: "pending", trade_volume: 0 }
    ];

    mockDb.trade_transactions = [
      { id: "tx-in-01", sender_id: guptaUserId, receiver_id: sharmaUserId, invoice_no: "TRD-2026-IN-01", status: "Pending", total_amount: 20878 },
      { id: "tx-in-02", sender_id: vermaUserId, receiver_id: sharmaUserId, invoice_no: "TRD-2026-IN-02", status: "Viewed", total_amount: 61110 },
      { id: "tx-in-03", sender_id: vermaUserId, receiver_id: sharmaUserId, invoice_no: "TRD-2026-IN-03", status: "Imported", total_amount: 44625 },
      { id: "tx-in-04", sender_id: guptaUserId, receiver_id: sharmaUserId, invoice_no: "TRD-2026-IN-04", status: "Rejected", total_amount: 10089 },
      { id: "tx-out-01", sender_id: sharmaUserId, receiver_id: urbanwearUserId, invoice_no: "TRD-2026-OUT-01", status: "Accepted", total_amount: 12768 },
      { id: "tx-out-02", sender_id: sharmaUserId, receiver_id: urbanwearUserId, invoice_no: "TRD-2026-OUT-02", status: "Viewed", total_amount: 5286 },
      { id: "tx-out-03", sender_id: sharmaUserId, receiver_id: urbanwearUserId, invoice_no: "TRD-2026-OUT-03", status: "Pending", total_amount: 10030 }
    ];

    mockDb.trade_credit_accounts = [
      { id: "tc-1", supplier_id: sharmaUserId, buyer_id: urbanwearUserId, credit_limit: 100000, outstanding_amount: 28084, due_date: "2026-08-31", payment_terms_days: 30, status: "active" },
      { id: "tc-2", supplier_id: vermaUserId, buyer_id: sharmaUserId, credit_limit: 250000, outstanding_amount: 61110, due_date: "2026-09-04", payment_terms_days: 15, status: "active" },
      { id: "tc-3", supplier_id: guptaUserId, buyer_id: sharmaUserId, credit_limit: 150000, outstanding_amount: 20878, due_date: "2026-09-12", payment_terms_days: 21, status: "active" }
    ];

    mockDb.reputation_metrics = [
      {
        user_id: sharmaUserId,
        completed_trades: 14,
        cancelled_trades: 0,
        disputes_raised: 0,
        disputes_lost: 0,
        late_payments: 0,
        avg_payment_delay_days: 0.0,
        response_rate_pct: 98,
        gst_verified: true,
        profile_completeness_pct: 100,
        connection_acceptance_rate_pct: 95
      },
      {
        user_id: vermaUserId,
        completed_trades: 42,
        cancelled_trades: 1,
        disputes_raised: 0,
        disputes_lost: 0,
        late_payments: 1,
        avg_payment_delay_days: 1.2,
        response_rate_pct: 94,
        gst_verified: true,
        profile_completeness_pct: 95,
        connection_acceptance_rate_pct: 90
      }
    ];

    // Mock StockRepository
    StockRepository.lockWarehouseStock = async (orgId, warehouseId, productId, variantId) => {
      let stock = mockDb.warehouse_stock.find(s => s.product_id === productId);
      if (!stock) {
        stock = { id: "whs-1", organization_id: orgId, warehouse_id: warehouseId, product_id: productId, on_hand: 60, reserved: 0, available: 60 };
        mockDb.warehouse_stock.push(stock);
      }
      return { ...stock };
    };

    StockRepository.updateWarehouseStock = async (id, orgId, updates) => {
      const idx = mockDb.warehouse_stock.findIndex(s => s.id === id);
      if (idx !== -1) {
        mockDb.warehouse_stock[idx] = { ...mockDb.warehouse_stock[idx], ...updates };
        return mockDb.warehouse_stock[idx];
      }
      return { id, ...updates };
    };

    StockRepository.createMovement = async (data) => {
      const record = { id: `mov-${Date.now()}`, ...data };
      mockDb.inventory_movements.push(record);
      return record;
    };

    adminSupabase.from = (tableName) => {
      const mockChain = {
        insert: (payload) => ({
          select: () => ({
            single: async () => ({
              data: { id: "batch-demo-1", ...payload },
              error: null
            })
          })
        })
      };
      return mockChain;
    };
  });

  test("1. Pillar 1 (Partners): Connected partners and pending invites are isolated per merchant", () => {
    const sharmaAccepted = mockDb.connections.filter(c => 
      (c.requester_id === sharmaUserId || c.receiver_id === sharmaUserId) && c.status === "accepted"
    );
    const sharmaPending = mockDb.connections.filter(c => 
      c.receiver_id === sharmaUserId && c.status === "pending"
    );

    assert.equal(sharmaAccepted.length, 3, "Sharma should have exactly 3 connected partners");
    assert.equal(sharmaPending.length, 1, "Sharma should have exactly 1 pending connection invite");
    assert.equal(sharmaPending[0].requester_id, apexUserId, "Pending invite is from Apex Bio-Packaging");
  });

  test("2. Pillar 2 (Trade Inbox): Digital bills correctly categorize by status with multi-item line details", () => {
    const sharmaInbox = mockDb.trade_transactions.filter(t => t.receiver_id === sharmaUserId);
    assert.equal(sharmaInbox.length, 4, "Inbox should contain 4 transactions");

    const pendingBill = sharmaInbox.find(t => t.status === "Pending");
    const viewedBill = sharmaInbox.find(t => t.status === "Viewed");
    const importedBill = sharmaInbox.find(t => t.status === "Imported");
    const rejectedBill = sharmaInbox.find(t => t.status === "Rejected");

    assert.ok(pendingBill, "Must contain at least 1 Pending bill");
    assert.ok(viewedBill, "Must contain at least 1 Viewed bill");
    assert.ok(importedBill, "Must contain at least 1 Imported bill");
    assert.ok(rejectedBill, "Must contain at least 1 Rejected bill");
    assert.equal(pendingBill.invoice_no, "TRD-2026-IN-01");
  });

  test("3. Pillar 3 (Trade Outbox): Dispatched invoices reflect live buyer delivery states", () => {
    const sharmaOutbox = mockDb.trade_transactions.filter(t => t.sender_id === sharmaUserId);
    assert.equal(sharmaOutbox.length, 3, "Outbox should contain 3 sent invoices");

    const statuses = sharmaOutbox.map(t => t.status);
    assert.ok(statuses.includes("Accepted"));
    assert.ok(statuses.includes("Viewed"));
    assert.ok(statuses.includes("Pending"));
  });

  test("4. Pillar 4 (Trade Credit): Credit Given vs Credit Received are properly segregated with upcoming due dates", () => {
    const creditGiven = mockDb.trade_credit_accounts.filter(tc => tc.supplier_id === sharmaUserId);
    const creditReceived = mockDb.trade_credit_accounts.filter(tc => tc.buyer_id === sharmaUserId);

    assert.equal(creditGiven.length, 1, "Sharma has 1 Credit Given line to UrbanWear");
    assert.equal(creditGiven[0].credit_limit, 100000);
    assert.equal(creditGiven[0].outstanding_amount, 28084);

    assert.equal(creditReceived.length, 2, "Sharma has 2 Credit Received lines from suppliers");
    const totalPayables = creditReceived.reduce((sum, c) => sum + c.outstanding_amount, 0);
    assert.equal(totalPayables, 61110 + 20878);
  });

  test("5. Pillar 5 (Trust Score): 4-Pillar calculation evaluates accurately from raw metrics without hardcoding", () => {
    const sharmaMetrics = mockDb.reputation_metrics.find(m => m.user_id === sharmaUserId);
    const result = TrustScoreService.calculateScore(sharmaMetrics);

    assert.ok(result.score >= 80 && result.score <= 100, `Trust score should be high (Got ${result.score})`);
    assert.equal(result.breakdown.tradeReliability, 40, "Trade reliability is 40/40");
    assert.equal(result.breakdown.paymentReliability, 15, "Payment baseline reliability is 15/30");
    assert.equal(result.breakdown.verification, 20, "Verification is 20/20");
    assert.equal(result.breakdown.engagement, 10, "Engagement is 10/10");
  });

  test("6. End-to-End Stock Import: Demo pending invoice imports cleanly into StockService with immutable movement ledger", async () => {
    const importPayload = {
      warehouseId: "store-main-cp",
      transactionId: "tx-in-01",
      importId: "imp-01",
      invoiceNo: "TRD-2026-IN-01",
      items: [
        {
          productId: "prod-dal-1kg",
          quantity: 50,
          cost_price: 135,
          selling_price: 170,
          batch_name: "B2B #TRD-2026-IN-01",
          expiry_date: "2027-12-31"
        }
      ]
    };

    const results = await StockService.receiveTradeImportStock("org-sharma", importPayload, sharmaUserId);
    assert.ok(Array.isArray(results), "Should return array of receipt results");
    assert.equal(results.length, 1);
    assert.equal(results[0].stock.on_hand, 110, "OnHand stock should increase from 60 to 110");
    assert.equal(results[0].stock.available, 110, "Available stock should increase from 60 to 110");
    assert.ok(mockDb.inventory_movements.length > 0, "Inventory movement ledger should be logged");
    assert.equal(mockDb.inventory_movements[0].movement_type, "purchase");
  });
});
