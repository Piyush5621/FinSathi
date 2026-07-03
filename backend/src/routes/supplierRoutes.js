import express from "express";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierLedger, recordSupplierPayment } from "../controllers/SupplierController.js";

const router = express.Router();

router.get("/", getSuppliers);
router.post("/", createSupplier);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);
router.get("/:id/ledger", getSupplierLedger);
router.post("/payment", recordSupplierPayment);

export default router;
