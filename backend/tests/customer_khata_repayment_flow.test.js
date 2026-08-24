import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { recordCustomerPayment } from "../src/controllers/CustomerController.js";
import { supabase } from "../src/config/db.js";

// Mock Database State Arrays
let mockCustomers = [];
let mockSales = [];
let mockPayments = [];
let mockNotifications = [];

describe("Customer Khata Partial Repayment & FIFO Allocation Tests", () => {
  before(() => {
    // Mock Supabase client query builder
    const createQueryMock = (tableName) => {
      let filterId = null;
      let filterUserId = null;
      let filterCustId = null;
      let filterPaymentStatusNeq = null;
      let filterIdempotencyKey = null;
      let filterAmount = null;

      const builder = {
        select: (cols) => ({
          eq: (col, val) => {
            if (col === "id") filterId = val;
            if (col === "user_id") filterUserId = val;
            if (col === "customer_id") filterCustId = val;
            if (col === "idempotency_key") filterIdempotencyKey = val;
            if (col === "amount") filterAmount = val;
            return builder.select(cols);
          },
          neq: (col, val) => {
            if (col === "payment_status") filterPaymentStatusNeq = val;
            return builder.select(cols);
          },
          gte: () => builder.select(cols),
          order: () => builder.select(cols),
          maybeSingle: async () => {
            if (tableName === "customers") {
              const c = mockCustomers.find(x => (!filterId || x.id === filterId) && (!filterUserId || x.user_id === filterUserId));
              return { data: c ? { ...c } : null, error: null };
            }
            if (tableName === "payments") {
              const p = mockPayments.find(x => (!filterIdempotencyKey || x.idempotency_key === filterIdempotencyKey));
              return { data: p ? { ...p } : null, error: null };
            }
            return { data: null, error: null };
          },
          single: async () => {
            if (tableName === "customers") {
              const c = mockCustomers.find(x => (!filterId || x.id === filterId) && (!filterUserId || x.user_id === filterUserId));
              if (!c) return { data: null, error: { message: "Customer not found" } };
              return { data: { ...c }, error: null };
            }
            return { data: null, error: null };
          },
          then: (resolve) => {
            if (tableName === "sales") {
              let list = mockSales.filter(s =>
                (!filterCustId || s.customer_id === filterCustId) &&
                (!filterUserId || s.user_id === filterUserId) &&
                (!filterPaymentStatusNeq || s.payment_status !== filterPaymentStatusNeq)
              );
              // Sort by date ascending (FIFO)
              list.sort((a, b) => new Date(a.date) - new Date(b.date));
              return resolve({ data: list.map(item => ({ ...item })), error: null });
            }
            return resolve({ data: [], error: null });
          }
        }),
        insert: (data) => {
          const arr = Array.isArray(data) ? data : [data];
          const records = arr.map(item => ({
            id: item.id || `rec-${Math.floor(Math.random() * 1000000)}`,
            created_at: new Date().toISOString(),
            ...item
          }));
          if (tableName === "payments") mockPayments.push(...records);
          if (tableName === "notifications") mockNotifications.push(...records);

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
            if (tableName === "customers" && col === "id") {
              const c = mockCustomers.find(x => x.id === val);
              if (c) Object.assign(c, data);
            }
            if (tableName === "sales" && col === "id") {
              const s = mockSales.find(x => x.id === val);
              if (s) Object.assign(s, data);
            }
            return {
              eq: (col2, val2) => ({
                select: () => ({
                  single: async () => ({ data: mockCustomers.find(x => x.id === val) || data, error: null })
                }),
                single: async () => ({ data, error: null })
              }),
              select: () => ({
                single: async () => ({ data: mockCustomers.find(x => x.id === val) || data, error: null })
              }),
              single: async () => ({ data, error: null })
            };
          }
        })
      };
      return builder;
    };

    supabase.from = createQueryMock;
  });

  beforeEach(() => {
    mockCustomers = [
      {
        id: "cust-101",
        user_id: "user-1",
        name: "Vikram Malhotra",
        phone: "9876543210",
        outstanding_balance: 1000.00
      }
    ];

    mockSales = [
      {
        id: "sale-1",
        user_id: "user-1",
        customer_id: "cust-101",
        invoice_no: "INV-001",
        date: "2026-08-01T10:00:00.000Z",
        total: 600.00,
        amount_paid: 0.00,
        payment_status: "unpaid"
      },
      {
        id: "sale-2",
        user_id: "user-1",
        customer_id: "cust-101",
        invoice_no: "INV-002",
        date: "2026-08-10T10:00:00.000Z",
        total: 400.00,
        amount_paid: 0.00,
        payment_status: "unpaid"
      }
    ];

    mockPayments = [];
    mockNotifications = [];
  });

  test("1. Partial Repayment: Customer owes ₹1,000 -> pays ₹400 cash -> balance becomes ₹600 and oldest invoice partially paid", async () => {
    const req = {
      params: { id: "cust-101" },
      user: { id: "user-1" },
      body: {
        amount: 400.00,
        payment_method: "cash",
        reference: "Cash counter payment",
        idempotency_key: "IDEM-PAY-001"
      }
    };

    let responseStatus = null;
    let responseJson = null;
    const res = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseJson = data;
          }
        };
      }
    };

    await recordCustomerPayment(req, res);

    // 1. Verify 201 Created
    assert.strictEqual(responseStatus, 201);
    assert.strictEqual(responseJson.success, true);

    // 2. Verify Payment recorded
    assert.strictEqual(mockPayments.length, 1);
    assert.strictEqual(mockPayments[0].amount, 400.00);
    assert.strictEqual(mockPayments[0].payment_mode, "cash");

    // 3. Verify Customer Outstanding Balance reduced from ₹1,000 to ₹600
    const cust = mockCustomers.find(c => c.id === "cust-101");
    assert.strictEqual(cust.outstanding_balance, 600.00);
    assert.strictEqual(responseJson.customer.outstanding_balance, 600.00);

    // 4. Verify FIFO allocation on Sales
    // Oldest invoice (INV-001, total ₹600) receives all ₹400
    const inv1 = mockSales.find(s => s.id === "sale-1");
    assert.strictEqual(inv1.amount_paid, 400.00);
    assert.strictEqual(inv1.payment_status, "partial");

    // Newer invoice (INV-002, total ₹400) remains untouched
    const inv2 = mockSales.find(s => s.id === "sale-2");
    assert.strictEqual(inv2.amount_paid, 0.00);
    assert.strictEqual(inv2.payment_status, "unpaid");

    // 5. Verify Receipt payload
    assert.ok(responseJson.receipt);
    assert.strictEqual(responseJson.receipt.amountPaid, 400.00);
    assert.strictEqual(responseJson.receipt.remainingBalance, 600.00);
    assert.strictEqual(responseJson.receipt.previousBalance, 1000.00);
  });

  test("2. Full Repayment: Customer settles remaining ₹600 -> both invoices become 'paid' and balance = 0", async () => {
    // Start with partial payment from previous test
    mockCustomers[0].outstanding_balance = 600.00;
    mockSales[0].amount_paid = 400.00;
    mockSales[0].payment_status = "partial";

    const req = {
      params: { id: "cust-101" },
      user: { id: "user-1" },
      body: {
        amount: 600.00,
        payment_method: "upi",
        reference: "UPI/GPay/789123",
        idempotency_key: "IDEM-PAY-002"
      }
    };

    let responseStatus = null;
    let responseJson = null;
    const res = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseJson = data;
          }
        };
      }
    };

    await recordCustomerPayment(req, res);

    assert.strictEqual(responseStatus, 201);

    // Customer balance settled to ₹0
    const cust = mockCustomers.find(c => c.id === "cust-101");
    assert.strictEqual(cust.outstanding_balance, 0.00);

    // INV-001 (needs ₹200 more) becomes fully paid
    const inv1 = mockSales.find(s => s.id === "sale-1");
    assert.strictEqual(inv1.amount_paid, 600.00);
    assert.strictEqual(inv1.payment_status, "paid");

    // INV-002 (needs ₹400) becomes fully paid
    const inv2 = mockSales.find(s => s.id === "sale-2");
    assert.strictEqual(inv2.amount_paid, 400.00);
    assert.strictEqual(inv2.payment_status, "paid");
  });

  test("3. Duplicate Payment Prevention: Replaying same idempotency key returns 409 Conflict", async () => {
    const req = {
      params: { id: "cust-101" },
      user: { id: "user-1" },
      body: {
        amount: 400.00,
        payment_method: "cash",
        idempotency_key: "DUPLICATE-KEY-123"
      }
    };

    let responseStatus = null;
    const res = {
      status: (code) => {
        responseStatus = code;
        return { json: () => {} };
      }
    };

    // First payment succeeds
    await recordCustomerPayment(req, res);
    assert.strictEqual(responseStatus, 201);

    // Second payment with same idempotency key is blocked
    await recordCustomerPayment(req, res);
    assert.strictEqual(responseStatus, 409, "Duplicate payment must return 409 Conflict");
  });

  test("4. Validation: Payment exceeding outstanding balance or non-positive amount is rejected", async () => {
    // 1. Negative / 0 amount
    const reqZero = {
      params: { id: "cust-101" },
      user: { id: "user-1" },
      body: { amount: 0 }
    };
    let zeroStatus = null;
    await recordCustomerPayment(reqZero, {
      status: (code) => { zeroStatus = code; return { json: () => {} }; }
    });
    assert.strictEqual(zeroStatus, 400);

    // 2. Exceeding outstanding balance (owing ₹1,000, paying ₹1,500)
    const reqExcess = {
      params: { id: "cust-101" },
      user: { id: "user-1" },
      body: { amount: 1500.00 }
    };
    let excessStatus = null;
    await recordCustomerPayment(reqExcess, {
      status: (code) => { excessStatus = code; return { json: () => {} }; }
    });
    assert.strictEqual(excessStatus, 400);
  });
});
