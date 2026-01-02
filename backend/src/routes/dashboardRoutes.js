import express from "express";
import { getDashboardData } from "../controllers/dashboardController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/data", authenticateToken, getDashboardData);
export default router;
