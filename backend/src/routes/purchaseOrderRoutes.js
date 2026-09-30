import express from "express";
import { 
  getPurchaseOrders, 
  getPurchaseOrderById, 
  createPurchaseOrder, 
  updatePurchaseOrder, 
  deletePurchaseOrder, 
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  createPurchaseReturn,
  getPurchaseOrderReturns
} from "../controllers/PurchaseOrderController.js";

const router = express.Router();

router.get("/", getPurchaseOrders);
router.get("/:id", getPurchaseOrderById);
router.post("/", createPurchaseOrder);
router.put("/:id", updatePurchaseOrder);
router.delete("/:id", deletePurchaseOrder);
router.patch("/:id/status", updatePurchaseOrderStatus);
router.post("/:id/receive", receivePurchaseOrder);
router.patch("/:id/receive", receivePurchaseOrder);
router.post("/:id/returns", createPurchaseReturn);
router.get("/:id/returns", getPurchaseOrderReturns);

export default router;
