import { supabase } from "../config/db.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * Get all stores for a user, including which one is active in preferences
 */
export const getStores = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get all stores
    const { data: stores, error: storesErr } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", userId);

    if (storesErr) throw storesErr;

    // 2. Get active store preference
    const { data: pref, error: prefErr } = await supabase
      .from("user_store_preferences")
      .select("active_store_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (prefErr) throw prefErr;

    return successResponse(res, {
      stores,
      activeStoreId: pref?.active_store_id || null
    }, "Stores and active preference retrieved");
  } catch (err) {
    console.error("getStores Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve stores");
  }
};

/**
 * Create a new store branch
 */
export const createStore = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, address, phone, gstin } = req.body;

    if (!name) {
      return errorResponse(res, "Store name is required", 400);
    }

    const { data: newStore, error: storeErr } = await supabase
      .from("stores")
      .insert([{
        user_id: userId,
        name,
        address,
        phone,
        gstin,
        is_active: true
      }])
      .select("*")
      .single();

    if (storeErr) throw storeErr;

    // If no active store preference exists yet, set this as active
    const { data: pref } = await supabase
      .from("user_store_preferences")
      .select("active_store_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!pref || !pref.active_store_id) {
      await supabase
        .from("user_store_preferences")
        .upsert({ user_id: userId, active_store_id: newStore.id });
    }

    return createdResponse(res, newStore, "Store branch created successfully");
  } catch (err) {
    console.error("createStore Error:", err);
    return errorResponse(res, err, 500, "Failed to create store branch");
  }
};

/**
 * Switch active store context
 */
export const switchStore = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: storeId } = req.params;

    // Verify the store belongs to the user
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (storeErr) throw storeErr;
    if (!store) {
      return errorResponse(res, "Store not found or unauthorized access", 404);
    }

    // Update user preferences
    const { data: updatedPref, error: prefErr } = await supabase
      .from("user_store_preferences")
      .upsert({
        user_id: userId,
        active_store_id: storeId,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })
      .select("*")
      .single();

    if (prefErr) throw prefErr;

    return successResponse(res, updatedPref, "Switched active store context successfully");
  } catch (err) {
    console.error("switchStore Error:", err);
    return errorResponse(res, err, 500, "Failed to switch store context");
  }
};
