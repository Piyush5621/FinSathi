import express from "express";
import { getCashbook, addCashAdjustment } from "../controllers/CashbookController.js";

const router = express.Router();

router.get("/", getCashbook);
router.post("/adjustments", addCashAdjustment);

export default router;
