import { supabase } from "../config/db.js";

/**
 * Repository for Sales data access
 */
export const SalesRepository = {
    async findAllSales(limit = 100, orderBy = 'date', ascending = false) {
        const { data, error } = await supabase
            .from("sales")
            .select("*")
            .order(orderBy, { ascending })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    async findSalesByDateRange(startDate, endDate) {
        const { data, error } = await supabase
            .from("sales")
            .select("date, total, created_at")
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: true });

        if (error) throw error;
        return data;
    },

    async getSalesForSummary(limit = 1000) {
        const { data, error } = await supabase
            .from("sales")
            .select("date, total, created_at")
            .order("date", { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    async getTopCustomers(startDate, endDate) {
        let query = supabase
            .from("sales")
            .select(`
        customer:customers (id, name),
        total,
        date
      `);

        if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getTopProducts(startDate, endDate) {
        // Since we store items in 'sales.items' JSONB, we must fetch sales and aggregated in JS
        let query = supabase
            .from("sales")
            .select("items, date, created_at");

        if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Flatten items needed by Service
        // We'll return the sales, and Service can aggregate
        return data;
    },

    async findById(id) {
        const { data, error } = await supabase
            .from("sales")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;
        return data;
    },

    async fetchDateAndTotal() {
        // Fetches date and total for trend calculation
        const { data, error } = await supabase
            .from("sales")
            .select("date, total, created_at");

        if (error) throw error;
        return data;
    },

    async getSalesForTrend(month, startDate, endDate) {
        let query = supabase
            .from("sales")
            .select("date, total, created_at")
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

    async getSalesWithCustomers(month, startDate, endDate) {
        let query = supabase
            .from("sales")
            .select(`customer:customers(id, name), total, date`);

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

    async getSalesSummaryRaw(limit = 1000) {
        const { data, error } = await supabase
            .from("sales")
            .select("date, total, created_at")
            .order("date", { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    async deleteById(id) {
        const { error } = await supabase
            .from("sales")
            .delete()
            .eq("id", id);

        if (error) throw error;
    },

    async getAllForBilling() {
        // Fetch * to be safe against missing column names, letting Service handle mapping
        const { data, error } = await supabase
            .from('sales')
            .select('*');

        if (error) throw error;
        return data;
    },

    async create(saleData) {
        const { data, error } = await supabase
            .from("sales")
            .insert([saleData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from("sales")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },



    async getRecentSales(limit = 5) {
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
            .order("date", { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};
