import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  sendTradeTransaction,
  getPurchaseInbox,
  getSalesOutbox,
  getTransactionDetail,
  updateTransactionStatus,
  getTradeHistory
} from "../controllers/TradeController.js";

const router = express.Router();
router.use(authenticateToken);

router.post("/send", sendTradeTransaction);
router.get("/inbox", getPurchaseInbox);
router.get("/outbox", getSalesOutbox);
router.get("/history", getTradeHistory);
router.get("/:id", getTransactionDetail);
router.put("/:id/status", updateTransactionStatus);

export default router;
