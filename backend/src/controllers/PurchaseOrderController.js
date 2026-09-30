import { supabase } from "../config/db.js";
import { StoreService } from "../services/StoreService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";
import { StockService } from "../modules/inventory/services/StockService.js";
import { FinancialCacheService } from "../utils/cache.js";
import { PurchaseOrderService } from "../modules/purchases/services/PurchaseOrderService.js";
import { PurchaseReceivingService } from "../modules/purchases/services/PurchaseReceivingService.js";
import { PurchaseReturnService } from "../modules/purchases/services/PurchaseReturnService.js";

/**
 * Helper: Log audit trail entry
 */
const logAudit = async (userId, storeId, entityType, entityId, action, details) => {
  try {
    await supabase.from("audit_logs").insert([{
      user_id: userId,
      store_id: storeId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      details,
      table_name: 'purchase_orders',
      record_id: entityId
    }]);
  } catch (err) {
    console.warn("[PurchaseOrderController] Audit log warning:", err.message);
  }
};

/**
 * Get all purchase orders for the authenticated business with advanced filtering
 */
export const getPurchaseOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      store_id, 
      search, 
      status, 
      date_from, 
      date_to, 
      min_amount, 
      max_amount,
      page = 1,
      limit = 50
    } = req.query;

    let targetStoreId = store_id;
    if (targetStoreId) {
      const { data: store } = await supabase
        .from("stores")
        .select("id, user_id")
        .eq("id", targetStoreId)
        .single();
      if (!store || store.user_id !== userId) {
        return errorResponse(res, "Unauthorized store access", 403);
      }
    } else {
      targetStoreId = await StoreService.getActiveStore(userId);
    }

    let query = supabase
      .from("purchase_orders")
      .select("*, suppliers(name, gstin, phone)", { count: 'exact' })
      .eq("user_id", userId);

    if (targetStoreId) {
      query = query.eq("store_id", targetStoreId);
    }
    if (status) query = query.eq("status", status);
    if (date_from) query = query.gte("created_at", date_from);
    if (date_to) query = query.lte("created_at", date_to);
    if (min_amount) query = query.gte("total_amount", min_amount);
    if (max_amount) query = query.lte("total_amount", max_amount);

    if (search && search.trim()) {
      query = query.ilike("order_no", `%${search.trim()}%`);
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query.range(from, to).order("created_at", { ascending: false });

    const { data: pos, count, error } = await query;

    if (error) throw error;

    return successResponse(res, pos || [], "Purchase orders retrieved successfully", {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limitNum)
    });
  } catch (err) {
    console.error("getPurchaseOrders Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve purchase orders");
  }
};

/**
 * Get a specific purchase order with its items and variant details
 */
export const getPurchaseOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(*), stores(name, address)")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (poErr || !po) {
      return errorResponse(res, "Purchase order not found or unauthorized", 404);
    }

    const { data: items, error: itemsErr } = await supabase
      .from("purchase_order_items")
      .select("*, inventory(name, sku, units, cost_price), product_variants(name, sku, attributes)")
      .eq("purchase_order_id", id);

    if (itemsErr) throw itemsErr;

    return successResponse(res, { ...po, items: items || [] }, "Purchase order details retrieved");
  } catch (err) {
    console.error("getPurchaseOrderById Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve purchase order details");
  }
};

/**
 * Create a new purchase order (Atomic via PurchaseOrderService)
 */
export const createPurchaseOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const po = await PurchaseOrderService.createPurchaseOrder(userId, req.body);
    return createdResponse(res, po, "Purchase order created successfully");
  } catch (err) {
    console.error("createPurchaseOrder Error:", err.message);
    const statusCode = err.statusCode || 500;
    return errorResponse(res, err.message || err, statusCode, err.message || "Failed to create purchase order");
  }
};

/**
 * Update an existing purchase order (only if Draft or Sent)
 */
export const updatePurchaseOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updatedPo = await PurchaseOrderService.updatePurchaseOrder(userId, id, req.body);
    return successResponse(res, updatedPo, "Purchase order updated successfully");
  } catch (err) {
    console.error("updatePurchaseOrder Error:", err.message);
    const statusCode = err.statusCode || 500;
    return errorResponse(res, err.message || err, statusCode, err.message || "Failed to update purchase order");
  }
};

/**
 * Delete a purchase order (only if Draft)
 */
export const deletePurchaseOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await PurchaseOrderService.deletePurchaseOrder(userId, id);
    return successResponse(res, result, "Purchase order deleted successfully");
  } catch (err) {
    console.error("deletePurchaseOrder Error:", err.message);
    const statusCode = err.statusCode || 500;
    return errorResponse(res, err.message || err, statusCode, err.message || "Failed to delete purchase order");
  }
};

/**
 * Update Purchase Order status with concurrency-safe row-locking & state machine validation
 */
export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Draft", "Sent", "Accepted", "Partially Received", "Received", "Completed", "Cancelled"];
    if (!status || !allowedStatuses.includes(status)) {
      return errorResponse(res, "Invalid status", 400);
    }

    // Delegate receiving to the canonical atomic PurchaseReceivingService
    if (status === 'Received') {
      const recvResult = await PurchaseReceivingService.receivePurchaseOrder(userId, id, req.body || {});
      return successResponse(res, recvResult.purchaseOrder, `Purchase order status updated to ${recvResult.status}`);
    }

    // All standard state transitions (Draft -> Sent, Sent -> Accepted, Cancelled, Completed)
    const updatedPo = await PurchaseOrderService.updateStatus(userId, id, status);
    return successResponse(res, updatedPo, `Purchase order status updated to ${status}`);
  } catch (err) {
    console.error("updatePurchaseOrderStatus Error:", err.message);
    const statusCode = err.statusCode || 500;
    return errorResponse(res, err.message || err, statusCode, err.message || "Failed to update purchase order status");
  }
};

/**
 * Dedicated Purchase Order Goods Receiving Endpoint
 * POST/PATCH /api/purchase-orders/:id/receive
 */
export const receivePurchaseOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await PurchaseReceivingService.receivePurchaseOrder(userId, id, req.body || {});
    return successResponse(res, result, `Goods received successfully! Status: ${result.status}`);
  } catch (err) {
    console.error("receivePurchaseOrder Error:", err.message);
    const statusCode = err.statusCode || 500;
    return errorResponse(res, err.message || err, statusCode, err.message || "Failed to receive goods");
  }
};

/**
 * Create a Purchase Return against a received/partially received Purchase Order
 * POST /api/purchase-orders/:id/returns
 */
export const createPurchaseReturn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: poId } = req.params;
    const result = await PurchaseReturnService.createReturn(userId, {
      purchase_order_id: poId,
      ...req.body
    });
    return createdResponse(res, result, `Purchase return created successfully! Status: ${result.status}`);
  } catch (err) {
    console.error("createPurchaseReturn Error:", err.message);
    const statusCode = err.statusCode || 500;
    return errorResponse(res, err.message || err, statusCode, err.message || "Failed to create purchase return");
  }
};

/**
 * Get all returns for a specific Purchase Order
 * GET /api/purchase-orders/:id/returns
 */
export const getPurchaseOrderReturns = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: poId } = req.params;
    const returns = await PurchaseReturnService.getReturnsByPoId(userId, poId);
    return successResponse(res, returns, "Purchase order returns retrieved successfully");
  } catch (err) {
    console.error("getPurchaseOrderReturns Error:", err.message);
    const statusCode = err.statusCode || 500;
    return errorResponse(res, err.message || err, statusCode, err.message || "Failed to retrieve purchase returns");
  }
};
