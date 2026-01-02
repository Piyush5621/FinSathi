import { SalesRepository } from "../repositories/SalesRepository.js";
import { CustomerRepository } from "../repositories/CustomerRepository.js";
import { InventoryRepository } from "../repositories/InventoryRepository.js";

export const DashboardService = {
    async getDashboardData() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // 1. Fetch Sales Data (Latest 5000 is enough for dashboard stats usually, or we can use DB agg)
        // Using findAllSales with a larger limit or a new Repo method?
        // findAllSales default is 100. Let's explicit call.
        // Actually, dashboardController Logic was fetching ALL sales ("*")? That's heavy.
        // Optimization: Let's fetch last 1000 or use SalesRepository.getSalesForSummary()
        // Fetch fields needed for aggregation: total, date, PAYMENT_STATUS
        // The previous getSalesForSummary ONLY selected date, total, created_at.
        // That is why 'status' was undefined and 'outstandingAmount' was 0.
        // We need to fetch 'payment_status' too.
        // Let's use findAllSales or a new query.
        const sales = await SalesRepository.findAllSales(2000, 'date', false); // This selects payment_status too.

        // Aggregations
        let totalRevenue = 0;
        let todayRevenue = 0;
        let monthRevenue = 0;
        let outstandingAmount = 0;
        let totalGST = 0;

        const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        sales.forEach(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            const amount = Number(sale.total ?? sale.amount ?? 0);

            totalRevenue += amount;

            if (isSameDay(saleDate, today)) {
                todayRevenue += amount;
            }

            if (saleDate >= startOfMonth) {
                monthRevenue += amount;
            }

            // Consistent logic with controller: unpaid, overdue, partial
            const status = (sale.payment_status || '').toLowerCase();
            if (status === 'unpaid' || status === 'overdue' || status === 'partial') {
                // If partial, subtract paid? 
                // DB has amount_paid column (added in migration 01_payments_schema)
                // But migration 09 shows payment settings.
                // Let's check schema. We added "amount_paid" in 01_payments_schema.sql.
                // So we should use that.
                const paid = Number(sale.amount_paid || 0);
                const due = amount - paid;
                if (due > 0) outstandingAmount += due;
            }

            // GST Calculation
            const tax = Number(sale.tax_amount);
            if (!isNaN(tax) && tax > 0) {
                totalGST += tax;
            } else {
                // Fallback if tax_amount is missing but percent and total exist
                const gstPercent = Number(sale.gst_percent);
                if (!isNaN(gstPercent) && gstPercent > 0) {
                    // Assuming inclusive/exclusive based on standard. 
                    // Usually total includes tax. So Tax = Total - (Total / (1 + Rate/100))
                    const base = amount / (1 + (gstPercent / 100));
                    totalGST += (amount - base);
                }
            }
        });

        // 2. Fetch Customer Count
        const totalCustomers = await CustomerRepository.getTotalCount();

        // 3. Fetch Inventory Alerts
        const lowStockCount = await InventoryRepository.getLowStockCount(10);

        // 4. Fetch Recent Transactions
        const recentSalesRaw = await SalesRepository.getRecentSales(5);
        const recentSales = recentSalesRaw.map(s => ({
            ...s,
            customerName: s.customer?.name || "Walk-in"
        }));

        return {
            metrics: {
                totalRevenue,
                todayRevenue,
                monthRevenue,
                totalCustomers: totalCustomers || 0,
                lowStockItems: lowStockCount || 0,
                outstandingPayments: outstandingAmount,
                totalOrders: sales.length,
                totalGST: Math.round(totalGST) // Rounded for clean display
            },
            recentSales
        };
    }
};
