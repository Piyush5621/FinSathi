import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { CacheService, FinancialCacheKeys, FinancialCacheService, setRedisClient } from "../src/utils/cache.js";
import { DashboardService } from "../src/services/DashboardService.js";
import { HealthScoreService } from "../src/services/HealthScoreService.js";
import { CashFlowService } from "../src/services/CashFlowService.js";
import { CreditRulesService } from "../src/services/CreditRulesService.js";
import { AnalyticsService } from "../src/services/AnalyticsService.js";
import { SalesService } from "../src/services/SalesService.js";
import { ExpenseService } from "../src/services/ExpenseService.js";
import { SalesRepository } from "../src/repositories/SalesRepository.js";
import { ExpenseRepository } from "../src/repositories/ExpenseRepository.js";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { supabase } from "../src/config/db.js";

describe("Financial Intelligence Redis Cache Invalidation Flow Tests", () => {
  const orgA = "org-alpha-111";
  const userA = "user-alpha-111";
  const orgB = "org-beta-222";
  const userB = "user-beta-222";

  beforeEach(async () => {
    // Reset caches before each test
    await CacheService.clearAll();
    setRedisClient(null); // Use memory cache mode by default
  });

  test("1. CacheService & FinancialCacheKeys tenant isolation", async () => {
    // Populate cache for Org A
    await FinancialCacheService.set(FinancialCacheKeys.dashboard(orgA), { revenue: 50000, org: "A" });
    await FinancialCacheService.set(FinancialCacheKeys.healthScore(orgA), { score: 85, org: "A" });
    await FinancialCacheService.set(FinancialCacheKeys.cashFlow(orgA), { projectedBalance: 120000, org: "A" });

    // Populate cache for Org B
    await FinancialCacheService.set(FinancialCacheKeys.dashboard(orgB), { revenue: 90000, org: "B" });
    await FinancialCacheService.set(FinancialCacheKeys.healthScore(orgB), { score: 92, org: "B" });
    await FinancialCacheService.set(FinancialCacheKeys.cashFlow(orgB), { projectedBalance: 300000, org: "B" });

    // Invalidate ONLY Org A
    await FinancialCacheService.invalidate(orgA, userA);

    // Verify Org A caches are completely purged
    const orgADash = await FinancialCacheService.get(FinancialCacheKeys.dashboard(orgA));
    const orgAHealth = await FinancialCacheService.get(FinancialCacheKeys.healthScore(orgA));
    const orgACash = await FinancialCacheService.get(FinancialCacheKeys.cashFlow(orgA));

    assert.strictEqual(orgADash, null, "Org A dashboard cache must be invalidated");
    assert.strictEqual(orgAHealth, null, "Org A health score cache must be invalidated");
    assert.strictEqual(orgACash, null, "Org A cash flow cache must be invalidated");

    // Verify Org B caches remain 100% intact and untouched
    const orgBDash = await FinancialCacheService.get(FinancialCacheKeys.dashboard(orgB));
    const orgBHealth = await FinancialCacheService.get(FinancialCacheKeys.healthScore(orgB));
    const orgBCash = await FinancialCacheService.get(FinancialCacheKeys.cashFlow(orgB));

    assert.deepStrictEqual(orgBDash, { revenue: 90000, org: "B" });
    assert.deepStrictEqual(orgBHealth, { score: 92, org: "B" });
    assert.deepStrictEqual(orgBCash, { projectedBalance: 300000, org: "B" });
  });

  test("2. POS Sale creates database mutation and invalidates financial caches for that organization", async () => {
    // Seed initial dashboard cache
    const initialDash = { metrics: { revenue: 10000 }, charts: {}, inventory: {}, recentSales: [] };
    await FinancialCacheService.set(FinancialCacheKeys.dashboard(orgA), initialDash);
    await FinancialCacheService.set(FinancialCacheKeys.healthScore(orgA), { score: 70 });
    await FinancialCacheService.set(FinancialCacheKeys.analyticsPnl(orgA), { revenue: 10000, expenses: 2000, profit: 8000 });

    // Mock SalesRepository and StockService for sale creation
    let dbCreated = false;
    const origCreate = SalesRepository.create;
    const origDeduct = StockService.deductSaleStock;
    SalesRepository.create = async (uId, payload) => {
      dbCreated = true;
      return { id: "sale-999", ...payload, organization_id: orgA, invoice_no: "INV-999", total: 1500, amount_paid: 1500, payment_status: "paid" };
    };
    StockService.deductSaleStock = async () => ({ success: true });

    try {
      await SalesService.createSale(userA, {
        customer_id: "cust-1",
        organization_id: orgA,
        total: 1500,
        subtotal: 1500,
        payment_status: "paid",
        items: [{ product_id: "prod-1", quantity: 1, price: 1500 }]
      });

      assert.strictEqual(dbCreated, true, "Database transaction must succeed");

      // Verify Org A financial caches are purged
      const cachedDash = await FinancialCacheService.get(FinancialCacheKeys.dashboard(orgA));
      const cachedHealth = await FinancialCacheService.get(FinancialCacheKeys.healthScore(orgA));
      const cachedPnl = await FinancialCacheService.get(FinancialCacheKeys.analyticsPnl(orgA));

      assert.strictEqual(cachedDash, null, "Dashboard cache should be purged after sale");
      assert.strictEqual(cachedHealth, null, "Health score cache should be purged after sale");
      assert.strictEqual(cachedPnl, null, "Analytics PnL cache should be purged after sale");
    } finally {
      SalesRepository.create = origCreate;
      StockService.deductSaleStock = origDeduct;
    }
  });

  test("3. Sales return mutation invalidates financial intelligence cache", async () => {
    await FinancialCacheService.set(FinancialCacheKeys.dashboard(orgA), { metrics: { revenue: 50000 } });
    await FinancialCacheService.set(FinancialCacheKeys.analyticsMetrics(orgA), { totalRevenue: 50000 });

    const origFindById = SalesRepository.findById;
    const origReturnStock = StockService.returnSaleStock;
    const origUpdate = SalesRepository.update;

    SalesRepository.findById = async () => ({
      id: "sale-101",
      organization_id: orgA,
      customer_id: "cust-1",
      total: 2000,
      amount_paid: 2000,
      payment_status: "paid",
      items: [{ productId: "prod-1", quantity: 2, price: 1000 }]
    });
    StockService.returnSaleStock = async () => ({ success: true });
    SalesRepository.update = async (uId, sId, payload) => ({ id: sId, ...payload });

    try {
      const returnResult = await SalesService.processSalesReturn(userA, {
        saleId: "sale-101",
        items: [{ productId: "prod-1", quantity: 1, price: 1000 }],
        refund_payment_mode: "cash",
        reason: "Customer preference"
      });

      assert.strictEqual(returnResult.success, true);

      // Verify caches are invalidated
      const cachedDash = await FinancialCacheService.get(FinancialCacheKeys.dashboard(orgA));
      const cachedMetrics = await FinancialCacheService.get(FinancialCacheKeys.analyticsMetrics(orgA));

      assert.strictEqual(cachedDash, null, "Dashboard cache must be invalidated after sales return");
      assert.strictEqual(cachedMetrics, null, "Analytics metrics cache must be invalidated after sales return");
    } finally {
      SalesRepository.findById = origFindById;
      StockService.returnSaleStock = origReturnStock;
      SalesRepository.update = origUpdate;
    }
  });

  test("4. Expense creation, update, and deletion invalidate financial cache", async () => {
    // Populate cache
    await FinancialCacheService.set(FinancialCacheKeys.cashFlow(orgA), { avgDailyExpense: 1000 });
    await FinancialCacheService.set(FinancialCacheKeys.analyticsPnl(orgA), { profit: 20000 });

    const origCreate = ExpenseRepository.create;
    const origUpdate = ExpenseRepository.update;
    const origDelete = ExpenseRepository.delete;

    ExpenseRepository.create = async (uId, p) => ({ id: "exp-1", user_id: uId, ...p });
    ExpenseRepository.update = async (uId, id, p) => ({ id, user_id: uId, ...p });
    ExpenseRepository.delete = async (uId, id) => ({ id });

    try {
      // 4a. Add Expense
      await ExpenseService.addExpense(userA, { category: "Rent", amount: 15000 }, orgA);
      assert.strictEqual(await FinancialCacheService.get(FinancialCacheKeys.cashFlow(orgA)), null);
      assert.strictEqual(await FinancialCacheService.get(FinancialCacheKeys.analyticsPnl(orgA)), null);

      // Repopulate
      await FinancialCacheService.set(FinancialCacheKeys.cashFlow(orgA), { avgDailyExpense: 1500 });
      await FinancialCacheService.set(FinancialCacheKeys.analyticsPnl(orgA), { profit: 5000 });

      // 4b. Update Expense
      await ExpenseService.updateExpense(userA, "exp-1", { amount: 18000 }, orgA);
      assert.strictEqual(await FinancialCacheService.get(FinancialCacheKeys.cashFlow(orgA)), null);
      assert.strictEqual(await FinancialCacheService.get(FinancialCacheKeys.analyticsPnl(orgA)), null);

      // Repopulate
      await FinancialCacheService.set(FinancialCacheKeys.cashFlow(orgA), { avgDailyExpense: 1800 });

      // 4c. Delete Expense
      await ExpenseService.deleteExpense(userA, "exp-1", orgA);
      assert.strictEqual(await FinancialCacheService.get(FinancialCacheKeys.cashFlow(orgA)), null);
    } finally {
      ExpenseRepository.create = origCreate;
      ExpenseRepository.update = origUpdate;
      ExpenseRepository.delete = origDelete;
    }
  });

  test("5. Failed database mutations do not incorrectly invalidate cache", async () => {
    const cachedDashData = { metrics: { revenue: 75000, profit: 25000 } };
    await FinancialCacheService.set(FinancialCacheKeys.dashboard(orgA), cachedDashData);

    const origCreate = SalesRepository.create;
    SalesRepository.create = async () => {
      throw new Error("Simulated Database Connection Loss");
    };

    try {
      await assert.rejects(
        async () => {
          await SalesService.createSale(userA, {
            organization_id: orgA,
            total: 5000,
            items: [{ product_id: "p-1", quantity: 1, price: 5000 }]
          });
        },
        /Simulated Database Connection Loss/
      );

      // Cache MUST still be intact because transaction failed
      const stillCached = await FinancialCacheService.get(FinancialCacheKeys.dashboard(orgA));
      assert.deepStrictEqual(stillCached, cachedDashData, "Cache must remain intact when transaction fails");
    } finally {
      SalesRepository.create = origCreate;
    }
  });

  test("6. Next request performs fresh calculation and refreshes cache", async () => {
    // Initial fetch from DashboardService
    const origFindAllSales = SalesRepository.findAllSales;
    const origFindExpenses = ExpenseRepository.findAll;
    const origGetRecent = SalesRepository.getRecentSales;

    let computeCount = 0;
    SalesRepository.findAllSales = async () => {
      computeCount++;
      return [{ id: "1", date: new Date().toISOString(), total: 1000, amount_paid: 1000, payment_status: "paid" }];
    };
    ExpenseRepository.findAll = async () => [];
    SalesRepository.getRecentSales = async () => [];

    try {
      // 1st request -> computes and caches
      const res1 = await DashboardService.getDashboardData(userA, orgA);
      assert.strictEqual(computeCount, 1, "Should compute on first request");
      assert.strictEqual(res1.metrics.revenue, 1000);

      // 2nd request -> serves from cache without recomputing
      const res2 = await DashboardService.getDashboardData(userA, orgA);
      assert.strictEqual(computeCount, 1, "Should hit cache without recomputing");
      assert.deepStrictEqual(res2, res1);

      // Invalidate Org A
      await FinancialCacheService.invalidate(orgA, userA);

      // 3rd request -> cache was cleared, must compute again
      const res3 = await DashboardService.getDashboardData(userA, orgA);
      assert.strictEqual(computeCount, 2, "Should recompute after cache invalidation");
      assert.deepStrictEqual(res3, res1);
    } finally {
      SalesRepository.findAllSales = origFindAllSales;
      ExpenseRepository.findAll = origFindExpenses;
      SalesRepository.getRecentSales = origGetRecent;
    }
  });

  test("7. Redis mock client keys and invalidation prefix support", async () => {
    const store = new Map();
    const mockRedis = {
      status: "ready",
      get: async (key) => store.get(key) || null,
      set: async (key, val) => { store.set(key, val); return "OK"; },
      del: async (...keys) => {
        let count = 0;
        for (const k of keys) {
          if (store.delete(k)) count++;
        }
        return count;
      },
      keys: async (pattern) => {
        const prefix = pattern.replace("*", "");
        const matched = [];
        for (const key of store.keys()) {
          if (key.startsWith(prefix)) matched.push(key);
        }
        return matched;
      }
    };

    setRedisClient(mockRedis);

    // Write to Redis via FinancialCacheService
    await FinancialCacheService.set(FinancialCacheKeys.dashboard("tenant-x"), { val: 123 });
    await FinancialCacheService.set(FinancialCacheKeys.healthScore("tenant-x"), { val: 456 });
    await FinancialCacheService.set(FinancialCacheKeys.dashboard("tenant-y"), { val: 789 });

    assert.strictEqual(store.size, 3);

    // Invalidate tenant-x
    await FinancialCacheService.invalidate("tenant-x");

    assert.strictEqual(await FinancialCacheService.get(FinancialCacheKeys.dashboard("tenant-x")), null);
    assert.strictEqual(await FinancialCacheService.get(FinancialCacheKeys.healthScore("tenant-x")), null);

    // tenant-y must still be in Redis
    const tenantY = await FinancialCacheService.get(FinancialCacheKeys.dashboard("tenant-y"));
    assert.deepStrictEqual(tenantY, { val: 789 });
  });
});
