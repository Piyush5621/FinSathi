import { adminSupabase } from "../admin/adminSupabase.js";
import { adjustCustomerKhataBalance } from "../utils/khataBalanceHelper.js";
import { createNotification } from "../controllers/notificationHelper.js";
import { FinancialCacheService } from "../utils/cache.js";

/**
 * CustomerPaymentService
 * 
 * Canonical service for customer repayments and Khata ledger reconciliation.
 * Reconciles sales invoices (FIFO), updates customer balances with OCC concurrency protection,
 * creates auditable receipts, and maintains idempotency.
 */
export const CustomerPaymentService = {
  /**
   * Record customer repayment with FIFO allocation across unpaid sales
   * 
   * @param {Object} params
   * @param {string} params.userId - Authenticated merchant user ID
   * @param {string} params.customerId - Customer UUID
   * @param {number|string} params.amount - Repayment amount
   * @param {string} [params.paymentMode='cash'] - Payment method (cash, upi, card, etc.)
   * @param {string} [params.reference] - Transaction reference / notes
   * @param {string} [params.notes] - Additional remarks
   * @param {string} [params.date] - Payment date
   * @param {string} [params.idempotencyKey] - Unique key to prevent double submissions
   * @param {string} [params.tenantId] - Organization ID for caching
   */
  async recordRepayment({
    userId,
    customerId,
    amount,
    paymentMode = "cash",
    reference = null,
    notes = null,
    date = null,
    idempotencyKey = null,
    tenantId = null
  }) {
    if (!userId) {
      const err = new Error("User ID is required.");
      err.status = 401;
      throw err;
    }

    if (!customerId) {
      const err = new Error("Customer ID is required.");
      err.status = 400;
      throw err;
    }

    const payAmount = Math.round(parseFloat(amount) * 100) / 100;
    if (isNaN(payAmount) || payAmount <= 0) {
      const err = new Error("Payment amount must be greater than zero.");
      err.status = 400;
      throw err;
    }

    // 1. Verify customer existence and current debt
    const { data: customer, error: custErr } = await adminSupabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("user_id", userId)
      .single();

    if (custErr || !customer) {
      const err = new Error("Customer not found.");
      err.status = 404;
      throw err;
    }

    const currentBalance = Math.round(parseFloat(customer.outstanding_balance || 0) * 100) / 100;
    if (currentBalance <= 0) {
      const err = new Error("Customer has no outstanding balance to repay.");
      err.status = 400;
      throw err;
    }

    if (payAmount > currentBalance + 0.01) {
      const err = new Error(`Payment amount (₹${payAmount}) exceeds customer's outstanding balance (₹${currentBalance}).`);
      err.status = 400;
      throw err;
    }

    const finalMode = paymentMode || "cash";
    const finalRef = idempotencyKey 
      ? `${reference || notes || ''} [IDEM:${idempotencyKey}]`.trim() 
      : (reference || notes || null);

    // 2. Idempotency Check
    if (idempotencyKey) {
      const { data: existingPay } = await adminSupabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("customer_id", customerId)
        .ilike("reference", `%[IDEM:${idempotencyKey}]%`)
        .maybeSingle();

      if (existingPay) {
        return {
          isDuplicate: true,
          status: 200,
          message: "A payment with this idempotency key has already been processed.",
          payment: existingPay
        };
      }
    } else {
      // Rapid identical submission check (within last 3 seconds)
      const threeSecondsAgo = new Date(Date.now() - 3000).toISOString();
      const { data: recentPay } = await adminSupabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("customer_id", customerId)
        .eq("amount", payAmount)
        .gte("created_at", threeSecondsAgo)
        .maybeSingle();

      if (recentPay) {
        return {
          isDuplicate: true,
          status: 409,
          message: "Duplicate payment submission detected.",
          payment: recentPay
        };
      }
    }

    // 3. Record the Payment in payments table
    const paymentDate = date ? new Date(date).toISOString() : new Date().toISOString();
    const { data: payment, error: payError } = await adminSupabase
      .from("payments")
      .insert([{
        user_id: userId,
        customer_id: customerId,
        amount: payAmount,
        date: paymentDate,
        payment_mode: finalMode,
        reference: finalRef
      }])
      .select()
      .single();

    if (payError) {
      console.error("[CustomerPaymentService] Insert payment error:", payError);
      throw payError;
    }

    // 4. Fetch Unpaid Invoices (FIFO - Oldest First)
    const { data: invoices, error: invError } = await adminSupabase
      .from("sales")
      .select("*")
      .eq("customer_id", customerId)
      .eq("user_id", userId)
      .neq("payment_status", "paid")
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });

    if (invError) throw invError;

    // 5. Distribute Payment across Invoices
    let remainingToDistribute = payAmount;
    const allocatedSales = [];

    if (Array.isArray(invoices)) {
      for (const inv of invoices) {
        if (remainingToDistribute <= 0) break;

        const total = Math.round(parseFloat(inv.total || 0) * 100) / 100;
        const paidSoFar = Math.round(parseFloat(inv.amount_paid || 0) * 100) / 100;
        const due = Math.round((total - paidSoFar) * 100) / 100;
        if (due <= 0) continue;

        const toPay = Math.round(Math.min(due, remainingToDistribute) * 100) / 100;
        const newPaidAmount = Math.round((paidSoFar + toPay) * 100) / 100;
        const newStatus = newPaidAmount >= total - 0.01 ? "paid" : "partial";

        await adminSupabase
          .from("sales")
          .update({
            amount_paid: newPaidAmount,
            payment_status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", inv.id)
          .eq("user_id", userId);

        allocatedSales.push({
          saleId: inv.id,
          invoiceNo: inv.invoice_no,
          allocatedAmount: toPay,
          newPaidAmount,
          newStatus
        });

        remainingToDistribute = Math.round((remainingToDistribute - toPay) * 100) / 100;
      }
    }

    // 6. Concurrency-Safe Customer Balance Adjustment via OCC
    let occResult;
    try {
      occResult = await adjustCustomerKhataBalance(userId, customerId, -payAmount);
    } catch (occErr) {
      // Revert the inserted payment record if OCC adjustment fails (e.g. concurrent overpayment)
      await adminSupabase.from("payments").delete().eq("id", payment.id);
      throw occErr;
    }

    // 7. Structured Receipt for UI / WhatsApp / Print
    const receipt = {
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      paymentId: payment.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      amountPaid: payAmount,
      previousBalance: occResult.previousBalance,
      remainingBalance: occResult.newBalance,
      paymentMethod: finalMode,
      date: paymentDate,
      allocatedSales
    };

    // 8. Auto-create notification (non-blocking)
    try {
      await createNotification(userId, {
        title: `💰 Payment received: ₹${payAmount} from ${customer.name}`,
        type: "success"
      });
    } catch (notifErr) {
      console.warn("[CustomerPaymentService] Notification error:", notifErr.message);
    }

    // 9. Invalidate Financial Intelligence Cache
    try {
      const orgId = tenantId || userId;
      await FinancialCacheService.invalidate(orgId, userId);
    } catch (cErr) {
      console.warn("[CustomerPaymentService] Cache invalidation warning:", cErr.message);
    }

    return {
      success: true,
      payment,
      receipt,
      updatedCustomer: occResult.customer
    };
  },

  /**
   * Revert payment allocation and delete payment (alias for deleteRepayment)
   */
  async revertPaymentAllocation(params) {
    return await this.deleteRepayment(params);
  },

  /**
   * Delete customer payment and reverse invoice allocations & Khata balance
   * 
   * @param {Object} params
   * @param {string} params.userId - Authenticated merchant user ID
   * @param {string} params.paymentId - Payment UUID
   * @param {string} [params.tenantId] - Organization ID
   */
  async deleteRepayment({ userId, paymentId, tenantId = null }) {
    if (!userId || !paymentId) {
      const err = new Error("User ID and Payment ID are required.");
      err.status = 400;
      throw err;
    }

    // 1. Fetch payment to verify ownership & customer link
    const { data: payment, error: fetchErr } = await adminSupabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !payment) {
      const err = new Error("Payment not found or access denied.");
      err.status = 404;
      throw err;
    }

    // 2. Delete payment record
    const { error: deleteError } = await adminSupabase
      .from("payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", userId);

    if (deleteError) throw deleteError;

    // 3. Revert invoice paid amounts (Newest invoices with amount_paid > 0 first)
    const { data: invoices, error: invError } = await adminSupabase
      .from("sales")
      .select("*")
      .eq("customer_id", payment.customer_id)
      .eq("user_id", userId)
      .gt("amount_paid", 0)
      .order("date", { ascending: false });

    if (invError) throw invError;

    let remainingToRevert = parseFloat(payment.amount || 0);

    for (const inv of invoices || []) {
      if (remainingToRevert <= 0.01) break;

      const currentPaid = parseFloat(inv.amount_paid || 0);
      const toDeduct = Math.min(currentPaid, remainingToRevert);
      const newPaid = Math.round((currentPaid - toDeduct) * 100) / 100;

      let newStatus = "partial";
      if (newPaid <= 0.01) {
        newStatus = "unpaid";
      } else if (newPaid >= parseFloat(inv.total) - 0.01) {
        newStatus = "paid";
      }

      await adminSupabase
        .from("sales")
        .update({
          amount_paid: newPaid,
          payment_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", inv.id)
        .eq("user_id", userId);

      remainingToRevert -= toDeduct;
    }

    // 4. Restore customer Khata balance via OCC
    const occResult = await adjustCustomerKhataBalance(
      userId,
      payment.customer_id,
      parseFloat(payment.amount || 0)
    );

    // 5. Invalidate Financial Intelligence Cache
    try {
      const orgId = tenantId || userId;
      await FinancialCacheService.invalidate(orgId, userId);
    } catch (cErr) {
      console.warn("[CustomerPaymentService] Cache invalidation warning:", cErr.message);
    }

    return {
      success: true,
      message: "Payment deleted and balances reverted",
      updatedCustomer: occResult.customer
    };
  }
};
