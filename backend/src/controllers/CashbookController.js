import { CashbookService } from "../services/CashbookService.js";

/**
 * CashbookController — HTTP Controller for Canonical Cashbook and Cash Adjustments.
 */

export const getCashbook = async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.tenantId || req.user?.organization_id || null;

    const {
      store_id,
      storeId,
      startDate,
      endDate,
      payment_method,
      paymentMethod,
      transaction_type,
      transactionType,
      direction,
      page,
      limit
    } = req.query;

    const filters = {
      storeId: store_id || storeId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      paymentMethod: payment_method || paymentMethod || null,
      transactionType: transaction_type || transactionType || null,
      direction: direction || null,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50
    };

    const data = await CashbookService.getCashbook({ userId, orgId }, filters);
    res.json(data);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
};

export const addCashAdjustment = async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.tenantId || req.user?.organization_id || null;

    const data = await CashbookService.addAdjustment(userId, req.body, { orgId });
    res.status(201).json(data);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
};
