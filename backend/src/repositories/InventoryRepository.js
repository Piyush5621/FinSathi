import { supabase } from "../config/db.js";

export const InventoryRepository = {
    async getLowStockCount(threshold = 10) {
        const { count, error } = await supabase
            .from("inventory")
            .select("*", { count: "exact", head: true })
            .lte("stock", threshold);

        if (error) throw error;
        return count;
    },

    async getBatchById(batchId) {
        const { data, error } = await supabase
            .from('inventory_batches')
            .select('stock, id')
            .eq('id', batchId)
            .single();

        // Supabase returns error if not found? Or null data? 
        // Usually error PGRST116 for .single() if no rows.
        // We'll let the service handle "not found" checks if error is suppressed, 
        // but here we throw if it's a real DB error.
        if (error && error.code !== 'PGRST116') throw error;
        return { data, error };
    },

    async updateBatch(batchId, updates) {
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
