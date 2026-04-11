import { supabase } from "../config/db.js";

/**
 * Repository for Sales data access
 */
export const SalesRepository = {
    async findAllSales(userId, limit = 100, orderBy = 'date', ascending = false) {
        const { data, error } = await supabase
            .from("sales")
            .select("*, customers(name)")
            .eq("user_id", userId)
            .order(orderBy, { ascending })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    async findSalesByDateRange(userId, startDate, endDate) {
        const { data, error } = await supabase
            .from("sales")
            .select("date, total, created_at")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: true });

        if (error) throw error;
        return data;
    },

    async getSalesForSummary(userId, limit = 1000) {
        const { data, error } = await supabase
            .from("sales")
            .select("date, total, created_at")
            .eq("user_id", userId)
            .order("date", { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    async getTopCustomers(userId, startDate, endDate) {
        let query = supabase
            .from("sales")
            .select(`
        customer:customers (id, name),
        total,
        date
      `).eq("user_id", userId);

        if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getTopProducts(userId, startDate, endDate) {
        // Since we store items in 'sales.items' JSONB, we must fetch sales and aggregated in JS
        let query = supabase
            .from("sales")
            .select("items, date, created_at")
            .eq("user_id", userId);

        if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Flatten items needed by Service
        // We'll return the sales, and Service can aggregate
        return data;
    },

    async findById(userId, id) {
        const { data, error } = await supabase
            .from("sales")
            .select("*")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (error) throw error;
        return data;
    },

    async fetchDateAndTotal(userId) {
        // Fetches date and total for trend calculation
        const { data, error } = await supabase
            .from("sales")
            .select("date, total, created_at")
            .eq("user_id", userId);

        if (error) throw error;
        return data;
    },

    async getSalesForTrend(userId, month, startDate, endDate) {
        let query = supabase
            .from("sales")
            .select("date, total, created_at")
            .eq("user_id", userId)
            .order("date", { ascending: true });

        if (month) {
            const year = new Date().getFullYear();
            const startOfMonth = new Date(year, parseInt(month) - 1, 1);
            const endOfMonth = new Date(year, parseInt(month), 0, 23, 59, 59, 999);
            query = query.gte('date', startOfMonth.toISOString()).lte('date', endOfMonth.toISOString());
        } else if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getSalesWithCustomers(userId, month, startDate, endDate) {
        let query = supabase
            .from("sales")
            .select(`customer:customers(id, name), total, date`)
            .eq("user_id", userId);

        if (month) {
            const year = new Date().getFullYear();
            const startOfMonth = new Date(year, parseInt(month) - 1, 1).toISOString();
            const endOfMonth = new Date(year, parseInt(month), 0).toISOString();
            query = query.gte('date', startOfMonth).lte('date', endOfMonth);
        } else if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getSalesSummaryRaw(userId, limit = 1000) {
        const { data, error } = await supabase
            .from("sales")
            .select("date, total, created_at")
            .eq("user_id", userId)
            .order("date", { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    async deleteById(userId, id) {
        const { error } = await supabase
            .from("sales")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) throw error;
    },

    async getAllForBilling(userId) {
        // Fetch * to be safe against missing column names, letting Service handle mapping
        const { data, error } = await supabase
            .from('sales')
            .select('*')
            .eq("user_id", userId);

        if (error) throw error;
        return data;
    },

    async create(userId, saleData) {
        const { data, error } = await supabase
            .from("sales")
            .insert([{ ...saleData, user_id: userId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(userId, id, updates) {
        const { data, error } = await supabase
            .from("sales")
            .update(updates)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },



    async getRecentSales(userId, limit = 5) {
        const { data, error } = await supabase
            .from("sales")
            .select(`
                id,
                invoice_no,
                date,
                total,
                payment_status,
                customer:customers(name)
            `)
            .eq("user_id", userId)
            .order("date", { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};
