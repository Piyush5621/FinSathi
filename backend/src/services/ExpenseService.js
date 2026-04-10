import { SupplierRepository, ExpenseRepository } from "../repositories/ExpenseRepository.js";

export const ExpenseService = {
  async getSuppliers() {
    return await SupplierRepository.findAll();
  },
  async addSupplier(payload) {
    return await SupplierRepository.create(payload);
  },
  async getExpenses() {
    return await ExpenseRepository.findAll();
  },
  async addExpense(payload) {
    return await ExpenseRepository.create(payload);
  }
};
