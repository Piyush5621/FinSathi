import express from "express";
import { StockController } from "./controllers/StockController.js";
import { authenticate, attachTenant, attachPermissions, authorize, audit } from "../identity/index.js";

const router = express.Router();

// Apply auth, tenant context, and permissions middlewares
router.use(authenticate, attachTenant, attachPermissions);

// Canonical Inventory Endpoints
router.post("/restock", authorize("edit_inventory"), audit, StockController.postRestock);
router.post("/adjust", authorize("edit_inventory"), audit, StockController.postAdjustment);
router.post("/transfer", authorize("edit_inventory"), audit, StockController.postTransfer);
router.get("/movements", authorize("view_inventory"), StockController.getMovements);
router.post("/bulk", authorize("edit_inventory"), audit, StockController.postBulkImport);
router.get("/balance", authorize("view_inventory"), StockController.getStoreBalance);

// Backward-compatibility aliases
router.post("/adjustments", authorize("edit_inventory"), audit, StockController.postAdjustment);
router.post("/opening-stock", authorize("edit_inventory"), audit, StockController.postRestock);

export default router;
