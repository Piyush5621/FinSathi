import { SalesService } from "../services/SalesService.js";
import { refreshDashboardView } from "../utils/refreshView.js";
import { supabase } from "../config/db.js";

/** 🧾 Get All Sales */
export const getAllSales = async (req, res) => {
  try {
    const data = await SalesService.getSalesList(req.user.id);
    res.json(data);
  } catch (err) {
    console.error("Sales API error:", err.message || err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
};

/** 📊 Get Weekly Sales (last 7 days) */
export const getWeeklySales = async (req, res) => {
  try {
    const formatted = await SalesService.getWeeklySales(req.user.id);
    res.status(200).json(formatted);
  } catch (err) {
    console.error("Sales fetch error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/** 🛍️ Create New Sale & Update Inventory */
export const createSale = async (req, res) => {
  try {
    const sale = await SalesService.createSale(req.user.id, req.body);
    // Phase 5: Trigger view refresh for instant dashboard update
    refreshDashboardView().catch(e => console.error('Dashboard view refresh background error:', e));
    res.status(201).json(sale);
  } catch (err) {
    console.error("Create Sale Error:", err);
    res.status(500).json({ error: err.message || "Failed to create sale" });
  }
};

/** ✏️ Update Sale */
export const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSale = await SalesService.updateSale(req.user.id, id, req.body);
    res.status(200).json(updatedSale);
  } catch (err) {
    console.error("Update Sale Error:", err);
    res.status(500).json({ error: err.message || "Failed to update sale" });
  }
};

/** 🗑️ Delete Sale */
export const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    await SalesService.deleteSale(req.user.id, id);
    // Phase 5: Refresh dashboard view
    refreshDashboardView().catch(e => console.error('Dashboard view refresh background error:', e));
    res.status(200).json({ message: "Sale deleted successfully" });
  } catch (err) {
    console.error("Delete Sale Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete sale" });
  }
};

export const getSummary = async (req, res) => {
  try {
    // Phase 5: High-performance KPI retrieval from Materialized View
    const { data: viewData, error: viewError } = await supabase
      .from('dashboard_kpis_view')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (!viewError && viewData) {
      return res.status(200).json({
        totalRevenue: viewData.month_revenue,
        todayRevenue: viewData.today_revenue,
        activeProducts: viewData.active_stock_items,
        totalCustomers: viewData.total_customers,
        pendingInvoices: viewData.pending_invoices_count,
        from_cached_view: true,
        last_refreshed: viewData.last_refreshed
      });
    }

    // Fallback to legacy real-time calculation if view is missing or error
    console.warn('[DB] Falling back to slow Real-time calculation for summary.');
    const summary = await SalesService.getSummary(req.user.id);
    res.status(200).json(summary);
  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
};

export const getTrend = async (req, res) => {
  try {
    const trend = await SalesService.getTrend(req.user.id);
    res.status(200).json(trend);
  } catch (err) {
    console.error("getTrend error:", err);
    res.status(500).json({ error: "Failed to fetch trend" });
  }
};

import { PdfService } from "../services/PdfService.js";

export const generatePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const url = await PdfService.generateAndUploadInvoice(id);
    res.status(200).json({ url });
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};
