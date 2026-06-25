import { supabase } from "../config/db.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * CatalogNetworkController — Supplier catalog publish and buyer browse
 */

export const getMyCatalogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from("partner_catalogs")
      .select("*, partner_catalog_items(id)")
      .eq("supplier_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return successResponse(res, data, "My catalogs retrieved");
  } catch (err) {
    return errorResponse(res, err, 500, "Failed to fetch catalogs");
  }
};

export const getPartnerCatalogs = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get connected supplier IDs
    const { data: connections } = await supabase
      .from("business_connections")
      .select("requester_id, receiver_id")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted");

    const partnerIds = (connections || []).map(c =>
      c.requester_id === userId ? c.receiver_id : c.requester_id
    );

    if (partnerIds.length === 0) return successResponse(res, [], "No partner catalogs found");

    const { data, error } = await supabase
      .from("partner_catalogs")
      .select("*, supplier:supplier_id(id, business_name, city), partner_catalog_items(id)")
      .in("supplier_id", partnerIds)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return successResponse(res, data, "Partner catalogs retrieved");
  } catch (err) {
    return errorResponse(res, err, 500, "Failed to fetch partner catalogs");
  }
};

export const createCatalog = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { name, description, is_public } = req.body;

    if (!name) return errorResponse(res, "Catalog name is required", 400);

    const { data, error } = await supabase
      .from("partner_catalogs")
      .insert({ supplier_id: supplierId, name, description, is_public: !!is_public })
      .select()
      .single();

    if (error) throw error;
    return createdResponse(res, data, "Catalog created");
  } catch (err) {
    return errorResponse(res, err, 500, "Failed to create catalog");
  }
};

export const updateCatalog = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { id } = req.params;
    const { name, description, is_public } = req.body;

    const { data, error } = await supabase
      .from("partner_catalogs")
      .update({ name, description, is_public, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("supplier_id", supplierId)
      .select()
      .single();

    if (error) throw error;
    return successResponse(res, data, "Catalog updated");
  } catch (err) {
    return errorResponse(res, err, 500, "Failed to update catalog");
  }
};

export const deleteCatalog = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { id } = req.params;
    await supabase.from("partner_catalogs").delete().eq("id", id).eq("supplier_id", supplierId);
    return successResponse(res, null, "Catalog deleted");
  } catch (err) {
    return errorResponse(res, err, 500, "Failed to delete catalog");
  }
};

export const getCatalogItems = async (req, res) => {
  try {
    const { catalog_id } = req.params;
    const { data, error } = await supabase
      .from("partner_catalog_items")
      .select("*")
      .eq("catalog_id", catalog_id)
      .order("product_name");
    if (error) throw error;
    return successResponse(res, data, "Catalog items retrieved");
  } catch (err) {
    return errorResponse(res, err, 500, "Failed to fetch catalog items");
  }
};

export const addCatalogItem = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { catalog_id } = req.params;
    const { product_name, sku, price, mrp, moq, gst_percent, unit, category, brand } = req.body;

    // Verify catalog ownership
    const { data: catalog } = await supabase.from("partner_catalogs").select("id").eq("id", catalog_id).eq("supplier_id", supplierId).single();
    if (!catalog) return errorResponse(res, "Catalog not found", 404);

    const { data, error } = await supabase
      .from("partner_catalog_items")
      .insert({ catalog_id, product_name, sku, price, mrp, moq: moq || 1, gst_percent: gst_percent || 0, unit: unit || "pcs", category, brand })
      .select().single();

    if (error) throw error;
    return createdResponse(res, data, "Catalog item added");
  } catch (err) {
    return errorResponse(res, err, 500, "Failed to add catalog item");
  }
};

export const deleteCatalogItem = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { id } = req.params;

    // Verify ownership via catalog
    const { data: item } = await supabase.from("partner_catalog_items").select("catalog_id").eq("id", id).single();
    if (!item) return errorResponse(res, "Item not found", 404);

    const { data: catalog } = await supabase.from("partner_catalogs").select("id").eq("id", item.catalog_id).eq("supplier_id", supplierId).single();
    if (!catalog) return errorResponse(res, "Not authorized", 403);

    await supabase.from("partner_catalog_items").delete().eq("id", id);
    return successResponse(res, null, "Catalog item deleted");
  } catch (err) {
    return errorResponse(res, err, 500, "Failed to delete catalog item");
  }
};
