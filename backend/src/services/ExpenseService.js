import { ExpenseRepository } from "../repositories/ExpenseRepository.js";
import { FinancialCacheService } from "../utils/cache.js";
import { getPostgresPool } from "../config/postgres.js";

const VALID_PAYMENT_METHODS = {
  cash: "Cash",
  upi: "UPI",
  "bank transfer": "Bank Transfer",
  bank: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
  check: "Cheque",
  other: "Other"
};

/**
 * Normalizes payment methods to canonical case.
 */
function normalizePaymentMethod(method) {
  if (!method || typeof method !== "string") return "Cash";
  const key = method.trim().toLowerCase();
  return VALID_PAYMENT_METHODS[key] || null;
}

/**
 * ExpenseService — Business logic and governance for Operating Expenses.
 * Enforces strict input validation, multi-tenant & store authorization,
 * protection for system-generated purchase expenses, idempotency,
 * audit logging, and financial cache invalidation.
 */
export const ExpenseService = {
  /**
   * Get all expenses. If options.paginate is true, returns { items, total, page, limit, totalPages }.
   * Otherwise returns items array for backward compatibility.
   */
  async getExpenses(userId, options = {}, context = {}) {
    const orgId = context.orgId || options.orgId || null;
    return await ExpenseRepository.findAll(userId, { ...options, orgId });
  },

  /**
   * Get single expense by ID with tenant security check.
   */
  async getExpenseById(id, context = {}) {
    const expense = await ExpenseRepository.findById(id, context);
    if (!expense) {
      const err = new Error("Expense not found");
      err.statusCode = 404;
      throw err;
    }
    return expense;
  },

  /**
   * Record a new operating expense.
   */
  async addExpense(userId, payload, context = {}) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      // 1. Amount Validation
      const rawAmount = Number(payload.amount);
      if (payload.amount === undefined || payload.amount === null || isNaN(rawAmount) || rawAmount <= 0 || !isFinite(rawAmount)) {
        const err = new Error("Invalid expense amount: must be a positive number greater than zero.");
        err.statusCode = 400;
        throw err;
      }
      const amount = Math.round(rawAmount * 100) / 100;

      // 2. Category Validation
      const rawCategory = typeof payload.category === 'string' ? payload.category.trim() : "";
      if (!rawCategory) {
        const err = new Error("Expense category is required.");
        err.statusCode = 400;
        throw err;
      }
      const category = rawCategory;

      // 3. Payment Method Validation & Normalization
      const normalizedMethod = normalizePaymentMethod(payload.payment_method);
      if (!normalizedMethod) {
        const err = new Error(`Invalid payment method '${payload.payment_method}'. Supported: Cash, UPI, Bank Transfer, Card, Cheque, Other.`);
        err.statusCode = 400;
        throw err;
      }

      // 4. Resolve Organization ID
      let orgId = context.orgId || null;
      if (!orgId) {
        const userRes = await client.query(`SELECT organization_id FROM public.users WHERE id = $1`, [userId]);
        orgId = userRes.rows[0]?.organization_id || null;
      }

      // 5. Resolve and Validate Store ID
      let storeId = payload.store_id || payload.storeId || null;
      if (storeId) {
        // Verify store belongs to this user or organization
        const storeCheck = await client.query(
          `SELECT id, user_id FROM public.stores WHERE id = $1`,
          [storeId]
        );
        if (storeCheck.rows.length === 0) {
          const err = new Error("Store not found or unauthorized.");
          err.statusCode = 403;
          throw err;
        }

        const storeOwnerId = storeCheck.rows[0].user_id;
        if (storeOwnerId !== userId) {
          // Check if same organization
          let sameOrg = false;
          if (orgId) {
            const ownerOrgRes = await client.query(`SELECT organization_id FROM public.users WHERE id = $1`, [storeOwnerId]);
            sameOrg = ownerOrgRes.rows[0]?.organization_id === orgId;
          }
          if (!sameOrg) {
            const err = new Error("Unauthorized store: store does not belong to your business.");
            err.statusCode = 403;
            throw err;
          }
        }
      } else {
        // Fallback: Resolve user's default/active store
        const defaultStoreRes = await client.query(
          `SELECT id FROM public.stores WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
          [userId]
        );
        storeId = defaultStoreRes.rows[0]?.id || null;
      }

      // 6. Validate Supplier (if provided)
      let supplierId = payload.supplier_id || null;
      if (supplierId) {
        const suppCheck = await client.query(
          `SELECT id FROM public.suppliers WHERE id = $1 AND user_id = $2`,
          [supplierId, userId]
        );
        if (suppCheck.rows.length === 0) {
          supplierId = null; // Unlink invalid or cross-tenant supplier
        }
      }

      // 7. Idempotency Check
      const idempotencyKey = context.idempotencyKey || payload.idempotency_key || null;
      if (idempotencyKey) {
        const existing = await ExpenseRepository.findByIdempotencyKey(userId, idempotencyKey, client);
        if (existing) {
          return {
            ...existing,
            amount: Number(existing.amount),
            idempotent: true
          };
        }
      }

      // 8. Prepare Expense Payload
      const date = payload.date ? new Date(payload.date).toISOString() : new Date().toISOString();
      const description = payload.description ? String(payload.description).trim() : category;

      await client.query("BEGIN");

      const expense = await ExpenseRepository.create({
        user_id: userId,
        organization_id: orgId,
        store_id: storeId,
        supplier_id: supplierId,
        amount,
        category,
        payment_method: normalizedMethod,
        date,
        description,
        idempotency_key: idempotencyKey,
        is_system_generated: false
      }, client);

      // 9. Record Audit Log
      await client.query(`
        INSERT INTO public.audit_logs (
          user_id, store_id, table_name, record_id, entity_type, entity_id, action, new_values, created_at
        ) VALUES (
          $1, $2, 'expenses', $3, 'expense', $3, 'EXPENSE_CREATED', $4, now()
        )
      `, [userId, storeId, expense.id, JSON.stringify(expense)]);

      await client.query("COMMIT");

      // 10. Cache Invalidation
      try {
        await FinancialCacheService.invalidate(orgId, userId);
      } catch (cErr) {
        console.warn("[ExpenseService] Cache invalidation warning:", cErr.message);
      }

      return expense;
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Update an existing expense record.
   * Protects system-generated purchase expenses from tampering.
   */
  async updateExpense(userId, id, payload, context = {}) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      const orgId = context.orgId || null;

      // 1. Fetch Existing Expense Record
      const existing = await ExpenseRepository.findById(id, { userId, orgId });
      if (!existing) {
        const err = new Error("Expense not found");
        err.statusCode = 404;
        throw err;
      }

      // 2. Protect System-Generated Purchase Expenses
      if (
        existing.is_system_generated === true || 
        existing.purchase_order_id != null ||
        (existing.category === 'Purchases' && existing.description?.startsWith('Purchase Order Received'))
      ) {
        const err = new Error("System-generated purchase expenses cannot be modified directly. Please adjust the associated Purchase Order or Return.");
        err.statusCode = 403;
        throw err;
      }

      // 3. Whitelist & Validate Updates
      const sanitizedUpdates = {};

      if (payload.amount !== undefined) {
        const rawAmount = Number(payload.amount);
        if (isNaN(rawAmount) || rawAmount <= 0 || !isFinite(rawAmount)) {
          const err = new Error("Invalid expense amount: must be a positive number greater than zero.");
          err.statusCode = 400;
          throw err;
        }
        sanitizedUpdates.amount = Math.round(rawAmount * 100) / 100;
      }

      if (payload.category !== undefined) {
        const rawCat = typeof payload.category === 'string' ? payload.category.trim() : "";
        if (!rawCat) {
          const err = new Error("Category cannot be empty.");
          err.statusCode = 400;
          throw err;
        }
        sanitizedUpdates.category = rawCat;
      }

      if (payload.payment_method !== undefined) {
        const normalized = normalizePaymentMethod(payload.payment_method);
        if (!normalized) {
          const err = new Error(`Invalid payment method '${payload.payment_method}'. Supported: Cash, UPI, Bank Transfer, Card, Cheque, Other.`);
          err.statusCode = 400;
          throw err;
        }
        sanitizedUpdates.payment_method = normalized;
      }

      if (payload.description !== undefined) {
        sanitizedUpdates.description = String(payload.description || "").trim();
      }

      if (payload.date !== undefined) {
        sanitizedUpdates.date = new Date(payload.date).toISOString();
      }

      if (payload.supplier_id !== undefined) {
        sanitizedUpdates.supplier_id = payload.supplier_id || null;
      }

      if (payload.store_id !== undefined && payload.store_id) {
        const storeCheck = await client.query(
          `SELECT id, user_id FROM public.stores WHERE id = $1`,
          [payload.store_id]
        );
        if (storeCheck.rows.length === 0) {
          const err = new Error("Store not found or unauthorized.");
          err.statusCode = 403;
          throw err;
        }
        sanitizedUpdates.store_id = payload.store_id;
      }

      await client.query("BEGIN");

      const updated = await ExpenseRepository.update(id, sanitizedUpdates, { userId, orgId }, client);

      // Record Audit Log
      await client.query(`
        INSERT INTO public.audit_logs (
          user_id, store_id, table_name, record_id, entity_type, entity_id, action, old_values, new_values, created_at
        ) VALUES (
          $1, $2, 'expenses', $3, 'expense', $3, 'EXPENSE_UPDATED', $4, $5, now()
        )
      `, [userId, updated.store_id, id, JSON.stringify(existing), JSON.stringify(updated)]);

      await client.query("COMMIT");

      // Invalidate Financial Caches
      try {
        await FinancialCacheService.invalidate(orgId, userId);
      } catch (cErr) {
        console.warn("[ExpenseService] Cache invalidation warning:", cErr.message);
      }

      return updated;
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Delete an expense record.
   * Strictly blocks deletion of system-generated purchase expenses.
   */
  async deleteExpense(userId, id, context = {}) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      const orgId = context.orgId || null;

      // 1. Fetch Existing Expense Record
      const existing = await ExpenseRepository.findById(id, { userId, orgId });
      if (!existing) {
        const err = new Error("Expense not found");
        err.statusCode = 404;
        throw err;
      }

      // 2. Protect System-Generated Purchase Expenses
      if (
        existing.is_system_generated === true || 
        existing.purchase_order_id != null ||
        (existing.category === 'Purchases' && existing.description?.startsWith('Purchase Order Received'))
      ) {
        const err = new Error("Cannot delete system-generated purchase expense. This expense is linked to Purchase Order receiving and inventory.");
        err.statusCode = 403;
        throw err;
      }

      await client.query("BEGIN");

      await ExpenseRepository.delete(id, { userId, orgId }, client);

      // Record Audit Log
      await client.query(`
        INSERT INTO public.audit_logs (
          user_id, store_id, table_name, record_id, entity_type, entity_id, action, old_values, created_at
        ) VALUES (
          $1, $2, 'expenses', $3, 'expense', $3, 'EXPENSE_DELETED', $4, now()
        )
      `, [userId, existing.store_id, id, JSON.stringify(existing)]);

      await client.query("COMMIT");

      // Invalidate Financial Caches
      try {
        await FinancialCacheService.invalidate(orgId, userId);
      } catch (cErr) {
        console.warn("[ExpenseService] Cache invalidation warning:", cErr.message);
      }

      return { id, message: "Expense deleted successfully" };
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }
};
