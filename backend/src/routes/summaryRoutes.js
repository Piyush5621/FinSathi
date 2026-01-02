import express from "express";
import { getSmartSummary } from "../controllers/SummaryController.js";

const router = express.Router();
router.get("/", getSmartSummary);
export default router;
