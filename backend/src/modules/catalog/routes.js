import express from "express";
import { ProductController } from "./controllers/ProductController.js";
import { authenticate, attachTenant, attachPermissions, authorize, audit } from "../identity/index.js";

const router = express.Router();

// Apply auth, tenant context, and permissions middlewares
router.use(authenticate, attachTenant, attachPermissions);

// --- Product Catalog Endpoints ---
router.post("/products", authorize("edit_catalog"), audit, ProductController.createProduct);
router.put("/products/:id", authorize("edit_catalog"), audit, ProductController.updateProduct);
router.get("/products/:id", authorize("view_catalog"), ProductController.getProductDetails);
router.post("/products/:id/variants", authorize("edit_catalog"), audit, ProductController.createVariant);
router.get("/products", authorize("view_catalog"), ProductController.search);
router.delete("/products/:id", authorize("edit_catalog"), audit, ProductController.archiveProduct);
router.post("/products/:id/restore", authorize("edit_catalog"), audit, ProductController.restoreProduct);

export default router;
