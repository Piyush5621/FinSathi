import express from "express";
import { getSuppliers, addSupplier, getExpenses, addExpense, updateExpense } from "../controllers/ExpenseController.js";

const router = express.Router();

router.get("/suppliers", getSuppliers);
router.post("/suppliers", addSupplier);
router.get("/", getExpenses);
router.post("/", addExpense);
router.put("/:id", updateExpense);

export default router;
