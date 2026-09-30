import { SalesService } from "../services/SalesService.js";
import { refreshDashboardView } from "../utils/refreshView.js";
import { supabase } from "../config/db.js";

import { SalesRepository } from "../repositories/SalesRepository.js";

const getUserId = (req) => req.user?.id || req.user?.user_id || req.user?.sub;

/** 🧾 Get All Sales */
export const getAllSales = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "User ID missing from authentication context" });
    }

    const isPaginated = req.query.page || req.query.paginated === 'true' || req.query.search || (req.query.status && req.query.status !== 'all');
    const result = await SalesService.getSalesList(userId, req.query);
    
    // If not a paginated request and result has .sales, return array for legacy callers
    if (!isPaginated && result && Array.isArray(result.sales) && !req.query.limit) {
      return res.json(result.sales);
    }
    res.json(result);
  } catch (err) {
    console.error("Sales API error:", err.message || err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
};


/** 🔍 Get Single Sale Details */
export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const sale = await SalesRepository.findById(userId, id);
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }
    res.status(200).json(sale);
  } catch (err) {
    console.error("getSaleById error:", err);
    res.status(500).json({ error: "Failed to fetch sale details" });
  }
};

/** 📊 Get Weekly Sales (last 7 days) */
export const getWeeklySales = async (req, res) => {
  try {
    const userId = getUserId(req);
    const formatted = await SalesService.getWeeklySales(userId);
    res.status(200).json(formatted);
  } catch (err) {
    console.error("Sales fetch error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/** 🛍️ Create New Sale & Update Inventory */
export const createSale = async (req, res) => {
  try {
    const userId = getUserId(req);
    const sale = await SalesService.createSale(userId, req.body);
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
    const userId = getUserId(req);
    const updatedSale = await SalesService.updateSale(userId, id, req.body);
    res.status(200).json(updatedSale);
  } catch (err) {
    console.error("Update Sale Error:", err);
    res.status(500).json({ error: err.message || "Failed to update sale" });
  }
};

/** 🚫 Cancel / Void Sale */
export const cancelSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const userId = getUserId(req);
    const result = await SalesService.cancelSale(userId, id, { reason });
    refreshDashboardView().catch(e => console.error('Dashboard view refresh background error:', e));
    res.status(200).json(result);
  } catch (err) {
    console.error("Cancel Sale Error:", err);
    res.status(500).json({ error: err.message || "Failed to cancel sale" });
  }
};

/** 🗑️ Delete Sale (Redirects to safe Cancel / Void) */
export const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const userId = getUserId(req);
    const result = await SalesService.deleteSale(userId, id, reason || "Deleted via sales management");
    // Phase 5: Refresh dashboard view
    refreshDashboardView().catch(e => console.error('Dashboard view refresh background error:', e));
    res.status(200).json(result);
  } catch (err) {
    console.error("Delete Sale Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete sale" });
  }
};

/** 🔄 Process Sales Return & Restore Inventory */
export const returnSale = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const result = await SalesService.returnSale(userId, id, req.body);
    refreshDashboardView().catch(e => console.error('Dashboard view refresh background error:', e));
    res.status(200).json(result);
  } catch (err) {
    console.error("Sales Return Error:", err);
    const status = err.statusCode || 500;
    res.status(status).json({
      error: err.message || "Failed to process sales return",
      returnRecord: err.returnRecord || undefined
    });
  }
};

export const getSummary = async (req, res) => {
  try {
    const userId = getUserId(req);
    // Phase 5: High-performance KPI retrieval from Materialized View
    const { data: viewData, error: viewError } = await supabase
      .from('dashboard_kpis_view')
      .select('*')
      .eq('user_id', userId)
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
    const summary = await SalesService.getSummary(userId);
    res.status(200).json(summary);
  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
};

export const getTrend = async (req, res) => {
  try {
    const userId = getUserId(req);
    const trend = await SalesService.getTrend(userId);
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
