import { SalesRepository } from "../repositories/SalesRepository.js";
import { DashboardRepository } from "../repositories/DashboardRepository.js";

export const AnalyticsService = {
    async getSalesTrend(month, startDate, endDate) {
        const data = await SalesRepository.getSalesForTrend(month, startDate, endDate);

        // Group by date and calculate daily totals
        const dailyTotals = (data || []).reduce((acc, row) => {
            const rawDate = row.date || row.created_at;
            const date = rawDate ? new Date(rawDate).toISOString().split('T')[0] : null;
            if (!date) return acc;
            if (!acc[date]) acc[date] = { date, amount: 0 };
            acc[date].amount += Number(row.total) || 0;
            return acc;
        }, {});

        return Object.values(dailyTotals).sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    async getTopCustomers(month, startDate, endDate, limit = 10) {
        const data = await SalesRepository.getSalesWithCustomers(month, startDate, endDate);

        const customerSums = (data || []).reduce((acc, curr) => {
            if (!curr.customer) return acc;
            const customer = curr.customer.name || 'Unknown Customer';
            const amount = Number(curr.total) || 0;
            acc[customer] = (acc[customer] || 0) + amount;
            return acc;
        }, {});

        return Object.entries(customerSums)
            .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
    },

    async getDashboardSummary() {
        return await DashboardRepository.getSummary();
    },

    async getSalesSummary() {
        const data = await SalesRepository.getSalesSummaryRaw(1000);

        const totalSales = (data || []).reduce((sum, row) => sum + Number(row.total || 0), 0);
        const totalOrders = (data || []).length;
        const avgOrderValue = totalOrders ? Math.round(totalSales / totalOrders) : 0;
        return { totalSales, totalOrders, avgOrderValue };
    },

    async getTopProducts(month, startDate, endDate, limit = 10) {
        let start, end;
        if (month) {
            const year = new Date().getFullYear();
            start = new Date(year, parseInt(month) - 1, 1).toISOString();
            end = new Date(year, parseInt(month), 0).toISOString();
        } else {
            start = startDate;
            end = endDate;
        }

        const sales = await SalesRepository.getTopProducts(start, end);
        if (!sales || sales.length === 0) return [];

        const productSums = {};

        sales.forEach(sale => {
            const items = sale.items; // JSONB
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const name = item.name || item.productName || 'Unknown Product';
                    const amount = Number(item.total || (item.price * item.quantity) || 0);

                    if (!productSums[name]) productSums[name] = 0;
                    productSums[name] += amount;
                });
            }
        });

        return Object.entries(productSums)
            .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
    },

    async getBillingMetrics() {
        let sales;
        try {
            sales = await SalesRepository.getAllForBilling();
        } catch (error) {
            console.error("SalesRepository.getAllForBilling failed:", error);
            // Return empty structure to prevent crash
            return {
                totalInvoices: 0,
                paidCount: 0,
                unpaidCount: 0,
                paidPercentage: 0,
                totalGST: 0,
                totalRevenue: 0,
                averageInvoiceValue: 0,
                metrics: {
                    invoices: { total: 0, paid: 0, unpaid: 0, paidRatio: 0 },
                    financial: { totalRevenue: 0, totalGST: 0, averageInvoiceValue: 0 }
                }
            };
        }

        if (!sales || !Array.isArray(sales)) {
            return {
                totalInvoices: 0,
                paidCount: 0,
                unpaidCount: 0,
                paidPercentage: 0,
                totalGST: 0,
                totalRevenue: 0,
                averageInvoiceValue: 0
            };
        }

        const totalInvoices = sales.length;

        const paidCount = sales.filter(s => (s.payment_status || '').toLowerCase() === 'paid').length;
        const unpaidCount = sales.filter(s => {
            const status = (s.payment_status || '').toLowerCase();
            return status === 'unpaid' || status === 'overdue' || status === 'partial';
        }).length;

        const totalGST = sales.reduce((sum, s) => {
            // 1. Try direct column
            const tax = Number(s.tax_amount);
            if (!isNaN(tax) && tax > 0) return sum + tax;

            // 2. Try legacy gst_percent column
            const gstPercent = Number(s.gst_percent);
            const total = Number(s.total);
            if (!isNaN(gstPercent) && !isNaN(total) && gstPercent > 0) {
                const baseAmount = total / (1 + (gstPercent / 100));
                return sum + (total - baseAmount);
            }

            // 3. Deep Fallback: Calculate from Items JSONB
            if (s.items && Array.isArray(s.items)) {
                const itemTax = s.items.reduce((iSum, item) => {
                    const price = Number(item.price || 0);
                    const qty = Number(item.quantity || 0);
                    const rate = Number(item.gst_percent || 0);
                    if (price && qty && rate) {
                        // Exclusive tax assumption based on current logic? 
                        // Or implicit? Usually FinSathi uses Exclusive in item adder?
                        // Let's assume (Price * Qty * Rate / 100).
                        return iSum + ((price * qty * rate) / 100);
                    }
                    return iSum;
                }, 0);
                if (itemTax > 0) return sum + itemTax;
            }

            return sum;
        }, 0);

        const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const paidRatio = totalInvoices ? (paidCount / totalInvoices) * 100 : 0;
        const averageInvoiceValue = totalInvoices ? totalRevenue / totalInvoices : 0;

        return {
            totalInvoices,
            paidCount,
            unpaidCount,
            paidPercentage: paidRatio.toFixed(1),
            totalGST: Math.round(totalGST),
            totalRevenue,
            averageInvoiceValue: averageInvoiceValue.toFixed(2),
            metrics: {
                invoices: {
                    total: totalInvoices,
                    paid: paidCount,
                    unpaid: unpaidCount,
                    paidRatio: paidRatio.toFixed(1)
                },
                financial: {
                    totalRevenue,
                    totalGST: Math.round(totalGST),
                    averageInvoiceValue: averageInvoiceValue.toFixed(2)
                }
            }
        };
    }
};
