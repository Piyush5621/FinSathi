import { supabase } from "../config/db.js";
import { createNotification } from "./notificationHelper.js";
import { CustomerPaymentService } from "../services/CustomerPaymentService.js";

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
    const { name, email, phone, city, address, gstin, credit_limit, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is strictly required." });
    }

    const creditLimitNum = parseFloat(credit_limit);
    const newCustomer = {
      user_id: req.user.id,
      name: name.trim(),
      email: email ? email.trim() : null,
      phone: phone ? phone.trim() : null,
      city: city ? city.trim() : null,
      address: address ? address.trim() : null,
      gstin: gstin ? gstin.trim().toUpperCase() : null,
      notes: notes || null,
      credit_limit: isNaN(creditLimitNum) ? 0 : Math.max(0, creditLimitNum),
      outstanding_balance: 0 // Always initialized to 0; only credit sales increase it
    };

    const { data, error } = await supabase
      .from("customers")
      .insert([newCustomer])
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
 * Update customer profile
 * Route: PUT /api/customers/:id
 * Server-authoritative: explicitly prevents balance tampering
 */
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, city, gstin, credit_limit, notes } = req.body;

    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (email !== undefined) updatePayload.email = email ? email.trim() : null;
    if (phone !== undefined) updatePayload.phone = phone ? phone.trim() : null;
    if (address !== undefined) updatePayload.address = address ? address.trim() : null;
    if (city !== undefined) updatePayload.city = city ? city.trim() : null;
    if (gstin !== undefined) updatePayload.gstin = gstin ? gstin.trim().toUpperCase() : null;
    if (notes !== undefined) updatePayload.notes = notes;
    if (credit_limit !== undefined) {
      const numLimit = parseFloat(credit_limit);
      updatePayload.credit_limit = isNaN(numLimit) ? 0 : Math.max(0, numLimit);
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update." });
    }

    const { data: updatedCustomer, error } = await supabase
      .from("customers")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("*")
      .single();

    if (error) throw error;
    if (!updatedCustomer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Customer profile updated successfully.",
      customer: updatedCustomer
    });
  } catch (err) {
    console.error("Update Customer Error:", err);
    return res.status(500).json({ error: err.message || "Failed to update customer" });
  }
};

/**
 * Record Customer Khata partial or full repayment
 * Route: POST /api/customers/:id/payments
 * Canonical implementation via CustomerPaymentService
 */
export const recordCustomerPayment = async (req, res) => {
  const customerId = req.params.id;
  const userId = req.user.id;
  const { amount, payment_method, payment_mode, paymentMethod, reference, notes, idempotency_key, idempotencyKey, date } = req.body;
  const key = idempotency_key || idempotencyKey || req.headers?.["x-idempotency-key"] || null;
  const mode = payment_method || payment_mode || paymentMethod || "cash";

  try {
    const result = await CustomerPaymentService.recordRepayment({
      userId,
      customerId,
      amount,
      paymentMode: mode,
      reference,
      notes,
      date,
      idempotencyKey: key,
      tenantId: req.tenantId || req.user?.organization_id
    });

    if (result.isDuplicate) {
      return res.status(result.status || 409).json({
        error: result.message,
        payment: result.payment
      });
    }

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully.",
      payment: result.payment,
      customer: result.updatedCustomer,
      receipt: result.receipt
    });
  } catch (err) {
    console.error("Record Customer Payment Error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to process customer payment" });
  }
};