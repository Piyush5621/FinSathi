import express from "express";
import { getWeeklySales, getAllSales, createSale, deleteSale, getSummary, getTrend, updateSale } from "../controllers/SalesController.js";
import { planGuard } from "../middleware/planGuard.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { saleSchema } from "../utils/schemas.js";

const router = express.Router();

// ✅ Create Sales (Checkout)
router.post("/", planGuard('invoices_per_month'), validateRequest(saleSchema), createSale);

// ✅ Update Sale
router.put("/:id", updateSale);

// ✅ Base route → all sales
router.get("/", getAllSales);

// ✅ Weekly route → last 7 days aggregated
router.get("/weekly", getWeeklySales);

// ✅ Delete Sale
router.delete("/:id", deleteSale);

// Summary route
router.get("/summary", getSummary);

// Trend route
router.get("/trend", getTrend);

import { generatePdf } from "../controllers/SalesController.js";

// Generate PDF route
router.get("/:id/pdf", generatePdf);

export default router;