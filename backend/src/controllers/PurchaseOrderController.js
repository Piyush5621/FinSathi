import { supabase } from "../config/db.js";
import { StoreService } from "../services/StoreService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

// Helper for audit logs
const logAudit = async (userId, storeId, entityType, entityId, action, details) => {
  try {
    await supabase.from("audit_logs").insert([{
      user_id: userId,
      store_id: storeId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      details
    }]);
  } catch (err) {
    console.error("Failed to log audit:", err);
  }
};

/**
 * Get all purchase orders for the active store with advanced filtering
 */
export const getPurchaseOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = await StoreService.getActiveStore(userId);
    const { search, status, date_from, date_to, min_amount, max_amount } = req.query;

    let query = supabase
      .from("purchase_orders")
      .select("*, suppliers(name)", { count: 'exact' })
      .eq("user_id", userId)
      .eq("store_id", storeId);

    if (status) query = query.eq("status", status);
    if (date_from) query = query.gte("created_at", date_from);
    if (date_to) query = query.lte("created_at", date_to);
    if (min_amount) query = query.gte("total_amount", min_amount);
    if (max_amount) query = query.lte("total_amount", max_amount);

    if (search) {
      query = query.ilike("order_no", `%${search}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data: pos, error } = await query;

    if (error) throw error;

    return successResponse(res, pos, "Purchase orders retrieved successfully");
  } catch (err) {
    console.error("getPurchaseOrders Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve purchase orders");
  }
};

/**
 * Get a specific purchase order with its items
 */
export const getPurchaseOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(*)")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (poErr) throw poErr;

    const { data: items, error: itemsErr } = await supabase
      .from("purchase_order_items")
      .select("*, inventory(name, sku)")
      .eq("purchase_order_id", id);

    if (itemsErr) throw itemsErr;

    return successResponse(res, { ...po, items }, "Purchase order details retrieved");
  } catch (err) {
    console.error("getPurchaseOrderById Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve purchase order details");
  }
};

/**
 * Create a new purchase order
 */
export const createPurchaseOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = await StoreService.getActiveStore(userId);
    const { supplier_id, order_no, items, tax_amount = 0, discount_amount = 0, notes = '' } = req.body; 

    if (!supplier_id || !order_no || !items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Missing required parameters or items list", 400);
    }

    // Check for duplicate PO
    const { data: existingPo } = await supabase
      .from("purchase_orders")
      .select("id")
      .eq("user_id", userId)
      .eq("order_no", order_no)
      .single();
      
    if (existingPo) {
      return errorResponse(res, "A Purchase Order with this number already exists.", 409);
    }

    let subtotal = 0;
    const normalizedItems = items.map(item => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.cost_price || 0);
      const itemDiscount = Number(item.discount_amount || 0);
      const itemGst = Number(item.gst_rate || 0);
      
      const itemSubtotal = (qty * price) - itemDiscount;
      const tax = itemSubtotal * (itemGst / 100);
      const total = itemSubtotal + tax;
      
      subtotal += itemSubtotal;
      
      return {
        inventory_id: item.inventory_id,
        quantity: qty,
        cost_price: price,
        discount_amount: itemDiscount,
        gst_rate: itemGst,
        total: total
      };
    });

    const totalAmount = subtotal + Number(tax_amount) - Number(discount_amount);

    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert([{
        user_id: userId,
        store_id: storeId,
        supplier_id,
        order_no,
        status: "Draft",
        subtotal,
        tax_amount,
        discount_amount,
        total_amount: totalAmount,
        notes
      }])
      .select("*")
      .single();

    if (poErr) throw poErr;

    const poItems = normalizedItems.map(item => ({
      purchase_order_id: po.id,
      ...item
    }));

    const { error: itemsErr } = await supabase
      .from("purchase_order_items")
      .insert(poItems);

    if (itemsErr) {
      await supabase.from("purchase_orders").delete().eq("id", po.id);
      throw itemsErr;
    }

    await logAudit(userId, storeId, "PurchaseOrder", po.id, "Created", { order_no, total_amount: totalAmount });

    return createdResponse(res, po, "Purchase order created successfully");
  } catch (err) {
    console.error("createPurchaseOrder Error:", err);
    return errorResponse(res, err, 500, "Failed to create purchase order");
  }
};

/**
 * Update an existing purchase order (only if Draft or Sent)
 */
export const updatePurchaseOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const storeId = await StoreService.getActiveStore(userId);
    const { supplier_id, order_no, items, tax_amount = 0, discount_amount = 0, notes = '' } = req.body; 

    const { data: existingPo } = await supabase
      .from("purchase_orders")
      .select("status")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!existingPo) return errorResponse(res, "Purchase order not found", 404);
    if (!['Draft', 'Sent'].includes(existingPo.status)) {
      return errorResponse(res, "Cannot edit a purchase order that is already processed", 409);
    }

    let subtotal = 0;
    const normalizedItems = items.map(item => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.cost_price || 0);
      const itemDiscount = Number(item.discount_amount || 0);
      const itemGst = Number(item.gst_rate || 0);
      const itemSubtotal = (qty * price) - itemDiscount;
      const tax = itemSubtotal * (itemGst / 100);
      const total = itemSubtotal + tax;
      subtotal += itemSubtotal;
      return {
        purchase_order_id: id,
        inventory_id: item.inventory_id,
        quantity: qty,
        cost_price: price,
        discount_amount: itemDiscount,
        gst_rate: itemGst,
        total: total
      };
    });

    const totalAmount = subtotal + Number(tax_amount) - Number(discount_amount);

    // Update PO
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .update({
        supplier_id,
        order_no,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount: totalAmount,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (poErr) throw poErr;

    // Delete old items and insert new ones
    await supabase.from("purchase_order_items").delete().eq("purchase_order_id", id);
    await supabase.from("purchase_order_items").insert(normalizedItems);

    await logAudit(userId, storeId, "PurchaseOrder", id, "Edited", { order_no, total_amount: totalAmount });

    return successResponse(res, po, "Purchase order updated successfully");
  } catch (err) {
    console.error("updatePurchaseOrder Error:", err);
    return errorResponse(res, err, 500, "Failed to update purchase order");
  }
};

/**
 * Delete a purchase order (only if Draft)
 */
export const deletePurchaseOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = await StoreService.getActiveStore(userId);
    const { id } = req.params;

    const { data: po } = await supabase
      .from("purchase_orders")
      .select("status, order_no")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!po) return errorResponse(res, "Purchase order not found", 404);
    if (po.status !== 'Draft') {
      return errorResponse(res, "Only Draft purchase orders can be deleted", 409);
    }

    const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
    if (error) throw error;

    await logAudit(userId, storeId, "PurchaseOrder", id, "Deleted", { order_no: po.order_no });

    return successResponse(res, null, "Purchase order deleted successfully");
  } catch (err) {
    console.error("deletePurchaseOrder Error:", err);
    return errorResponse(res, err, 500, "Failed to delete purchase order");
  }
};

/**
 * Update Purchase Order status with State Machine Validation
 */
export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = await StoreService.getActiveStore(userId);
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Draft", "Sent", "Accepted", "Partially Received", "Received", "Completed", "Cancelled"];
    if (!status || !allowedStatuses.includes(status)) {
      return errorResponse(res, "Invalid status", 400);
    }

    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (poErr || !po) return errorResponse(res, "Purchase order not found", 404);

    // State Machine Validation
    const current = po.status;
    const validTransitions = {
      'Draft': ['Sent', 'Cancelled'],
      'Sent': ['Accepted', 'Cancelled'],
      'Accepted': ['Partially Received', 'Received', 'Cancelled'],
      'Partially Received': ['Received'],
      'Received': ['Completed'],
      'Completed': [],
      'Cancelled': []
    };

    if (!validTransitions[current]?.includes(status)) {
      return errorResponse(res, `Invalid status transition from ${current} to ${status}`, 409);
    }

    // Process Received state side effects
    if (status === 'Received') {
      const { data: items, error: itemsErr } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", id);

      if (itemsErr) throw itemsErr;

      // Note for Tech Debt: This sequential update block should be migrated to a Postgres RPC for atomicity
      for (const item of items) {
        const { data: product } = await supabase
          .from("inventory")
          .select("stock, price, wholesale_price, sku")
          .eq("id", item.inventory_id)
          .single();

        if (product) {
          const currentStock = Number(product.stock || 0);
          const additionalStock = Number(item.quantity || 0);
          const newStock = currentStock + additionalStock;

          // Update master product stock count and avg cost
          await supabase
            .from("inventory")
            .update({ 
              stock: newStock,
              cost_price: item.cost_price // Update last purchase cost
            })
            .eq("id", item.inventory_id);

          // Add to inventory_batches
          await supabase
            .from("inventory_batches")
            .insert([{
              inventory_id: item.inventory_id,
              batch_name: `PO Restock #${po.order_no}`,
              sku_variant: product.sku || "",
              cost_price: Number(item.cost_price || 0),
              selling_price: Number(product.price || 0),
              wholesale_price: Number(product.wholesale_price || 0),
              stock: additionalStock
            }]);
        }
      }

      // 1. Update Supplier's outstanding balance
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("outstanding_balance")
        .eq("id", po.supplier_id)
        .single();

      const newBalance = Number(supplier?.outstanding_balance || 0) + Number(po.total_amount || 0);
      await supabase
        .from("suppliers")
        .update({ outstanding_balance: newBalance })
        .eq("id", po.supplier_id);

      // 2. Finance Integration: Create Expense Entry for Accounts Payable
      await supabase
        .from("expenses")
        .insert([{
          user_id: userId,
          store_id: storeId,
          category: 'Purchases',
          amount: po.total_amount,
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          description: `Purchase Order Received: ${po.order_no}`,
          receipt_url: null,
          supplier_id: po.supplier_id
        }]);
    }

    // Update PO status
    const { data: updatedPo, error: updateErr } = await supabase
      .from("purchase_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    await logAudit(userId, storeId, "PurchaseOrder", id, `Status changed to ${status}`, { order_no: po.order_no });

    return successResponse(res, updatedPo, `Purchase order status updated to ${status}`);
  } catch (err) {
    console.error("updatePurchaseOrderStatus Error:", err);
    return errorResponse(res, err, 500, "Failed to update purchase order status");
  }
};
