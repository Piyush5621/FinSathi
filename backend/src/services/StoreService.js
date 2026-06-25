import { supabase } from "../config/db.js";

export const StoreService = {
  /**
   * Retrieves the current active store ID for a user.
   * If none exists, creates a default store and returns its ID.
   */
  async getActiveStore(userId) {
    try {
      // 1. Check preferences
      const { data: pref, error: prefErr } = await supabase
        .from("user_store_preferences")
        .select("active_store_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (prefErr) throw prefErr;

      if (pref && pref.active_store_id) {
        return pref.active_store_id;
      }

      // 2. If no preferences exist, check if user has any stores
      const { data: stores, error: storesErr } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (storesErr) throw storesErr;

      if (stores && stores.length > 0) {
        // Set this store as active in preferences
        const activeId = stores[0].id;
        await supabase
          .from("user_store_preferences")
          .upsert({ user_id: userId, active_store_id: activeId });
        return activeId;
      }

      // 3. If no stores exist, create a default store
      const { data: user } = await supabase
        .from("users")
        .select("business_name")
        .eq("id", userId)
        .single();

      const { data: newStore, error: insertStoreErr } = await supabase
        .from("stores")
        .insert([{
          user_id: userId,
          name: user?.business_name || "Main Branch",
          address: "Head Office Address",
          is_active: true
        }])
        .select("id")
        .single();

      if (insertStoreErr) throw insertStoreErr;

      const activeId = newStore.id;
      await supabase
        .from("user_store_preferences")
        .upsert({ user_id: userId, active_store_id: activeId });

      return activeId;
    } catch (err) {
      console.error("StoreService getActiveStore Exception:", err.message);
      return null;
    }
  }
};
