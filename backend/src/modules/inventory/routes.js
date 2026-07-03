import express from "express";
import { StockController } from "./controllers/StockController.js";
import { authenticate, attachTenant, attachPermissions, authorize, audit } from "../identity/index.js";

const router = express.Router();

// Apply auth, tenant context, and permissions middlewares
router.use(authenticate, attachTenant, attachPermissions);

router.post("/opening-stock", authorize("edit_inventory"), audit, StockController.postOpeningStock);
router.post("/adjustments", authorize("edit_inventory"), audit, StockController.postAdjustment);
router.post("/transfers/ship", authorize("edit_inventory"), audit, StockController.shipTransfer);
router.post("/transfers/:id/receive", authorize("edit_inventory"), audit, StockController.receiveTransfer);
router.post("/reservations", authorize("edit_inventory"), audit, StockController.createReservation);
router.post("/reservations/:id/release", authorize("edit_inventory"), audit, StockController.releaseReservation);

router.get("/balances", authorize("view_inventory"), StockController.getWarehouseBalance);
router.get("/movements", authorize("view_inventory"), StockController.getMovementHistory);

export default router;
