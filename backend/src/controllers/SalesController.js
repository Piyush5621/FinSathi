import { SalesService } from "../services/SalesService.js";

/** 🧾 Get All Sales */
export const getAllSales = async (req, res) => {
  try {
    const formatted = await SalesService.getAllSales();
    res.json(formatted);
  } catch (err) {
    console.error("Sales API error:", err.message || err);
    // ✅ Demo fallback if DB fails
    return res.json([
      { name: "Mon", value: 1200 },
      { name: "Tue", value: 1500 },
      { name: "Wed", value: 1700 },
    ]);
  }
};

/** 📊 Get Weekly Sales (last 7 days) */
export const getWeeklySales = async (req, res) => {
  try {
    const formatted = await SalesService.getWeeklySales();
    res.status(200).json(formatted);
  } catch (err) {
    console.error("Sales fetch error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/** 🛍️ Create New Sale & Update Inventory */
export const createSale = async (req, res) => {
  try {
    const sale = await SalesService.createSale(req.body);
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
    const updatedSale = await SalesService.updateSale(id, req.body);
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
    await SalesService.deleteSale(id);
    res.status(200).json({ message: "Sale deleted successfully" });
  } catch (err) {
    console.error("Delete Sale Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete sale" });
  }
};

export const getSummary = async (req, res) => {
  try {
    const summary = await SalesService.getSummary();
    res.status(200).json(summary);
  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
};

export const getTrend = async (req, res) => {
  try {
    const trend = await SalesService.getTrend();
    res.status(200).json(trend);
  } catch (err) {
    console.error("getTrend error:", err);
    res.status(500).json({ error: "Failed to fetch trend" });
  }
};
