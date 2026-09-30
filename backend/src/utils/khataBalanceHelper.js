import { adminSupabase } from "../admin/adminSupabase.js";

/**
 * Concurrency-Safe Customer Khata Balance Adjustment using Optimistic Concurrency Control (OCC).
 * 
 * Guarantees that concurrent sales, payments, and sales returns never overwrite each other's
 * changes to `customers.outstanding_balance`.
 * 
 * @param {string} userId - Authenticated owner/user ID
 * @param {string} customerId - Target customer UUID
 * @param {number} deltaAmount - Positive to increase dues (credit sale), negative to decrease (repayment/return)
 * @param {number} maxRetries - Max retry attempts upon concurrent collision (default: 5)
 * @returns {Promise<{ previousBalance: number, newBalance: number, customer: object }>}
 */
export async function adjustCustomerKhataBalance(userId, customerId, deltaAmount, maxRetries = 5) {
  if (!customerId) {
    throw new Error("Customer ID is required for Khata balance update.");
  }

  const numericDelta = Math.round(Number(deltaAmount || 0) * 100) / 100;
  if (numericDelta === 0) {
    const { data: current } = await adminSupabase
      .from("customers")
      .select("id, name, outstanding_balance")
      .eq("id", customerId)
      .eq("user_id", userId)
      .single();
    return {
      previousBalance: Number(current?.outstanding_balance || 0),
      newBalance: Number(current?.outstanding_balance || 0),
      customer: current
    };
  }

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;

    // 1. Read current snapshot of customer balance
    const { data: customer, error: fetchErr } = await adminSupabase
      .from("customers")
      .select("id, name, outstanding_balance, user_id")
      .eq("id", customerId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchErr || !customer) {
      throw new Error(`Customer '${customerId}' not found or does not belong to this business.`);
    }

    const previousBalance = Math.round(Number(customer.outstanding_balance || 0) * 100) / 100;
    
    // Strict overpayment rejection: repayment cannot exceed current outstanding balance
    if (numericDelta < 0 && Math.abs(numericDelta) > previousBalance + 0.01) {
      const err = new Error(`Payment amount (₹${Math.abs(numericDelta)}) exceeds customer's outstanding balance (₹${previousBalance}).`);
      err.status = 400;
      throw err;
    }

    const computedNewBalance = Math.max(0, Math.round((previousBalance + numericDelta) * 100) / 100);

    // 2. Perform conditional update: only commit if balance has not changed since our read
    const { data: updatedCustomer, error: updateErr } = await adminSupabase
      .from("customers")
      .update({
        outstanding_balance: computedNewBalance
      })
      .eq("id", customerId)
      .eq("user_id", userId)
      .eq("outstanding_balance", previousBalance) // Optimistic Concurrency Control lock
      .select("id, name, outstanding_balance, credit_limit")
      .maybeSingle();

    if (updateErr) {
      console.error(`[KhataOCC] Database error on attempt ${attempt}:`, updateErr.message);
      throw updateErr;
    }

    if (updatedCustomer) {
      return {
        previousBalance,
        newBalance: computedNewBalance,
        customer: updatedCustomer
      };
    }

    console.warn(`[KhataOCC] Concurrent update detected for customer ${customerId} (attempt ${attempt}/${maxRetries}). Retrying...`);
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 30));
  }

  throw new Error(`Failed to update customer balance after ${maxRetries} concurrent attempts. Please retry.`);
}
