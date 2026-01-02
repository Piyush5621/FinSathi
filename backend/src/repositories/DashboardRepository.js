import { supabase } from "../config/db.js";

export const DashboardRepository = {
    async getSummary() {
        const { data, error } = await supabase
            .from("finsathi_dashboard_summary")
            .select("*")
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'
        return data || {};
    },
};
