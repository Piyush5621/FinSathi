import { supabase } from "../config/db.js";

export const CustomerRepository = {
    async getTotalCount() {
        const { count, error } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true });

        if (error) throw error;
        return count;
    },

    async getNewCustomersCount(sinceDate) {
        const { count, error } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true })
            .gte("created_at", sinceDate);

        if (error) throw error;
        return count;
    },

    async getTotalCount() {
        const { count, error } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true });

        if (error) throw error;
        return count;
    }
};
