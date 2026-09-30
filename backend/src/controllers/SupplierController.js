import { supabase } from "../config/db.js";
import { getPostgresPool } from "../config/postgres.js";
import { StoreService } from "../services/StoreService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";
import { SupplierPaymentService } from "../modules/purchases/services/SupplierPaymentService.js";
import { SupplierDiscoveryService } from "../modules/purchases/services/SupplierDiscoveryService.js";

/**
 * Helper: Verify store ownership for an authenticated user.
 * Returns true if store belongs to user, false otherwise.
 */
async function verifyStoreOwnership(userId, storeId) {
  if (!storeId) return true;
  const { data: store, error } = await supabase
    .from("stores")
    .select("id, user_id")
    .eq("id", storeId)
    .single();

  if (error || !store || store.user_id !== userId) {
    return false;
  }
  return true;
}

/**
 * Get all suppliers for authenticated business with search, pagination,
 * optional store filter, and archival status filter.
 */
export const getSuppliers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      search, 
      store_id, 
      strict_store, 
      include_archived, 
      archived_only, 
      page = 1, 
      limit = 50 
    } = req.query;

    let query = supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    // 1. Store Authorization & Scoping
    if (store_id) {
      const isStoreAuthorized = await verifyStoreOwnership(userId, store_id);
      if (!isStoreAuthorized) {
        return errorResponse(res, "Unauthorized store access", 403);
      }
      if (strict_store === "true") {
        query = query.eq("store_id", store_id);
      } else {
        query = query.or(`store_id.eq.${store_id},store_id.is.null`);
      }
    }

    // 2. Archival filter (active by default)
    if (archived_only === "true") {
      query = query.eq("is_archived", true);
    } else if (include_archived !== "true") {
      query = query.eq("is_archived", false);
    }

    // 3. Search filter
    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,gstin.ilike.%${term}%,email.ilike.%${term}%`);
    }

    // 4. Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query.range(from, to).order("name", { ascending: true });

    const { data: suppliers, count, error } = await query;

    if (error) throw error;

    return successResponse(res, suppliers || [], "Suppliers retrieved successfully", {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limitNum)
    });
  } catch (err) {
    console.error("getSuppliers Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve suppliers");
  }
};

/**
 * Get supplier by ID with business ownership verification.
 */
export const getSupplierById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !supplier) {
      return errorResponse(res, "Supplier not found or unauthorized", 404);
    }

    return successResponse(res, supplier, "Supplier retrieved successfully");
  } catch (err) {
    console.error("getSupplierById Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve supplier");
  }
};

/**
 * Create new supplier under the authenticated business.
 */
export const createSupplier = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, email, gstin, address, credit_limit, store_id } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, "Supplier name is required", 400);
    }

    // Store scoping authorization
    let targetStoreId = null;
    if (store_id !== undefined && store_id !== null) {
      const isAuthorized = await verifyStoreOwnership(userId, store_id);
      if (!isAuthorized) {
        return errorResponse(res, "Unauthorized: Store does not belong to your business", 403);
      }
      targetStoreId = store_id;
    } else if (store_id === undefined) {
      // Default to active store if not explicitly passed as null
      targetStoreId = await StoreService.getActiveStore(userId);
    }

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .insert([{
        user_id: userId,
        store_id: targetStoreId,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        gstin: gstin ? gstin.trim() : null,
        address: address ? address.trim() : null,
        credit_limit: Number(credit_limit) || 0,
        outstanding_balance: 0,
        performance_score: 100,
        is_archived: false
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
 * Update supplier with business and store ownership verification.
 */
export const updateSupplier = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, phone, email, gstin, address, credit_limit, store_id } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, "Supplier name is required", 400);
    }

    // 1. Verify supplier belongs to user (Business Ownership)
    const { data: existingSupplier, error: fetchErr } = await supabase
      .from("suppliers")
      .select("id, user_id, store_id, is_archived")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !existingSupplier) {
      return errorResponse(res, "Supplier not found or unauthorized", 404);
    }

    // 2. Validate store ownership if changing store_id
    let updateStoreId = existingSupplier.store_id;
    if (store_id !== undefined) {
      if (store_id !== null) {
        const isAuthorized = await verifyStoreOwnership(userId, store_id);
        if (!isAuthorized) {
          return errorResponse(res, "Unauthorized: Store does not belong to your business", 403);
        }
        updateStoreId = store_id;
      } else {
        updateStoreId = null;
      }
    }

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .update({
        name: name.trim(),
        phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
        email: email !== undefined ? (email ? email.trim() : null) : undefined,
        gstin: gstin !== undefined ? (gstin ? gstin.trim() : null) : undefined,
        address: address !== undefined ? (address ? address.trim() : null) : undefined,
        credit_limit: credit_limit !== undefined ? (Number(credit_limit) || 0) : undefined,
        store_id: updateStoreId,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", userId)
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
 * Delete supplier:
 * - If supplier has ANY historical records (POs, Payments, Expenses, Returns, or Balance > 0),
 *   automatically safe-archive instead of hard-deleting.
 * - If supplier has ZERO history and 0 balance, safely hard-delete.
 */
export const deleteSupplier = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // 1. Fetch supplier with ownership verification
    const { data: supplier, error: fetchErr } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !supplier) {
      return errorResponse(res, "Supplier not found or unauthorized", 404);
    }

    // 2. Check for historical transactions:
    const [poRes, payRes, expRes, retRes] = await Promise.all([
      supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("supplier_id", id),
      supabase.from("supplier_payments").select("id", { count: "exact", head: true }).eq("supplier_id", id),
      supabase.from("expenses").select("id", { count: "exact", head: true }).eq("supplier_id", id),
      supabase.from("purchase_returns").select("id", { count: "exact", head: true }).eq("supplier_id", id)
    ]);

    const hasHistory = 
      (poRes.count || 0) > 0 ||
      (payRes.count || 0) > 0 ||
      (expRes.count || 0) > 0 ||
      (retRes.count || 0) > 0 ||
      Number(supplier.outstanding_balance || 0) > 0;

    if (hasHistory) {
      // ARCHIVE: Safe archival preserves historical financial integrity
      const { data: archivedSupplier, error: archErr } = await supabase
        .from("suppliers")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (archErr) throw archErr;

      return successResponse(
        res, 
        { supplier: archivedSupplier, action: "archived" }, 
        "Supplier has historical activity and was safely archived."
      );
    } else {
      // DELETE: Safe hard delete for suppliers with zero historical activity
      const { error: delErr } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (delErr) throw delErr;

      return successResponse(res, { id, action: "deleted" }, "Supplier deleted successfully");
    }
  } catch (err) {
    console.error("deleteSupplier Error:", err);
    return errorResponse(res, err, 500, "Failed to process supplier deletion");
  }
};

/**
 * Explicitly archive a supplier
 */
export const archiveSupplier = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !supplier) {
      return errorResponse(res, "Supplier not found or unauthorized", 404);
    }

    return successResponse(res, supplier, "Supplier archived successfully");
  } catch (err) {
    console.error("archiveSupplier Error:", err);
    return errorResponse(res, err, 500, "Failed to archive supplier");
  }
};

/**
 * Restore an archived supplier
 */
export const restoreSupplier = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .update({
        is_archived: false,
        archived_at: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !supplier) {
      return errorResponse(res, "Supplier not found or unauthorized", 404);
    }

    return successResponse(res, supplier, "Supplier restored successfully");
  } catch (err) {
    console.error("restoreSupplier Error:", err);
    return errorResponse(res, err, 500, "Failed to restore supplier");
  }
};

/**
 * Get Supplier Ledger (POs and Payments list)
 */
export const getSupplierLedger = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: supplierId } = req.params;

    // Verify supplier exists and belongs to user
    const { data: supplier, error: suppErr } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", supplierId)
      .eq("user_id", userId)
      .single();

    if (suppErr || !supplier) {
      return errorResponse(res, "Supplier not found or unauthorized", 404);
    }

    const [posRaw, paymentsRaw, returnsRaw] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select("*")
        .eq("user_id", userId)
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false }),
      supabase
        .from("supplier_payments")
        .select("*")
        .eq("user_id", userId)
        .eq("supplier_id", supplierId)
        .order("date", { ascending: false }),
      supabase
        .from("purchase_returns")
        .select("*, purchase_orders(order_no)")
        .eq("user_id", userId)
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false })
    ]);

    if (posRaw.error) throw posRaw.error;
    if (paymentsRaw.error) throw paymentsRaw.error;
    if (returnsRaw.error) throw returnsRaw.error;

    const purchaseOrders = posRaw.data || [];
    const payments = paymentsRaw.data || [];
    const returns = returnsRaw.data || [];

    const totalPurchases = purchaseOrders.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalReturns = returns.reduce((sum, r) => sum + Number(r.total_return_amount || 0), 0);

    const pendingPOs = purchaseOrders.filter(po => 
      ["Draft", "Sent", "Accepted", "Partially Received"].includes(po.status)
    ).length;
    const completedPOs = purchaseOrders.filter(po => 
      ["Received", "Completed"].includes(po.status)
    ).length;
    const lastPurchaseDate = purchaseOrders.length > 0 ? purchaseOrders[0].created_at : null;

    return successResponse(res, {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        gstin: supplier.gstin,
        outstanding_balance: supplier.outstanding_balance,
        is_archived: supplier.is_archived
      },
      stats: {
        totalPurchases,
        totalPayments,
        totalReturns,
        pendingPOs,
        completedPOs,
        lastPurchaseDate
      },
      purchaseOrders,
      payments,
      returns
    }, "Supplier ledger retrieved");
  } catch (err) {
    console.error("getSupplierLedger Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve supplier ledger");
  }
};

/**
 * Record a payment to supplier (Atomic PostgreSQL Transaction)
 */
export const recordSupplierPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const idempotencyKey = req.headers?.["x-idempotency-key"] || req.body?.idempotency_key || req.body?.idempotencyKey || null;

    const result = await SupplierPaymentService.recordPayment(userId, req.body, { idempotencyKey });

    return createdResponse(res, { 
      payment: result.payment, 
      newBalance: result.newBalance,
      previousBalance: result.previousBalance,
      idempotent: result.idempotent 
    }, "Supplier payment recorded successfully");
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("recordSupplierPayment Error:", err);
    return errorResponse(res, err, 500, "Failed to record payment");
  }
};

/**
  * Discover public suppliers with search, category, and radius filters
  */
export const discoverSuppliers = async (req, res) => {
  try {
    const userId = req.user.id;
    const results = await SupplierDiscoveryService.discoverSuppliers(userId, req.query);
    return successResponse(res, results, "Suppliers discovered successfully");
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("discoverSuppliers Error:", err);
    return errorResponse(res, err, 500, "Failed to discover suppliers");
  }
};

/**
  * Get public details and product catalog of a discoverable supplier
  */
export const getDiscoveredSupplierDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.query;
    const details = await SupplierDiscoveryService.getDiscoveredSupplierById(id, { latitude, longitude });
    return successResponse(res, details, "Supplier details retrieved successfully");
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("getDiscoveredSupplierDetails Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve supplier details");
  }
};

/**
  * Publish/update a product in supplier's catalog (Supplier owner action)
  */
export const publishSupplierProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const product = await SupplierDiscoveryService.publishSupplierProduct(userId, id, req.body);
    return createdResponse(res, product, "Supplier product published successfully");
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("publishSupplierProduct Error:", err);
    return errorResponse(res, err, 500, "Failed to publish supplier product");
  }
};

/**
  * Toggle discoverability & update discovery profile for a supplier (Supplier owner action)
  */
export const setSupplierDiscoverability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { is_discoverable, ...profileData } = req.body;
    const updated = await SupplierDiscoveryService.setSupplierDiscoverability(userId, id, is_discoverable, profileData);
    return successResponse(res, updated, "Supplier discoverability updated");
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("setSupplierDiscoverability Error:", err);
    return errorResponse(res, err, 500, "Failed to update supplier discoverability");
  }
};

/**
 * Get products offered by a supplier (from supplier_products or supplier's published inventory)
 */
export const getSupplierProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPostgresPool();

    // 1. Check if supplier exists
    const suppRes = await pool.query(
      `SELECT id, name, user_id, is_discoverable FROM public.suppliers WHERE id = $1`,
      [id]
    );

    if (suppRes.rows.length === 0) {
      return errorResponse(res, "Supplier not found", 404);
    }

    const supplier = suppRes.rows[0];

    // 2. Fetch from supplier_products
    const spRes = await pool.query(`
      SELECT 
        id, supplier_id, product_name, sku, category, brand, unit,
        price, available_quantity, min_order_quantity, is_available, is_discoverable
      FROM public.supplier_products
      WHERE supplier_id = $1 AND (is_available IS NULL OR is_available = true)
      ORDER BY product_name ASC
    `, [id]);

    let products = spRes.rows;

    // 3. Fallback: If no supplier_products explicitly created yet, but supplier is mapped to a registered merchant store:
    if (products.length === 0 && supplier.user_id) {
      const invRes = await pool.query(`
        SELECT 
          id, name as product_name, sku, company as brand, units as unit,
          coalesce(wholesale_price, cost_price, price) as price,
          stock as available_quantity, 1 as min_order_quantity
        FROM public.inventory
        WHERE user_id = $1 AND (status IS NULL OR status != 'archived')
        ORDER BY name ASC
      `, [supplier.user_id]);

      products = invRes.rows.map(item => ({
        ...item,
        supplier_id: supplier.id,
        is_available: true,
        is_discoverable: true
      }));
    }

    return successResponse(res, products, "Supplier products retrieved successfully");
  } catch (err) {
    console.error("getSupplierProducts Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve supplier products");
  }
};
