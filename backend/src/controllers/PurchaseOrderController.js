import { supabase } from "../config/db.js";
import { StoreService } from "../services/StoreService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * Get all purchase orders for the active store
 */
export const getPurchaseOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const storeId = await StoreService.getActiveStore(userId);

    const { data: pos, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(name)")
      .eq("user_id", userId)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

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
    const { supplier_id, order_no, items } = req.body; // items: [{ inventory_id, quantity, cost_price }]

    if (!supplier_id || !order_no || !items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Missing required parameters or items list", 400);
    }

    // 1. Calculate total amount
    let totalAmount = 0;
    const normalizedItems = items.map(item => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.cost_price || 0);
      const subtotal = qty * price;
      totalAmount += subtotal;
      return {
        inventory_id: item.inventory_id,
        quantity: qty,
        cost_price: price,
        total: subtotal
      };
    });

    // 2. Insert PO
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert([{
        user_id: userId,
        store_id: storeId,
        supplier_id,
        order_no,
        status: "Draft",
        total_amount: totalAmount
      }])
      .select("*")
      .single();

    if (poErr) throw poErr;

    // 3. Insert items
    const poItems = normalizedItems.map(item => ({
      purchase_order_id: po.id,
      ...item
    }));

    const { error: itemsErr } = await supabase
      .from("purchase_order_items")
      .insert(poItems);

    if (itemsErr) {
      // Cleanup PO on failure
      await supabase.from("purchase_orders").delete().eq("id", po.id);
      throw itemsErr;
    }

    return createdResponse(res, po, "Purchase order created successfully");
  } catch (err) {
    console.error("createPurchaseOrder Error:", err);
    return errorResponse(res, err, 500, "Failed to create purchase order");
  }
};

/**
 * Update Purchase Order status (handles RESTOCKING auto-updates)
 */
export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body; // Draft, Sent, Approved, Received, Completed

    const allowedStatuses = ["Draft", "Sent", "Approved", "Received", "Completed"];
    if (!status || !allowedStatuses.includes(status)) {
      return errorResponse(res, "Invalid status transition", 400);
    }

    // 1. Fetch current PO details and items
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (poErr || !po) {
      return errorResponse(res, "Purchase order not found", 404);
    }

    // Prevent re-processing if already received/completed
    const isAlreadyStocked = ["Received", "Completed"].includes(po.status);
    const isTransitioningToStocked = ["Received", "Completed"].includes(status);

    // Update status in db
    const { data: updatedPo, error: updateErr } = await supabase
      .from("purchase_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    // 2. Trigger Inventory RESTOCKING auto-update
    if (isTransitioningToStocked && !isAlreadyStocked) {
      // Fetch PO Items
      const { data: items, error: itemsErr } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", id);

      if (itemsErr) throw itemsErr;

      // Loop and update inventory
      for (const item of items) {
        // A. Fetch parent product info to get pricing details for the new batch
        const { data: product } = await supabase
          .from("inventory")
          .select("stock, price, wholesale_price, sku")
          .eq("id", item.inventory_id)
          .single();

        if (product) {
          const currentStock = Number(product.stock || 0);
          const additionalStock = Number(item.quantity || 0);
          const newStock = currentStock + additionalStock;

          // B. Update master product stock count
          await supabase
            .from("inventory")
            .update({ stock: newStock })
            .eq("id", item.inventory_id);

          // C. Add to inventory_batches
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

      // Update supplier's outstanding balance since goods are delivered
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("outstanding_balance")
        .eq("id", po.supplier_id)
        .single();

      const currentBalance = Number(supplier?.outstanding_balance || 0);
      const newBalance = currentBalance + Number(po.total_amount || 0);

      await supabase
        .from("suppliers")
        .update({ outstanding_balance: newBalance })
        .eq("id", po.supplier_id);
    }

    return successResponse(res, updatedPo, `Purchase order status updated to ${status}`);
  } catch (err) {
    console.error("updatePurchaseOrderStatus Error:", err);
    return errorResponse(res, err, 500, "Failed to update purchase order status");
  }
};
