import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "./middleware/authMiddleware.js";
import { enforceOwnership } from "./middleware/ownershipMiddleware.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import logisticsRoutes from "./routes/logisticsRoutes.js";
import kioskRoutes from "./routes/kioskRoutes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api", limiter);

// 🔓 Public Routes
app.use("/api/auth", authRoutes);
app.use("/api/kiosk", kioskRoutes);

// 🔐 Protected Routes (FORCED ISOLATION)
app.use(authenticateToken);
app.use(enforceOwnership);

app.use("/api/sales", salesRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/logistics", logisticsRoutes);

app.get("/api/health", (req, res) => res.status(200).json({ ok: true }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log("Server running on port", PORT));
