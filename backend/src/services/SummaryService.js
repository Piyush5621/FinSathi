import { SalesRepository } from "../repositories/SalesRepository.js";
import { CustomerRepository } from "../repositories/CustomerRepository.js";

export const SummaryService = {
    async getSmartSummary() {
        // Get total sales in last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

        const recentSales = await SalesRepository.findSalesByDateRange(sevenDaysAgo, new Date().toISOString());

        // Calculate total and growth
        const totalSales = recentSales.reduce((sum, s) => sum + (s.total || 0), 0);

        // Previous week sales
        const prevWeekSales = await SalesRepository.findSalesByDateRange(fourteenDaysAgo, sevenDaysAgo);

        const prevTotal = prevWeekSales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
        const growth =
            prevTotal === 0 ? 100 : (((totalSales - prevTotal) / prevTotal) * 100).toFixed(1);

        // Get total customers this week - Need a new Repo method for filtering customers by date
        // Or assume CustomerRepository has standard filter
        // Adding getNewCustomersCount to CustomerRepository
        const newCustomers = await CustomerRepository.getNewCustomersCount(sevenDaysAgo);

        // Smart summary generation
        const summary = {
            totalSales,
            growth,
            newCustomers,
            insights: [
                `Your weekly sales reached ₹${totalSales.toLocaleString()}.`,
                growth > 0
                    ? `Sales increased by ${growth}% compared to last week.`
                    : `Sales decreased by ${Math.abs(growth)}%.`,
                `${newCustomers} new customers joined FinSathi this week.`,
                growth > 20
                    ? "🔥 Great job! Your marketing efforts are paying off."
                    : growth > 0
                        ? "📈 Keep up the consistent performance!"
                        : "💡 Consider reviewing your recent campaigns.",
            ],
        };

        return summary;
    }
};
