import { supabase } from "../config/db.js";
import { StoreService } from "../services/StoreService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * Get all suppliers for active store with search and pagination
 */
export const getSuppliers = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = await StoreService.getActiveStore(userId);

    let query = supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("store_id", storeId);

    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,gstin.ilike.%${searchTerm}%`);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.range(from, to).order("created_at", { ascending: false });

    const { data: suppliers, count, error } = await query;

    if (error) throw error;

    return successResponse(res, suppliers, "Suppliers retrieved successfully", {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    });
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
 * Update supplier
 */
export const updateSupplier = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = await StoreService.getActiveStore(userId);
    const { id } = req.params;
    const { name, phone, gstin, address, credit_limit } = req.body;

    if (!name) {
      return errorResponse(res, "Supplier name is required", 400);
    }

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .update({
        name,
        phone,
        gstin,
        address,
        credit_limit: credit_limit || 0,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("store_id", storeId)
      .select("*")
      .single();

    if (error) throw error;

    return successResponse(res, supplier, "Supplier updated successfully");
  } catch (err) {
    console.error("updateSupplier Error:", err);
    return errorResponse(res, err, 500, "Failed to update supplier");
  }
};

/**
 * Delete supplier
 */
export const deleteSupplier = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = await StoreService.getActiveStore(userId);
    const { id } = req.params;

    // Check if supplier has pending balance or purchase orders
    const { data: supplier, error: fetchErr } = await supabase
      .from("suppliers")
      .select("outstanding_balance")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
      
    if (fetchErr) throw fetchErr;
    if (supplier && Number(supplier.outstanding_balance) > 0) {
      return errorResponse(res, "Cannot delete supplier with an outstanding balance.", 400);
    }

    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .eq("store_id", storeId);

    if (error) throw error;

    return successResponse(res, null, "Supplier deleted successfully");
  } catch (err) {
    console.error("deleteSupplier Error:", err);
    return errorResponse(res, err, 500, "Failed to delete supplier");
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
      supabase.from("purchase_orders").select("*").eq("user_id", userId).eq("supplier_id", supplierId).order('created_at', { ascending: false }),
      supabase.from("supplier_payments").select("*").eq("user_id", userId).eq("supplier_id", supplierId).order('date', { ascending: false })
    ]);

    if (posRaw.error) throw posRaw.error;
    if (paymentsRaw.error) throw paymentsRaw.error;

    const purchaseOrders = posRaw.data || [];
    const payments = paymentsRaw.data || [];

    const totalPurchases = purchaseOrders.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);
    const pendingPOs = purchaseOrders.filter(po => ['Draft', 'Sent', 'Accepted', 'Partially Received'].includes(po.status)).length;
    const completedPOs = purchaseOrders.filter(po => ['Received', 'Completed'].includes(po.status)).length;
    
    // Get last purchase date (first item since they are ordered by created_at DESC)
    const lastPurchaseDate = purchaseOrders.length > 0 ? purchaseOrders[0].created_at : null;

    return successResponse(res, {
      stats: {
        totalPurchases,
        pendingPOs,
        completedPOs,
        lastPurchaseDate
      },
      purchaseOrders,
      payments
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
