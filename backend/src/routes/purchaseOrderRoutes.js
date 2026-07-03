import express from "express";
import { getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, updatePurchaseOrderStatus } from "../controllers/PurchaseOrderController.js";

const router = express.Router();

router.get("/", getPurchaseOrders);
router.get("/:id", getPurchaseOrderById);
router.post("/", createPurchaseOrder);
router.put("/:id", updatePurchaseOrder);
router.delete("/:id", deletePurchaseOrder);
router.patch("/:id/status", updatePurchaseOrderStatus);

export default router;
