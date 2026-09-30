import { getPostgresPool } from "../../../config/postgres.js";
import { StoreService } from "../../../services/StoreService.js";

/**
 * ============================================================================
 * KaroBar Feature 5: Purchases & Supplier Hub
 * SupplierPaymentService — Hardened & Concurrency-Safe Supplier Payments
 * ============================================================================
 * 
 * Guarantees:
 * 1. Single Atomic PostgreSQL Transaction (all-or-nothing).
 * 2. Concurrency-safe Row-Level Locking (`SELECT ... FOR UPDATE` on suppliers).
 * 3. Strict Overpayment Protection (cannot drive balance below zero).
 * 4. Multi-Tenant Business Isolation & Store Verification.
 * 5. Idempotency Support (duplicate clicks/retries cannot double-debit balance).
 * 6. Audit Trail Logging (`public.audit_logs`).
 */

export class SupplierPaymentService {
  /**
   * Record a payment to a supplier within an atomic PostgreSQL transaction.
   * 
   * @param {string} userId - Authenticated user UUID
   * @param {Object} payload - Payment parameters
   * @param {Object} options - Additional options (e.g. idempotencyKey from headers)
   * @returns {Promise<Object>} { payment, newBalance, previousBalance }
   */
  static async recordPayment(userId, payload = {}, options = {}) {
    if (!userId) {
      const err = new Error("Unauthorized: User context is required");
      err.statusCode = 401;
      throw err;
    }

    const {
      supplier_id,
      purchase_order_id,
      amount,
      date,
      payment_method,
      ref_no,
      notes,
      remarks,
      store_id
    } = payload;

    // 1. Basic Input Validation
    if (!supplier_id) {
      const err = new Error("Missing required parameter: supplier_id");
      err.statusCode = 400;
      throw err;
    }

    if (!payment_method || typeof payment_method !== "string" || !payment_method.trim()) {
      const err = new Error("Missing required parameter: payment_method");
      err.statusCode = 400;
      throw err;
    }

    const rawAmount = Number(amount);
    if (isNaN(rawAmount) || !Number.isFinite(rawAmount) || rawAmount <= 0) {
      const err = new Error("Payment amount must be a positive finite number greater than 0");
      err.statusCode = 400;
      throw err;
    }

    const payAmount = Math.round(rawAmount * 100) / 100;
    const finalNotes = notes || remarks || null;
    const idempotencyKey = payload.idempotency_key || payload.idempotencyKey || options.idempotencyKey || null;

    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 2. Idempotency Check: if idempotency key was previously processed for this user
      if (idempotencyKey) {
        const existingRes = await client.query(
          `SELECT id, user_id, store_id, supplier_id, purchase_order_id, amount, date, payment_method, ref_no, notes, idempotency_key, created_at
           FROM public.supplier_payments 
           WHERE user_id = $1 AND idempotency_key = $2`,
          [userId, idempotencyKey]
        );

        if (existingRes.rows.length > 0) {
          const existingPayment = existingRes.rows[0];
          // Fetch current supplier balance to return consistent state
          const suppBalRes = await client.query(
            `SELECT outstanding_balance FROM public.suppliers WHERE id = $1`,
            [existingPayment.supplier_id]
          );
          const currentBalance = Number(suppBalRes.rows[0]?.outstanding_balance || 0);

          await client.query("COMMIT");
          return {
            payment: existingPayment,
            newBalance: currentBalance,
            previousBalance: currentBalance,
            idempotent: true
          };
        }
      }

      // 3. Row-Lock Supplier for Update (enforces serialized access & concurrency protection)
      const suppRes = await client.query(
        `SELECT id, user_id, name, store_id, outstanding_balance, is_archived 
         FROM public.suppliers 
         WHERE id = $1 
         FOR UPDATE`,
        [supplier_id]
      );

      if (suppRes.rows.length === 0) {
        const err = new Error("Supplier not found");
        err.statusCode = 404;
        throw err;
      }

      const supplier = suppRes.rows[0];

      // 4. Multi-Tenant Business Ownership Verification
      if (supplier.user_id !== userId) {
        const err = new Error("Supplier not found or unauthorized");
        err.statusCode = 404;
        throw err;
      }

      // 5. Archived Supplier Check
      const currentBalance = Number(supplier.outstanding_balance || 0);
      if (supplier.is_archived) {
        if (currentBalance <= 0) {
          const err = new Error(`Cannot record payment for archived supplier '${supplier.name}' with zero outstanding balance.`);
          err.statusCode = 400;
          throw err;
        }
        // Allowed if clearing outstanding debt
      }

      // 6. Overpayment Protection Guard
      if (payAmount > currentBalance) {
        const err = new Error(
          `Overpayment rejected: Payment amount (₹${payAmount.toFixed(2)}) exceeds supplier outstanding balance (₹${currentBalance.toFixed(2)}).`
        );
        err.statusCode = 400;
        throw err;
      }

      // 7. Store Authorization
      let targetStoreId = store_id || supplier.store_id || null;
      if (targetStoreId) {
        const storeCheck = await client.query(
          `SELECT id FROM public.stores WHERE id = $1 AND user_id = $2`,
          [targetStoreId, userId]
        );
        if (storeCheck.rows.length === 0) {
          const err = new Error(`Unauthorized: Store does not belong to your business`);
          err.statusCode = 403;
          throw err;
        }
      } else {
        targetStoreId = await StoreService.getActiveStore(userId);
      }

      // 8. Purchase Order Validation (if linked)
      if (purchase_order_id) {
        const poRes = await client.query(
          `SELECT id, user_id, supplier_id, store_id, order_no, total_amount, status 
           FROM public.purchase_orders 
           WHERE id = $1`,
          [purchase_order_id]
        );

        if (poRes.rows.length === 0 || poRes.rows[0].user_id !== userId) {
          const err = new Error("Purchase order not found or unauthorized");
          err.statusCode = 404;
          throw err;
        }

        const po = poRes.rows[0];
        if (po.supplier_id !== supplier_id) {
          const err = new Error("Purchase order does not belong to this supplier");
          err.statusCode = 400;
          throw err;
        }

        if (!targetStoreId && po.store_id) {
          targetStoreId = po.store_id;
        }
      }

      // 9. Compute New Balance
      const newBalance = Math.max(0, Math.round((currentBalance - payAmount) * 100) / 100);

      // 10. Insert Payment Record
      const payDate = date || new Date().toISOString().split("T")[0];
      const insertPayRes = await client.query(
        `INSERT INTO public.supplier_payments 
           (user_id, store_id, supplier_id, purchase_order_id, amount, date, payment_method, ref_no, notes, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          userId,
          targetStoreId,
          supplier_id,
          purchase_order_id || null,
          payAmount,
          payDate,
          payment_method.trim(),
          ref_no ? ref_no.trim() : null,
          finalNotes,
          idempotencyKey
        ]
      );
      const payment = insertPayRes.rows[0];

      // 11. Update Supplier Outstanding Balance in the SAME Transaction
      await client.query(
        `UPDATE public.suppliers 
         SET outstanding_balance = $1, updated_at = now() 
         WHERE id = $2 AND user_id = $3`,
        [newBalance, supplier_id, userId]
      );

      // 12. Audit Trail Logging
      await client.query(
        `INSERT INTO public.audit_logs 
           (user_id, store_id, entity_type, entity_id, action, details, table_name, record_id, created_at)
         VALUES ($1, $2, 'Supplier', $3, 'Supplier Payment', $4, 'suppliers', $5, now())`,
        [
          userId,
          targetStoreId,
          supplier_id,
          JSON.stringify({
            payment_id: payment.id,
            amount: payAmount,
            previous_balance: currentBalance,
            new_balance: newBalance,
            payment_method: payment.payment_method,
            ref_no: payment.ref_no,
            purchase_order_id: purchase_order_id || null,
            store_id: targetStoreId
          }),
          supplier_id
        ]
      );

      await client.query("COMMIT");

      return {
        payment,
        newBalance,
        previousBalance: currentBalance,
        idempotent: false
      };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[SupplierPaymentService] Payment failed: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve supplier payment history with pagination and store filtering.
   */
  static async getPaymentHistory(userId, options = {}) {
    const pool = getPostgresPool();
    const { supplier_id, store_id, page = 1, limit = 50 } = options;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    let query = `
      SELECT sp.*, s.name as supplier_name, po.order_no as purchase_order_no
      FROM public.supplier_payments sp
      JOIN public.suppliers s ON sp.supplier_id = s.id
      LEFT JOIN public.purchase_orders po ON sp.purchase_order_id = po.id
      WHERE sp.user_id = $1
    `;
    const params = [userId];

    if (supplier_id) {
      params.push(supplier_id);
      query += ` AND sp.supplier_id = $${params.length}`;
    }

    if (store_id) {
      params.push(store_id);
      query += ` AND sp.store_id = $${params.length}`;
    }

    query += ` ORDER BY sp.date DESC, sp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const res = await pool.query(query, params);
    return res.rows;
  }
}

export default SupplierPaymentService;
