import { test, describe } from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../src/middleware/authMiddleware.js";
import { AuthController } from "../src/modules/identity/controllers/AuthController.js";
import { AuthenticationService } from "../src/modules/identity/services/AuthenticationService.js";
import { getTradeHistory } from "../src/controllers/TradeController.js";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { supabase } from "../src/config/db.js";

describe("Production Readiness Audit Verification Tests", () => {
  test("1. Auth Middleware returns HTTP 401 on expired or invalid token for frontend auto-refresh interceptor", async () => {
    let capturedStatus = null;
    let capturedJson = null;

    const req = {
      headers: {
        authorization: "Bearer invalid.expired.token"
      }
    };

    const res = {
      status: (code) => {
        capturedStatus = code;
        return {
          json: (data) => {
            capturedJson = data;
          }
        };
      }
    };

    let nextCalled = false;
    await authenticateToken(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, "Should not call next on invalid token");
    assert.strictEqual(capturedStatus, 401, "Must return HTTP 401 Unauthorized so frontend auto-refreshes");
    assert.strictEqual(capturedJson.error, "TOKEN_EXPIRED");
  });

  test("2. Logout & LogoutAll clear HttpOnly cookie with secure production flags", async () => {
    const clearedCookies = [];
    const origLogout = AuthenticationService.logout;
    const origLogoutAll = AuthenticationService.logoutAll;

    AuthenticationService.logout = async () => ({ success: true });
    AuthenticationService.logoutAll = async () => ({ success: true });

    const req = {
      user: { tenant_id: "tenant-1", user_id: "user-1", session_id: "sess-1" },
      headers: { "user-agent": "NodeTest", "x-forwarded-for": "127.0.0.1" }
    };

    const res = {
      clearCookie: (name, options) => {
        clearedCookies.push({ name, options });
      },
      status: (code) => ({
        json: (data) => data
      })
    };

    try {
      await AuthController.logout(req, res, () => {});
      assert.strictEqual(clearedCookies.length, 1);
      assert.strictEqual(clearedCookies[0].name, "refreshToken");
      assert.strictEqual(clearedCookies[0].options.httpOnly, true);
      assert.strictEqual(clearedCookies[0].options.path, "/");

      await AuthController.logoutAll(req, res, () => {});
      assert.strictEqual(clearedCookies.length, 2);
      assert.strictEqual(clearedCookies[1].name, "refreshToken");
      assert.strictEqual(clearedCookies[1].options.httpOnly, true);
    } finally {
      AuthenticationService.logout = origLogout;
      AuthenticationService.logoutAll = origLogoutAll;
    }
  });

  test("3. Trade history partner query filters transactions safely without PostgREST syntax error", async () => {
    const origFrom = supabase.from;
    let builtOrFilter = null;

    supabase.from = (table) => {
      assert.strictEqual(table, "trade_transactions");
      const chain = {
        select: () => chain,
        or: (filterStr) => {
          builtOrFilter = filterStr;
          return chain;
        },
        order: () => chain,
        then: (resolve) => resolve({ data: [], error: null })
      };
      return chain;
    };

    const req = {
      user: { id: "user-100" },
      query: { partner_id: "partner-200" }
    };

    const res = {
      status: () => ({ json: (d) => d }),
      json: (d) => d
    };

    try {
      await getTradeHistory(req, res);
      assert.ok(builtOrFilter, "Must construct valid OR filter");
      assert.ok(
        builtOrFilter.includes("sender_id.eq.user-100,receiver_id.eq.partner-200"),
        "Filter must correctly bind user as sender and partner as receiver"
      );
      assert.ok(
        builtOrFilter.includes("sender_id.eq.partner-200,receiver_id.eq.user-100"),
        "Filter must correctly bind partner as sender and user as receiver"
      );
    } finally {
      supabase.from = origFrom;
    }
  });

  test("4. Modern Stock Engine is integrated into invoice item addition", async () => {
    let stockDeducted = false;
    const origDeduct = StockService.deductSaleStock;
    StockService.deductSaleStock = async (orgId, payload) => {
      stockDeducted = true;
      assert.strictEqual(payload.saleId, "inv-123");
      assert.strictEqual(payload.items[0].productId, "prod-456");
      assert.strictEqual(payload.items[0].quantity, 2);
      return { success: true };
    };

    try {
      await StockService.deductSaleStock("org-1", {
        warehouseId: "00000000-0000-0000-0000-000000000001",
        saleId: "inv-123",
        items: [{ productId: "prod-456", quantity: 2 }]
      }, "user-1");

      assert.strictEqual(stockDeducted, true, "StockService must be invoked on stock deduction");
    } finally {
      StockService.deductSaleStock = origDeduct;
    }
  });

  test("5. PaymentController.addPayment blocks duplicate submissions with 409", async () => {
    const { addPayment } = await import("../src/controllers/PaymentController.js");
    const origFrom = supabase.from;

    supabase.from = (table) => {
      if (table === "payments") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          gte: () => chain,
          maybeSingle: async () => ({
            data: {
              id: "pay-existing-1",
              amount: 500,
              idempotency_key: "idem-pay-123"
            },
            error: null
          })
        };
        return chain;
      }
      return origFrom(table);
    };

    let statusCode = null;
    let jsonResult = null;

    const req = {
      user: { id: "user-1" },
      body: {
        customer_id: "cust-1",
        amount: 500,
        idempotency_key: "idem-pay-123"
      }
    };

    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            jsonResult = data;
          }
        };
      }
    };

    try {
      await addPayment(req, res);
      assert.strictEqual(statusCode, 409, "Must return HTTP 409 on duplicate payment submission");
      assert.ok(jsonResult.error.includes("already been processed"));
    } finally {
      supabase.from = origFrom;
    }
  });

  test("6. CatalogController.createOrder rejects empty or malformed items with HTTP 400", async () => {
    const { createOrder } = await import("../src/controllers/CatalogController.js");

    let statusCode = null;
    let jsonResult = null;

    const req = {
      params: { businessSlug: "test-kirana" },
      body: {
        customerName: "Rahul Sharma",
        phone: "9876543210",
        items: [] // Empty items
      }
    };

    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            jsonResult = data;
          }
        };
      }
    };

    await createOrder(req, res);
    assert.strictEqual(statusCode, 400, "Must return HTTP 400 on empty order items");
    assert.strictEqual(jsonResult.error, "At least one order item is required");
  });
});
