import express from "express";
import { addPayment, getCustomerPayments, deletePayment, getAllPayments } from "../controllers/PaymentController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add", authenticateToken, addPayment);
router.delete("/:id", authenticateToken, deletePayment);
router.get("/", authenticateToken, getAllPayments); // Match root route first
router.get("/:customerId", authenticateToken, getCustomerPayments);

export default router;
