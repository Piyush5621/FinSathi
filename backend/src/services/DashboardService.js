import { supabase } from "../config/db.js";
import { SalesRepository } from "../repositories/SalesRepository.js";
import { CustomerRepository } from "../repositories/CustomerRepository.js";
import { ExpenseRepository } from "../repositories/ExpenseRepository.js";

export const DashboardService = {
    async getDashboardData(userId) {
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        // 1. Fetch Fundamental Data
        const [sales, allExpenses, productsRaw] = await Promise.all([
            SalesRepository.findAllSales(userId, 5000, 'date', false),
            ExpenseRepository.findAll(userId),
            supabase.from('inventory').select('id, name, inventory_batches(stock)').eq('user_id', userId)
        ]);

        const products = productsRaw.data || [];

        // 2. Metrics & Aggregations
        let currentMonthRevenue = 0;
        let lastMonthRevenue = 0;
        let currentMonthOrders = 0;
        let lastMonthOrders = 0;
        let todayRevenue = 0;
        let outstandingAmount = 0;
        let totalProfit = 0;

        const trendMap = {}; 
        const categoryMap = {}; 
        const hourMap = Array(24).fill(0);
        const customerVisitMap = {}; // Customer ID -> count
        const soldProductSet = new Set();
        
        const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        sales.forEach(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            const amount = Number(sale.total ?? sale.amount ?? 0);
            const customerId = sale.customer_id;
            
            // Trend
            const dateKey = saleDate.toISOString().split('T')[0];
            trendMap[dateKey] = (trendMap[dateKey] || 0) + amount;

            // Hour Analysis (Peak Hours)
            const hour = saleDate.getHours();
            hourMap[hour]++;

            if (isSameDay(saleDate, now)) todayRevenue += amount;

            if (saleDate >= startOfCurrentMonth) {
                currentMonthRevenue += amount;
                currentMonthOrders++;
                if (customerId) customerVisitMap[customerId] = (customerVisitMap[customerId] || 0) + 1;
            } else if (saleDate >= startOfLastMonth && saleDate <= endOfLastMonth) {
                lastMonthRevenue += amount;
                lastMonthOrders++;
            }

            // Products sold recently (for Dead Stock)
            if (saleDate >= thirtyDaysAgo && sale.items) {
                sale.items.forEach(item => {
                    if (item.id) soldProductSet.add(item.id);
                    // Profit & Category
                    const price = Number(item.price || item.selling_price || 0);
                    const cost = Number(item.cost_price || 0);
                    const qty = Number(item.quantity || 1);
                    const name = item.name || "General";
                    totalProfit += (price - cost) * qty;
                    categoryMap[name] = (categoryMap[name] || 0) + (price * qty);
                });
            }

            // Dues
            const status = (sale.payment_status || '').toLowerCase();
            if (['unpaid', 'overdue', 'partial'].includes(status)) {
                outstandingAmount += (amount - Number(sale.amount_paid || 0));
            }
        });

        // 3. Customer Loyalty Ratio
        const returningCustomers = Object.values(customerVisitMap).filter(count => count > 1).length;
        const totalActiveCustomers = Object.keys(customerVisitMap).length;
        const loyaltyRatio = totalActiveCustomers > 0 ? Math.round((returningCustomers / totalActiveCustomers) * 100) : 0;

        // 4. Dead Stock (Products not sold in 30 days)
        const deadStock = products.filter(p => !soldProductSet.has(p.id)).slice(0, 5);

        // 5. Expense Aggregation
        const expenseCategories = {};
        allExpenses.forEach(exp => {
            const cat = exp.category || 'Other';
            expenseCategories[cat] = (expenseCategories[cat] || 0) + Number(exp.amount || 0);
        });
        const topExpenses = Object.entries(expenseCategories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        // 6. Forecast (Predicted Dues collection + based on trend)
        // Simple: 70% of current trend projected
        const avgDailyRev = currentMonthOrders > 0 ? currentMonthRevenue / (now.getDate()) : 0;
        const forecast7Days = Math.round(avgDailyRev * 7);

        // 7. Growth & Performance
        const calculateGrowth = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
        const revenueGrowth = calculateGrowth(currentMonthRevenue, lastMonthRevenue);
        const orderGrowth = calculateGrowth(currentMonthOrders, lastMonthOrders);
        const aov = currentMonthOrders > 0 ? Math.round(currentMonthRevenue / currentMonthOrders) : 0;
        const lastMonthAov = lastMonthOrders > 0 ? Math.round(lastMonthRevenue / lastMonthOrders) : 0;
        const aovGrowth = calculateGrowth(aov, lastMonthAov);

        // 8. Peak Hours (Heatmap Data)
        const peakHours = hourMap.map((count, hour) => ({ hour: `${hour}:00`, count }));

        // 9. Formatting
        const trendData = Object.keys(trendMap).sort().map(date => ({
            name: date.split('-').slice(1).join('/'),
            sales: trendMap[date]
        })).slice(-10);

        return {
            metrics: {
                revenue: currentMonthRevenue,
                revenueGrowth,
                orders: currentMonthOrders,
                orderGrowth,
                aov,
                aovGrowth,
                profit: Math.round(totalProfit),
                todayRevenue,
                outstanding: outstandingAmount,
                loyaltyRatio,
                dailyTargetProgress: Math.min(Math.round((todayRevenue / 10000) * 100), 100) // 10k target
            },
            charts: {
                trend: trendData,
                expenses: topExpenses,
                peakHours,
                forecast: forecast7Days
            },
            inventory: {
                deadStock: deadStock.map(p => p.name),
                lowStockCount: products.filter(p => {
                    const stock = (p.inventory_batches || []).reduce((s, b) => s + (b.stock || 0), 0);
                    return stock <= 10;
                }).length
            },
            recentSales: (await SalesRepository.getRecentSales(userId, 6)).map(s => ({
                id: s.id,
                no: s.invoice_no,
                customer: s.customer?.name || "Cash Sale",
                total: s.total,
                status: s.payment_status
            }))
        };
    }
};
