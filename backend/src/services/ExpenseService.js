import { SupplierRepository, ExpenseRepository } from "../repositories/ExpenseRepository.js";
import { FinancialCacheService } from "../utils/cache.js";

export const ExpenseService = {
  async getSuppliers(userId) {
    return await SupplierRepository.findAll(userId);
  },
  async addSupplier(userId, payload) {
    return await SupplierRepository.create(userId, payload);
  },
  async getExpenses(userId) {
    return await ExpenseRepository.findAll(userId);
  },
  async addExpense(userId, payload, orgId = null) {
    const expense = await ExpenseRepository.create(userId, payload);
    try {
      await FinancialCacheService.invalidate(orgId, userId);
    } catch (cErr) {
      console.warn("[ExpenseService] Cache invalidation error:", cErr.message);
    }
    return expense;
  },
  async updateExpense(userId, id, payload, orgId = null) {
    const updated = await ExpenseRepository.update(userId, id, payload);
    try {
      await FinancialCacheService.invalidate(orgId, userId);
    } catch (cErr) {
      console.warn("[ExpenseService] Cache invalidation error:", cErr.message);
    }
    return updated;
  },
  async deleteExpense(userId, id, orgId = null) {
    const deleted = await ExpenseRepository.delete(userId, id);
    try {
      await FinancialCacheService.invalidate(orgId, userId);
    } catch (cErr) {
      console.warn("[ExpenseService] Cache invalidation error:", cErr.message);
    }
    return deleted;
  }
};
