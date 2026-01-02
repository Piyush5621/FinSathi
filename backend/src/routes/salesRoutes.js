import express from "express";
import { getWeeklySales, getAllSales, createSale, deleteSale, getSummary, getTrend, updateSale } from "../controllers/SalesController.js";

const router = express.Router();

// ✅ Create Sales (Checkout)
router.post("/", createSale);

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

export default router;