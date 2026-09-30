import { supabase } from "../config/db.js";
import { getPostgresPool } from "../config/postgres.js";

/**
 * Repository for Sales data access
 */
export const SalesRepository = {
    async findSalesWithPagination(userId, options = {}) {
        const pool = getPostgresPool();
        const page = Math.max(1, parseInt(options.page || 1, 10));
        const limit = Math.max(1, Math.min(100, parseInt(options.limit || 20, 10)));
        const offset = (page - 1) * limit;
        const search = (options.search || '').trim();
        const status = (options.status || 'all').toLowerCase();
        const customerId = options.customer_id || options.customerId || null;
        const startDate = options.startDate || null;
        const endDate = options.endDate || null;

        const conditions = [`s.user_id = $1`];
        const params = [userId];

        // Status filter
        if (status && status !== 'all') {
            if (status === 'overdue') {
                conditions.push(`s.payment_status NOT IN ('paid', 'cancelled') AND (s.due_date < CURRENT_DATE OR (s.due_date IS NULL AND s.date < (NOW() - INTERVAL '30 days')))`);
            } else if (status === 'unpaid') {
                conditions.push(`s.payment_status IN ('unpaid', 'partial')`);
            } else if (status === 'paid') {
                conditions.push(`s.payment_status = 'paid'`);
            } else if (status === 'partial') {
                conditions.push(`s.payment_status = 'partial'`);
            } else if (status === 'cancelled') {
                conditions.push(`s.payment_status = 'cancelled'`);
            } else if (status === 'returned') {
                conditions.push(`(s.payment_status = 'returned' OR jsonb_array_length(COALESCE(s.returns, '[]'::jsonb)) > 0)`);
            }
        }

        // Customer filter
        if (customerId) {
            params.push(customerId);
            conditions.push(`s.customer_id = $${params.length}`);
        }

        // Date range filter
        if (startDate) {
            params.push(startDate);
            conditions.push(`s.date >= $${params.length}`);
        }
        if (endDate) {
            params.push(endDate);
            conditions.push(`s.date <= $${params.length}`);
        }

        // Search filter
        if (search) {
            params.push(`%${search}%`);
            const pIdx = params.length;
            conditions.push(`(
                s.invoice_no ILIKE $${pIdx} 
                OR c.name ILIKE $${pIdx} 
                OR c.phone ILIKE $${pIdx} 
                OR s.notes ILIKE $${pIdx}
                OR s.total::text ILIKE $${pIdx}
            )`);
        }

        const whereClause = conditions.join(' AND ');

        // 1. Fetch Paginated Records with joined Customer
        params.push(limit);
        const limitParamIdx = params.length;
        params.push(offset);
        const offsetParamIdx = params.length;

        const client = await pool.connect();
        try {
            const dataQuery = `
                SELECT 
                    s.*,
                    CASE WHEN c.id IS NOT NULL THEN
                        json_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'email', c.email, 'outstanding_balance', c.outstanding_balance)
                    ELSE NULL END as customers
                FROM public.sales s
                LEFT JOIN public.customers c ON s.customer_id = c.id
                WHERE ${whereClause}
                ORDER BY s.date DESC, s.created_at DESC
                LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
            `;
            const dataResult = await client.query(dataQuery, params);

            // 2. Fetch Count & Aggregates
            const countParams = params.slice(0, offsetParamIdx - 2);
            const countQuery = `
                SELECT 
                    COUNT(*)::int as total_count,
                    COALESCE(SUM(s.total), 0)::numeric as total_billed,
                    COALESCE(SUM(s.amount_paid), 0)::numeric as total_paid,
                    COALESCE(SUM(CASE WHEN s.payment_status NOT IN ('paid', 'cancelled') THEN GREATEST(0, s.total - COALESCE(s.amount_paid, 0)) ELSE 0 END), 0)::numeric as pending_due
                FROM public.sales s
                LEFT JOIN public.customers c ON s.customer_id = c.id
                WHERE ${whereClause}
            `;
            const countResult = await client.query(countQuery, countParams);
            const agg = countResult.rows[0] || {};
            const totalCount = Number(agg.total_count || 0);

            return {
                sales: dataResult.rows,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit) || 1
                },
                summary: {
                    totalBilled: Number(agg.total_billed || 0),
                    totalPaid: Number(agg.total_paid || 0),
                    pendingDue: Number(agg.pending_due || 0)
                }
            };
        } finally {
            client.release();
        }
    },

    async findAllSales(userId, limit = 100, orderBy = 'date', ascending = false) {
        const { data, error } = await supabase
            .from("sales")
            .select("*, customers(name, phone, email, outstanding_balance)")
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
            .select("*, customers(id, name, phone, email, outstanding_balance)")
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
