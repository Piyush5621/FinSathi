import express from "express";
import { getSuppliers, createSupplier, getSupplierLedger, recordSupplierPayment } from "../controllers/SupplierController.js";

const router = express.Router();

router.get("/", getSuppliers);
router.post("/", createSupplier);
router.get("/:id/ledger", getSupplierLedger);
router.post("/payment", recordSupplierPayment);

export default router;
