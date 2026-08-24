import { supabase } from "../config/db.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * Get all stores for a user/staff, including which one is active in preferences
 */
export const getStores = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const staffId = req.user.staff_id;

    let stores = [];

    if (staffId) {
      // 1. Staff: Query stores assigned in store_staff
      const { data: assignments, error: assignErr } = await supabase
        .from("store_staff")
        .select("store_id, stores(*), roles(name)")
        .eq("staff_id", staffId);

      if (assignErr) throw assignErr;

      stores = (assignments || [])
        .map(a => ({
          ...a.stores,
          assigned_role: a.roles?.name
        }))
        .filter(st => Boolean(st && st.id));
    } else {
      // 2. Owner: Get all stores owned by user
      const { data: ownerStores, error: storesErr } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", userId);

      if (storesErr) throw storesErr;
      stores = ownerStores || [];
    }

    // 3. Get active store preference
    const prefKey = staffId ? `staff_${staffId}` : userId;
    const { data: pref, error: prefErr } = await supabase
      .from("user_store_preferences")
      .select("active_store_id")
      .eq("user_id", prefKey)
      .maybeSingle();

    if (prefErr && prefErr.code !== 'PGRST116') console.warn("prefErr:", prefErr.message);

    const activeStoreId = pref?.active_store_id || (stores.length > 0 ? stores[0].id : null);

    return successResponse(res, {
      stores,
      activeStoreId
    }, "Stores and active preference retrieved");
  } catch (err) {
    console.error("getStores Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve stores");
  }
};

/**
 * Create a new store branch (Owner Only)
 */
export const createStore = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const staffId = req.user.staff_id;

    if (staffId) {
      return errorResponse(res, "Only business owners can create new store branches", 403);
    }

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
    const userId = req.user.id || req.user.user_id;
    const staffId = req.user.staff_id;
    const { id: storeId } = req.params;

    if (staffId) {
      // 1. Verify staff is assigned to this store
      const { data: assignment, error: assignErr } = await supabase
        .from("store_staff")
        .select("id, store_id, role_id")
        .eq("staff_id", staffId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (assignErr) throw assignErr;
      if (!assignment) {
        return errorResponse(res, "You are not assigned to this store branch", 403);
      }

      // Update staff store preference
      const prefKey = `staff_${staffId}`;
      const { data: updatedPref } = await supabase
        .from("user_store_preferences")
        .upsert({
          user_id: prefKey,
          active_store_id: storeId,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" })
        .select("*")
        .single();

      return successResponse(res, { active_store_id: storeId, assignment }, "Switched active store branch successfully");
    } else {
      // 2. Owner: Verify the store belongs to the user
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
    }
  } catch (err) {
    console.error("switchStore Error:", err);
    return errorResponse(res, err, 500, "Failed to switch store context");
  }
};
