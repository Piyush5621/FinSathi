import { supabase } from "../config/db.js";

export const CustomerRepository = {
    async getTotalCount(userId) {
        const { count, error } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

        if (error) throw error;
        return count;
    },

    async getNewCustomersCount(userId, sinceDate) {
        const { count, error } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", sinceDate);

        if (error) throw error;
        return count;
    }
};
