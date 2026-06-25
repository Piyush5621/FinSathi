import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  getPreferredSuppliers, markAsPreferred, removePreferred,
  getProductLinks, upsertProductLink, getSmartReorder
} from "../controllers/PreferredSupplierController.js";

const router = express.Router();
router.use(authenticateToken);

router.get("/preferred", getPreferredSuppliers);
router.post("/preferred", markAsPreferred);
router.delete("/preferred/:supplier_id", removePreferred);
router.get("/product-links", getProductLinks);
router.post("/product-links", upsertProductLink);
router.get("/reorder/:inventory_id", getSmartReorder);

export default router;
