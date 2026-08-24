import { supabase } from "../config/db.js";
import { createNotification } from "./notificationHelper.js";
import { FinancialCacheService } from "../utils/cache.js";

/** Get all customers */
export const getCustomers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", req.user.id)
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error("Get Customers Error [500]:", err);
    res.status(500).json({ 
      error: "DATABASE_QUERY_FAILED",
      message: err.message,
      hint: err.hint || "Check if user_id column exists in customers table"
    });
  }
};

/** Add new customer */
export const addCustomer = async (req, res) => {
  try {
    const { name, email, phone, city } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is strictly required." });
    }

    // Perform the insert (✅ Added city so location is tracked)
    const { data, error } = await supabase
      .from("customers")
      .insert([{ 
        user_id: req.user.id, 
        name, 
        email, 
        phone,
        city
      }])
      .select("*");

    if (error) throw error;

    // ✅ Auto-create a notification (non-blocking)
    try {
      await createNotification(req.user.id, {
        title: `🧍‍♂️ New customer registered: ${name}`,
        type: "info",
      });
    } catch (notifError) {
      console.warn("Notification creation failed:", notifError.message);
    }

    res.status(201).json({
      message: "Customer added successfully.",
      customer: data[0],
    });
  } catch (err) {
    console.error("Add Customer Error:", err.message);
    res.status(500).json({ message: err.message || "Failed to add customer" });
  }
};

/**
 * Record Customer Khata partial or full repayment
 * Route: POST /api/customers/:id/payments
 */
export const recordCustomerPayment = async (req, res) => {
  const customerId = req.params.id;
  const userId = req.user.id;
  const { amount, payment_method, payment_mode, reference, notes, idempotency_key, date } = req.body;
  const payAmount = parseFloat(amount);
  const mode = payment_method || payment_mode || "cash";
  const ref = reference || notes || null;
  const idempotencyKey = idempotency_key || req.headers?.["x-idempotency-key"] || null;

  if (isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({ error: "Payment amount must be greater than zero." });
  }

  try {
    // 1. Fetch Customer and verify ownership & balance
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("user_id", userId)
      .single();

    if (custErr || !customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    const currentBalance = parseFloat(customer.outstanding_balance || 0);
    if (currentBalance <= 0) {
      return res.status(400).json({ error: "Customer has no outstanding balance to repay." });
    }

    if (payAmount > currentBalance + 0.01) {
      return res.status(400).json({
        error: `Payment amount (₹${payAmount}) exceeds customer's outstanding balance (₹${currentBalance}).`
      });
    }

    // 2. Idempotency Check: Prevent duplicate payment submissions
    if (idempotencyKey) {
      const { data: existingPay } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("customer_id", customerId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingPay) {
        return res.status(409).json({
          error: "A payment with this idempotency key has already been processed.",
          payment: existingPay
        });
      }
    } else {
      // Check for rapid identical submissions (within last 5 seconds)
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const { data: recentPay } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("customer_id", customerId)
        .eq("amount", payAmount)
        .gte("created_at", fiveSecondsAgo)
        .maybeSingle();

      if (recentPay) {
        return res.status(409).json({
          error: "Duplicate payment submission detected.",
          payment: recentPay
        });
      }
    }

    // 3. Fetch Unpaid Invoices (FIFO - Oldest First)
    const { data: invoices, error: invError } = await supabase
      .from("sales")
      .select("*")
      .eq("customer_id", customerId)
      .eq("user_id", userId)
      .neq("payment_status", "paid")
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });

    if (invError) throw invError;

    // 4. Distribute Payment across Invoices
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

        await supabase
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

    // 5. Update Customer's outstanding balance
    const newCustomerBalance = Math.round(Math.max(0, currentBalance - payAmount) * 100) / 100;
    const { data: updatedCustomer, error: updateCustErr } = await supabase
      .from("customers")
      .update({
        outstanding_balance: newCustomerBalance,
        updated_at: new Date().toISOString()
      })
      .eq("id", customerId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updateCustErr) throw updateCustErr;

    // 6. Record Payment in ledger
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert([{
        user_id: userId,
        customer_id: customerId,
        amount: payAmount,
        date: date || new Date().toISOString(),
        payment_mode: mode,
        reference: ref,
        idempotency_key: idempotencyKey
      }])
      .select()
      .single();

    if (payError) throw payError;

    // 7. Structured Receipt for UI / WhatsApp
    const receipt = {
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      paymentId: payment.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      amountPaid: payAmount,
      previousBalance: currentBalance,
      remainingBalance: newCustomerBalance,
      paymentMethod: mode,
      date: date || new Date().toISOString(),
      allocatedSales
    };

    // Auto-create notification (non-blocking)
    try {
      await createNotification(userId, {
        title: `💰 Payment received: ₹${payAmount} from ${customer.name}`,
        type: "success"
      });
    } catch {}

    // Invalidate Financial Intelligence Cache
    try {
      const orgId = req.tenantId || req.user?.organization_id || userId;
      await FinancialCacheService.invalidate(orgId, userId);
    } catch (cErr) {
      console.warn("[CustomerController] Cache invalidation warning:", cErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully.",
      payment,
      customer: updatedCustomer || { id: customerId, outstanding_balance: newCustomerBalance },
      receipt
    });
  } catch (err) {
    console.error("Record Customer Payment Error:", err);
    return res.status(500).json({ error: err.message || "Failed to process customer payment" });
  }
};