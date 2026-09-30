import { ExpenseService } from "../services/ExpenseService.js";

/**
 * ExpenseController — Handles HTTP endpoints for Operating Expenses.
 * Resolves authenticated tenant context, enforces cashier restrictions,
 * parses pagination and filter queries, and returns standardized responses.
 */

export const getExpenses = async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    if (role === "cashier") {
      return res.status(403).json({
        error: "ACCESS_DENIED",
        message: "Access denied: Cashiers are not authorized to view operating expenses."
      });
    }

    const userId = req.user.id;
    const orgId = req.tenantId || req.user?.organization_id || null;

    const {
      page,
      limit,
      search,
      category,
      payment_method,
      paymentMethod,
      store_id,
      storeId,
      startDate,
      endDate,
      paginate
    } = req.query;

    const shouldPaginate = paginate === "true" || page !== undefined || limit !== undefined;

    const options = {
      orgId,
      storeId: store_id || storeId || null,
      category: category || null,
      paymentMethod: payment_method || paymentMethod || null,
      search: search || null,
      startDate: startDate || null,
      endDate: endDate || null,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      paginate: shouldPaginate
    };

    const data = await ExpenseService.getExpenses(userId, options, { orgId });
    res.json(data);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
};

export const getExpenseById = async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    if (role === "cashier") {
      return res.status(403).json({
        error: "ACCESS_DENIED",
        message: "Access denied: Cashiers are not authorized to view operating expenses."
      });
    }

    const userId = req.user.id;
    const orgId = req.tenantId || req.user?.organization_id || null;
    const data = await ExpenseService.getExpenseById(req.params.id, { userId, orgId });
    res.json(data);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
};

export const addExpense = async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    if (role === "cashier") {
      return res.status(403).json({
        error: "ACCESS_DENIED",
        message: "Access denied: Cashiers are not authorized to record operating expenses."
      });
    }

    const userId = req.user.id;
    const orgId = req.tenantId || req.user?.organization_id || null;
    const idempotencyKey = req.headers["idempotency-key"] || req.body?.idempotency_key || null;

    const data = await ExpenseService.addExpense(userId, req.body, { orgId, idempotencyKey });
    res.status(201).json(data);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    if (role === "cashier") {
      return res.status(403).json({
        error: "ACCESS_DENIED",
        message: "Access denied: Cashiers are not authorized to modify operating expenses."
      });
    }

    const userId = req.user.id;
    const orgId = req.tenantId || req.user?.organization_id || null;
    const data = await ExpenseService.updateExpense(userId, req.params.id, req.body, { orgId });
    res.json(data);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    if (role === "cashier") {
      return res.status(403).json({
        error: "ACCESS_DENIED",
        message: "Access denied: Cashiers are not authorized to delete operating expenses."
      });
    }

    const userId = req.user.id;
    const orgId = req.tenantId || req.user?.organization_id || null;
    const data = await ExpenseService.deleteExpense(userId, req.params.id, { orgId });
    res.json(data);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
};
