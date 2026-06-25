import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { createReturnRequest, getReturns, getReturnDetail, updateReturnStatus } from "../controllers/TradeReturnController.js";

const router = express.Router();
router.use(authenticateToken);

router.get("/", getReturns);
router.post("/", createReturnRequest);
router.get("/:id", getReturnDetail);
router.put("/:id/status", updateReturnStatus);

export default router;
