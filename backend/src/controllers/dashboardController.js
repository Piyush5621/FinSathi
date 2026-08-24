import { DashboardService } from "../services/DashboardService.js";

export const getDashboardData = async (req, res) => {
  try {
    const orgId = req.tenantId || req.user?.organization_id || req.user?.id;
    const dashboardData = await DashboardService.getDashboardData(req.user.id, orgId);
    res.json(dashboardData);
  } catch (err) {
    console.error("Dashboard fetch error:", err.message);
    res.status(500).json({ message: "Failed to load dashboard", error: err.message });
  }
};
