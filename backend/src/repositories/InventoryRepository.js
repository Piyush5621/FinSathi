import { supabase } from "../config/db.js";

export const InventoryRepository = {
    async getLowStockCount(userId, threshold = 10) {
        const { count, error } = await supabase
            .from("inventory")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .lte("stock", threshold);

        if (error) throw error;
        return count;
    },

    async getBatchById(userId, batchId) {
        const { data, error } = await supabase
            .from('inventory_batches')
            .select('stock, id, inventory!inner(user_id)')
            .eq('id', batchId)
            .eq('inventory.user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return { data, error };
    },

    async updateBatch(userId, batchId, updates) {
        // We first verify the batch belongs to the user
        const { data: check, error: checkError } = await supabase
            .from('inventory_batches')
            .select('id, inventory!inner(user_id)')
            .eq('id', batchId)
            .eq('inventory.user_id', userId)
            .single();

        if (checkError) throw new Error("Batch not found or access denied");

        const { error } = await supabase
            .from('inventory_batches')
            .update(updates)
            .eq('id', batchId);

        if (error) throw error;
    },

    async decrementMasterStockLegacy(productId, quantity) {
        const { error } = await supabase.rpc("decrement_stock", {
            row_id: productId,
            quantity_to_subtract: quantity
        });

        if (error) throw error;
    }
};
