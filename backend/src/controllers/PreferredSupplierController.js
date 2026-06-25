import { supabase } from "../config/db.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * PreferredSupplierController — Preferred supplier management and product links
 */

export const getPreferredSuppliers = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("preferred_suppliers")
      .select("*, supplier:supplier_id(id, business_name, city, phone, business_type)")
      .eq("buyer_id", userId)
      .order("priority_order", { ascending: true });

    if (error) throw error;
    return successResponse(res, data, "Preferred suppliers retrieved");
  } catch (err) {
    console.error("getPreferredSuppliers error:", err);
    return errorResponse(res, err, 500, "Failed to fetch preferred suppliers");
  }
};

export const markAsPreferred = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { supplier_id, is_primary, priority_order, auto_match_products, notes } = req.body;

    if (!supplier_id) return errorResponse(res, "supplier_id is required", 400);

    // Verify they're connected
    const { data: conn } = await supabase
      .from("business_connections")
      .select("id")
      .or(`and(requester_id.eq.${buyerId},receiver_id.eq.${supplier_id}),and(requester_id.eq.${supplier_id},receiver_id.eq.${buyerId})`)
      .eq("status", "accepted")
      .maybeSingle();

    if (!conn) return errorResponse(res, "Must be connected with supplier before marking as preferred", 403);

    // If setting as primary, unset previous primary
    if (is_primary) {
      await supabase
        .from("preferred_suppliers")
        .update({ is_primary: false })
        .eq("buyer_id", buyerId)
        .eq("is_primary", true);
    }

    const { data, error } = await supabase
      .from("preferred_suppliers")
      .upsert({
        buyer_id: buyerId,
        supplier_id,
        is_primary: is_primary || false,
        auto_match_products: auto_match_products !== undefined ? auto_match_products : true,
        priority_order: priority_order || 1,
        notes: notes || null
      }, { onConflict: "buyer_id,supplier_id" })
      .select()
      .single();

    if (error) throw error;
    return createdResponse(res, data, "Supplier marked as preferred");
  } catch (err) {
    console.error("markAsPreferred error:", err);
    return errorResponse(res, err, 500, "Failed to mark supplier as preferred");
  }
};

export const removePreferred = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { supplier_id } = req.params;

    const { error } = await supabase
      .from("preferred_suppliers")
      .delete()
      .eq("buyer_id", buyerId)
      .eq("supplier_id", supplier_id);

    if (error) throw error;
    return successResponse(res, null, "Preferred supplier removed");
  } catch (err) {
    console.error("removePreferred error:", err);
    return errorResponse(res, err, 500, "Failed to remove preferred supplier");
  }
};

// Get all product links for a buyer (optional filter by supplier)
export const getProductLinks = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { supplier_id } = req.query;

    let query = supabase
      .from("supplier_product_links")
      .select("*, supplier:supplier_id(id, business_name), inventory:buyer_inventory_id(id, name, stock)")
      .eq("buyer_id", buyerId);

    if (supplier_id) query = query.eq("supplier_id", supplier_id);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return successResponse(res, data, "Product links retrieved");
  } catch (err) {
    console.error("getProductLinks error:", err);
    return errorResponse(res, err, 500, "Failed to fetch product links");
  }
};

// Manually create or update a product link
export const upsertProductLink = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { supplier_id, supplier_product_name, supplier_sku, buyer_inventory_id, auto_import } = req.body;

    if (!supplier_id || !supplier_product_name || !buyer_inventory_id) {
      return errorResponse(res, "supplier_id, supplier_product_name, buyer_inventory_id are required", 400);
    }

    const { data, error } = await supabase
      .from("supplier_product_links")
      .upsert({
        supplier_id,
        buyer_id: buyerId,
        supplier_product_name,
        supplier_sku: supplier_sku || null,
        buyer_inventory_id,
        auto_import: auto_import !== undefined ? auto_import : true,
        confidence_score: 1.0,
        updated_at: new Date().toISOString()
      }, { onConflict: "supplier_id,buyer_id,supplier_product_name" })
      .select()
      .single();

    if (error) throw error;
    return createdResponse(res, data, "Product link saved");
  } catch (err) {
    console.error("upsertProductLink error:", err);
    return errorResponse(res, err, 500, "Failed to save product link");
  }
};

// Get smart reorder suggestion for an inventory item
export const getSmartReorder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { inventory_id } = req.params;

    const { SmartReorderService } = await import("../services/SmartReorderService.js");
    const suggestion = await SmartReorderService.getSuggestedReorder(userId, inventory_id);

    if (suggestion.error) return errorResponse(res, suggestion.error, 404);
    return successResponse(res, suggestion, "Reorder suggestion generated");
  } catch (err) {
    console.error("getSmartReorder error:", err);
    return errorResponse(res, err, 500, "Failed to generate reorder suggestion");
  }
};
