import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  getMyCatalogs, getPartnerCatalogs, createCatalog, updateCatalog, deleteCatalog,
  getCatalogItems, addCatalogItem, deleteCatalogItem
} from "../controllers/CatalogNetworkController.js";

const router = express.Router();
router.use(authenticateToken);

router.get("/mine", getMyCatalogs);
router.get("/partners", getPartnerCatalogs);
router.post("/", createCatalog);
router.put("/:id", updateCatalog);
router.delete("/:id", deleteCatalog);
router.get("/:catalog_id/items", getCatalogItems);
router.post("/:catalog_id/items", addCatalogItem);
router.delete("/items/:id", deleteCatalogItem);

export default router;
