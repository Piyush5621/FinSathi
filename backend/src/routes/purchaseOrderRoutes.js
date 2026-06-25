import express from "express";
import { getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePurchaseOrderStatus } from "../controllers/PurchaseOrderController.js";

const router = express.Router();

router.get("/", getPurchaseOrders);
router.get("/:id", getPurchaseOrderById);
router.post("/", createPurchaseOrder);
router.patch("/:id/status", updatePurchaseOrderStatus);

export default router;
