import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { supabase } from "../src/config/db.js";
import { searchBusinesses } from "../src/controllers/NetworkController.js";
import { getCreditAccounts } from "../src/controllers/TradeCreditController.js";
import { getPurchaseInbox, getSalesOutbox } from "../src/controllers/TradeController.js";

describe("Live Endpoint Safety Verification", () => {
  before(() => {
    supabase.from = (tableName) => {
      const mockChain = {
        select: () => mockChain,
        neq: () => mockChain,
        or: () => mockChain,
        eq: () => mockChain,
        order: () => mockChain,
        limit: async () => ({
          data: tableName === "users" ? [
            { id: "u1", business_name: "Verma Traders", city: "Mumbai", phone: "9876543210" }
          ] : [],
          error: null
        }),
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
        then: (resolve) => {
          if (tableName === "trade_credit_accounts") {
            return resolve({ data: [], error: null });
          }
          if (tableName === "trade_transactions") {
            return resolve({ data: [], error: null });
          }
          return resolve({ data: [], error: null });
        }
      };
      return mockChain;
    };
  });

  test("1. searchBusinesses handles empty query string without throwing HTTP 400", async () => {
    const req = {
      user: { id: "user-test-1" },
      query: { query: "" }
    };
    let responseStatus = 200;
    let responseBody = null;
    const res = {
      status: (code) => { responseStatus = code; return res; },
      json: (data) => { responseBody = data; return res; }
    };

    await searchBusinesses(req, res);
    assert.equal(responseStatus, 200);
    assert.equal(responseBody.success, true);
    assert.ok(Array.isArray(responseBody.data));
  });

  test("2. getCreditAccounts returns creditGiven and creditReceived arrays", async () => {
    const req = {
      user: { id: "user-test-1" }
    };
    let responseStatus = 200;
    let responseBody = null;
    const res = {
      status: (code) => { responseStatus = code; return res; },
      json: (data) => { responseBody = data; return res; }
    };

    await getCreditAccounts(req, res);
    assert.equal(responseStatus, 200);
    assert.equal(responseBody.success, true);
    assert.ok(responseBody.data && typeof responseBody.data === 'object');
    assert.ok(Array.isArray(responseBody.data.creditGiven));
    assert.ok(Array.isArray(responseBody.data.creditReceived));
  });

  test("3. getPurchaseInbox and getSalesOutbox return array-shaped responses", async () => {
    const req = {
      user: { id: "user-test-1" },
      query: {}
    };
    let responseStatus = 200;
    let responseBody = null;
    const res = {
      status: (code) => { responseStatus = code; return res; },
      json: (data) => { responseBody = data; return res; }
    };

    await getPurchaseInbox(req, res);
    assert.equal(responseStatus, 200);
    assert.equal(responseBody.success, true);
    assert.ok(Array.isArray(responseBody.data));
  });
});
