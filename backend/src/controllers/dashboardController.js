import { DashboardService } from "../services/DashboardService.js";

export const getDashboardData = async (req, res) => {
  try {
    const dashboardData = await DashboardService.getDashboardData();
    res.json(dashboardData);
  } catch (err) {
    console.error("Dashboard fetch error:", err.message);
    res.status(500).json({ message: "Failed to load dashboard", error: err.message });
  }
};
