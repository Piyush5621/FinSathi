import { SupplierRepository, ExpenseRepository } from "../repositories/ExpenseRepository.js";

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
  async addExpense(userId, payload) {
    return await ExpenseRepository.create(userId, payload);
  }
};
