import express from "express";
import { 
  getSuppliers, 
  getSupplierById,
  createSupplier, 
  updateSupplier, 
  deleteSupplier, 
  archiveSupplier,
  restoreSupplier,
  getSupplierLedger, 
  recordSupplierPayment,
  discoverSuppliers,
  getDiscoveredSupplierDetails,
  publishSupplierProduct,
  setSupplierDiscoverability,
  getSupplierProducts
} from "../controllers/SupplierController.js";

const router = express.Router();

// Discovery Routes (Must precede /:id)
router.get("/discover", discoverSuppliers);
router.get("/discover/:id", getDiscoveredSupplierDetails);

router.get("/", getSuppliers);
router.post("/", createSupplier);
router.get("/:id", getSupplierById);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);
router.patch("/:id/archive", archiveSupplier);
router.put("/:id/archive", archiveSupplier);
router.patch("/:id/restore", restoreSupplier);
router.put("/:id/restore", restoreSupplier);
router.get("/:id/ledger", getSupplierLedger);
router.post("/payment", recordSupplierPayment);
router.get("/:id/products", getSupplierProducts);
router.post("/:id/products", publishSupplierProduct);
router.patch("/:id/discoverability", setSupplierDiscoverability);

export default router;
