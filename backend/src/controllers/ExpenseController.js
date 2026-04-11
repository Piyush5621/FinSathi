import { ExpenseService } from "../services/ExpenseService.js";

export const getSuppliers = async (req, res) => {
  try {
    const data = await ExpenseService.getSuppliers(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addSupplier = async (req, res) => {
  try {
    const data = await ExpenseService.addSupplier(req.user.id, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const data = await ExpenseService.getExpenses(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addExpense = async (req, res) => {
  try {
    const data = await ExpenseService.addExpense(req.user.id, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
