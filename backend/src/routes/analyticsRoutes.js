import express from "express";
import {
  getSalesTrend,
  getTopCustomers,
  getDashboardSummary,
  getSalesSummary,
  getTopProducts,
  getBillingMetrics,
  getPnl
} from "../controllers/AnalyticsController.js";

const router = express.Router();

router.get("/sales-trend", getSalesTrend);
router.get("/top-customers", getTopCustomers);
router.get("/dashboard-summary", getDashboardSummary);
router.get("/sales-summary", getSalesSummary);
router.get("/top-products", getTopProducts);
router.get("/billing-metrics", getBillingMetrics);
router.get("/pnl", getPnl);

export default router;
