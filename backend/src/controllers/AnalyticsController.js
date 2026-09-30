import { AnalyticsService } from "../services/AnalyticsService.js";

/**
 * Enforces role-based access control for Executive Analytics.
 * Cashiers are restricted from viewing overall business profit, billing metrics,
 * sales summaries, and P&L statements.
 */
function ensureAnalyticsAccess(req, res) {
  const role = (req.user?.role || "").toLowerCase();
  if (role === "cashier") {
    res.status(403).json({
      error: "ACCESS_DENIED",
      message: "Access denied: Cashiers are not authorized to view executive analytics."
    });
    return false;
  }
  return true;
}

export const getSalesTrend = async (req, res) => {
  try {
    if (!ensureAnalyticsAccess(req, res)) return;
    const { month, startDate, endDate } = req.query;
    const trend = await AnalyticsService.getSalesTrend(req.user.id, month, startDate, endDate);
    res.json(trend);
  } catch (err) {
    console.error("getSalesTrend error:", err);
    res.status(500).json({ message: "Failed to fetch sales trend" });
  }
};

export const getTopCustomers = async (req, res) => {
  try {
    const { month, startDate, endDate, limit } = req.query;
    const customers = await AnalyticsService.getTopCustomers(req.user.id, month, startDate, endDate, limit);
    res.json(customers);
  } catch (err) {
    console.error("getTopCustomers error:", err);
    res.status(500).json({ message: "Failed to fetch top customers" });
  }
};

export const getDashboardSummary = async (req, res) => {
  try {
    if (!ensureAnalyticsAccess(req, res)) return;
    const orgId = req.tenantId || req.user?.organization_id || req.user?.id;
    const summary = await AnalyticsService.getDashboardSummary(req.user.id, orgId);
    res.json(summary);
  } catch (err) {
    console.error("getDashboardSummary error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
};

export const getSalesSummary = async (req, res) => {
  try {
    if (!ensureAnalyticsAccess(req, res)) return;
    const summary = await AnalyticsService.getSalesSummary(req.user.id);
    res.json(summary);
  } catch (err) {
    console.error("getSalesSummary error:", err);
    res.status(500).json({ message: "Failed to fetch sales summary" });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const { month, startDate, endDate, limit } = req.query;
    const result = await AnalyticsService.getTopProducts(req.user.id, month, startDate, endDate, limit);
    res.status(200).json(result);
  } catch (err) {
    console.error("getTopProducts error:", err.message || err);
    res.status(500).json({ message: err.message || "Analytics error" });
  }
};

export const getBillingMetrics = async (req, res) => {
  try {
    if (!ensureAnalyticsAccess(req, res)) return;
    const orgId = req.tenantId || req.user?.organization_id || req.user?.id;
    const metrics = await AnalyticsService.getBillingMetrics(req.user.id, orgId);
    res.json(metrics);
  } catch (err) {
    console.error('getBillingMetrics error:', err);
    res.status(500).json({ error: 'Failed to fetch billing metrics' });
  }
};

export const getPnl = async (req, res) => {
  try {
    if (!ensureAnalyticsAccess(req, res)) return;
    const orgId = req.tenantId || req.user?.organization_id || req.user?.id;
    const { startDate, endDate, store_id, storeId } = req.query;
    const options = {
      startDate: startDate || null,
      endDate: endDate || null,
      storeId: store_id || storeId || null
    };
    const pnl = await AnalyticsService.getPnl(req.user.id, orgId, options);
    res.json(pnl);
  } catch (err) {
    console.error('getPnl error:', err);
    res.status(500).json({ error: 'Failed to fetch P&L' });
  }
};
