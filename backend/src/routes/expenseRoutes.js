import express from "express";
import { getSuppliers, addSupplier, getExpenses, addExpense } from "../controllers/ExpenseController.js";

const router = express.Router();

router.get("/suppliers", getSuppliers);
router.post("/suppliers", addSupplier);
router.get("/", getExpenses);
router.post("/", addExpense);

export default router;
