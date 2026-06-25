import { supabase } from "../config/db.js";
import { StoreService } from "../services/StoreService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * Get all suppliers for active store
 */
export const getSuppliers = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = await StoreService.getActiveStore(userId);

    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("user_id", userId)
      .eq("store_id", storeId);

    if (error) throw error;

    return successResponse(res, suppliers, "Suppliers retrieved successfully");
  } catch (err) {
    console.error("getSuppliers Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve suppliers");
  }
};

/**
 * Create new supplier
 */
export const createSupplier = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = await StoreService.getActiveStore(userId);
    const { name, phone, gstin, address, credit_limit } = req.body;

    if (!name) {
      return errorResponse(res, "Supplier name is required", 400);
    }

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .insert([{
        user_id: userId,
        store_id: storeId,
        name,
        phone,
        gstin,
        address,
        credit_limit: credit_limit || 0,
        outstanding_balance: 0,
        performance_score: 100
      }])
      .select("*")
      .single();

    if (error) throw error;

    return createdResponse(res, supplier, "Supplier created successfully");
  } catch (err) {
    console.error("createSupplier Error:", err);
    return errorResponse(res, err, 500, "Failed to create supplier");
  }
};

/**
 * Get Supplier Ledger (POs and Payments list)
 */
export const getSupplierLedger = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: supplierId } = req.params;

    const [posRaw, paymentsRaw] = await Promise.all([
      supabase.from("purchase_orders").select("*").eq("user_id", userId).eq("supplier_id", supplierId),
      supabase.from("supplier_payments").select("*").eq("user_id", userId).eq("supplier_id", supplierId)
    ]);

    if (posRaw.error) throw posRaw.error;
    if (paymentsRaw.error) throw paymentsRaw.error;

    return successResponse(res, {
      purchaseOrders: posRaw.data,
      payments: paymentsRaw.data
    }, "Supplier ledger retrieved");
  } catch (err) {
    console.error("getSupplierLedger Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve supplier ledger");
  }
};

/**
 * Record a payment to supplier
 */
export const recordSupplierPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { supplier_id, purchase_order_id, amount, date, payment_method, ref_no } = req.body;

    if (!supplier_id || !amount || !payment_method) {
      return errorResponse(res, "Missing required parameters", 400);
    }

    // Insert payment
    const { data: payment, error: payErr } = await supabase
      .from("supplier_payments")
      .insert([{
        user_id: userId,
        supplier_id,
        purchase_order_id,
        amount,
        date: date || new Date().toISOString().split("T")[0],
        payment_method,
        ref_no
      }])
      .select("*")
      .single();

    if (payErr) throw payErr;

    // Deduct from supplier outstanding_balance
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("outstanding_balance")
      .eq("id", supplier_id)
      .single();

    const currentBalance = Number(supplier?.outstanding_balance || 0);
    const newBalance = Math.max(0, currentBalance - Number(amount));

    await supabase
      .from("suppliers")
      .update({ outstanding_balance: newBalance })
      .eq("id", supplier_id);

    return createdResponse(res, { payment, newBalance }, "Supplier payment recorded successfully");
  } catch (err) {
    console.error("recordSupplierPayment Error:", err);
    return errorResponse(res, err, 500, "Failed to record payment");
  }
};
