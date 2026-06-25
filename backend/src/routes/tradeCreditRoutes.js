import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { getCreditAccounts, createOrUpdateCreditAccount, updateCreditOutstanding } from "../controllers/TradeCreditController.js";

const router = express.Router();
router.use(authenticateToken);

router.get("/", getCreditAccounts);
router.post("/", createOrUpdateCreditAccount);
router.put("/:id", updateCreditOutstanding);

export default router;
