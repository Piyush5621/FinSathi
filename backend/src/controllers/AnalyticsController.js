import { AnalyticsService } from "../services/AnalyticsService.js";

export const getSalesTrend = async (req, res) => {
    try {
        const { month, startDate, endDate } = req.query;
        const trend = await AnalyticsService.getSalesTrend(month, startDate, endDate);
        res.json(trend);
    } catch (err) {
        console.error("getSalesTrend error:", err);
        res.status(500).json({ message: "Failed to fetch sales trend" });
    }
};

export const getTopCustomers = async (req, res) => {
    try {
        const { month, startDate, endDate, limit } = req.query;
        const customers = await AnalyticsService.getTopCustomers(month, startDate, endDate, limit);
        res.json(customers);
    } catch (err) {
        console.error("getTopCustomers error:", err);
        res.status(500).json({ message: "Failed to fetch top customers" });
    }
};

export const getDashboardSummary = async (req, res) => {
    try {
        const summary = await AnalyticsService.getDashboardSummary();
        res.json(summary);
    } catch (err) {
        console.error("getDashboardSummary error:", err);
        res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
};

export const getSalesSummary = async (req, res) => {
    try {
        const summary = await AnalyticsService.getSalesSummary();
        res.json(summary);
    } catch (err) {
        console.error("getSalesSummary error:", err);
        res.status(500).json({ message: "Failed to fetch sales summary" });
    }
};

export const getTopProducts = async (req, res) => {
    try {
        const { month, startDate, endDate, limit } = req.query;
        const result = await AnalyticsService.getTopProducts(month, startDate, endDate, limit);
        res.status(200).json(result);
    } catch (err) {
        console.error("getTopProducts error:", err.message || err);
        res.status(500).json({ message: err.message || "Analytics error" });
    }
};

export const getBillingMetrics = async (req, res) => {
    try {
        const metrics = await AnalyticsService.getBillingMetrics();
        res.json(metrics);
    } catch (err) {
        console.error('getBillingMetrics error:', err);
        res.status(500).json({ error: 'Failed to fetch billing metrics' });
    }
};
