import express from "express";
import {
  getExpenses,
  getExpenseById,
  addExpense,
  updateExpense,
  deleteExpense
} from "../controllers/ExpenseController.js";

const router = express.Router();

router.get("/", getExpenses);
router.get("/:id", getExpenseById);
router.post("/", addExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

export default router;
