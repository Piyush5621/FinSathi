import express from "express";
import { UomController } from "./controllers/UomController.js";
import { CategoryController } from "./controllers/CategoryController.js";
import { WarehouseController } from "./controllers/WarehouseController.js";
import { BrandController } from "./controllers/BrandController.js";
import { SettingController } from "./controllers/SettingController.js";
import { authenticate, attachTenant, attachPermissions, authorize, audit } from "../identity/index.js";

const router = express.Router();

// Apply auth, tenant scoping, and permission parsing middleware to all routes
router.use(authenticate, attachTenant, attachPermissions);

// --- UOM Routes ---
router.post("/uom/groups", authorize("admin_setup"), audit, UomController.createGroup);
router.get("/uom/groups", UomController.listGroups);
router.delete("/uom/groups/:id", authorize("admin_setup"), audit, UomController.deleteGroup);
router.post("/uom/groups/:id/restore", authorize("admin_setup"), audit, UomController.restoreGroup);

router.post("/uoms", authorize("admin_setup"), audit, UomController.createUnit);
router.get("/uoms", UomController.listUnits);
router.delete("/uoms/:id", authorize("admin_setup"), audit, UomController.deleteUnit);
router.post("/uoms/:id/restore", authorize("admin_setup"), audit, UomController.restoreUnit);
router.get("/uoms/convert", UomController.convert);

// --- Category Routes ---
router.post("/categories", authorize("edit_catalog"), audit, CategoryController.createCategory);
router.get("/categories", CategoryController.listCategories);
router.delete("/categories/:id", authorize("edit_catalog"), audit, CategoryController.deleteCategory);
router.post("/categories/:id/restore", authorize("edit_catalog"), audit, CategoryController.restoreCategory);
router.post("/categories/:id/template", authorize("admin_setup"), audit, CategoryController.setAttributeTemplate);
router.post("/categories/:id/validate", CategoryController.validateAttributes);

// --- Warehouse Routes ---
router.post("/warehouses", authorize("edit_catalog"), audit, WarehouseController.createWarehouse);
router.put("/warehouses/:id", authorize("edit_catalog"), audit, WarehouseController.updateWarehouse);
router.get("/warehouses", WarehouseController.listWarehouses);
router.delete("/warehouses/:id", authorize("edit_catalog"), audit, WarehouseController.deleteWarehouse);
router.post("/warehouses/:id/restore", authorize("edit_catalog"), audit, WarehouseController.restoreWarehouse);

// --- Brands & Manufacturers Routes ---
router.post("/companies", authorize("edit_catalog"), audit, BrandController.createCompany);
router.get("/companies", BrandController.listCompanies);
router.delete("/companies/:id", authorize("edit_catalog"), audit, BrandController.deleteCompany);
router.post("/companies/:id/restore", authorize("edit_catalog"), audit, BrandController.restoreCompany);

router.post("/brands", authorize("edit_catalog"), audit, BrandController.createBrand);
router.get("/brands", BrandController.listBrands);
router.delete("/brands/:id", authorize("edit_catalog"), audit, BrandController.deleteBrand);
router.post("/brands/:id/restore", authorize("edit_catalog"), audit, BrandController.restoreBrand);

// --- Settings & Tax Configurations ---
router.get("/settings/preferences", SettingController.getPreferences);
router.put("/settings/preferences", authorize("admin_setup"), audit, SettingController.updatePreferences);

router.post("/settings/fy", authorize("admin_setup"), audit, SettingController.createFinancialYear);
router.post("/settings/fy/:id/activate", authorize("admin_setup"), audit, SettingController.activateFinancialYear);

router.post("/settings/tax-categories", authorize("admin_setup"), audit, SettingController.createTaxCategory);
router.post("/settings/gst-rates", authorize("admin_setup"), audit, SettingController.createGstRate);
router.post("/settings/hsn", authorize("admin_setup"), audit, SettingController.createHsnCode);

router.post("/settings/numbering", authorize("admin_setup"), audit, SettingController.createNumberingSeries);
router.get("/settings/numbering/generate", SettingController.generateDocNumber);

// --- Import Foundation ---
router.post("/settings/import/preview", authorize("admin_setup"), SettingController.importPreview);

export default router;
