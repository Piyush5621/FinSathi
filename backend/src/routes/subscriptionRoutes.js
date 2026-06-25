import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import * as SubscriptionController from "../controllers/SubscriptionController.js";

const router = express.Router();

// Required auth for standard routes
router.post("/create-order", authenticateToken, SubscriptionController.createOrder);
router.post("/verify", authenticateToken, SubscriptionController.verifyPayment);
router.get("/my-plan", authenticateToken, SubscriptionController.getMyPlan);
router.post("/cancel", authenticateToken, SubscriptionController.cancelSubscription);
router.get("/invoices", authenticateToken, SubscriptionController.getInvoices);

// Webhook from Razorpay doesn't use authenticateToken
router.post("/webhook", SubscriptionController.razorpayWebhook);

export default router;
