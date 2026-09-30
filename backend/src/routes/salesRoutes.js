import express from "express";
import { 
    getWeeklySales, 
    getAllSales, 
    getSaleById, 
    createSale, 
    deleteSale, 
    cancelSale, 
    getSummary, 
    getTrend, 
    updateSale, 
    returnSale,
    generatePdf 
} from "../controllers/SalesController.js";
import { planGuard } from "../middleware/planGuard.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { saleSchema } from "../utils/schemas.js";

const router = express.Router();

// ✅ Create Sales (Checkout)
router.post("/", validateRequest(saleSchema), createSale);


// ✅ Process Sales Return
router.post("/:id/return", returnSale);

// ✅ Cancel / Void Sale
router.post("/:id/cancel", cancelSale);

// ✅ Update Sale
router.put("/:id", updateSale);

// ✅ Base route → all sales (supports ?page=&limit=&search=&status=&customer_id=)
router.get("/", getAllSales);

// ✅ Weekly route → last 7 days aggregated
router.get("/weekly", getWeeklySales);

// ✅ Summary route
router.get("/summary", getSummary);

// ✅ Trend route
router.get("/trend", getTrend);

// ✅ Generate PDF route
router.get("/:id/pdf", generatePdf);

// ✅ Single sale details
router.get("/:id", getSaleById);

// ✅ Delete Sale (Redirected to safe Cancel / Void)
router.delete("/:id", deleteSale);

export default router;