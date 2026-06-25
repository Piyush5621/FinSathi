import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "./middleware/authMiddleware.js";
import { enforceOwnership } from "./middleware/ownershipMiddleware.js";
import { activityLogger } from "./middleware/activityLogger.js";
import { auditMiddleware } from "./middleware/auditMiddleware.js";
import { responseTime } from "./middleware/responseTime.js";
import { performanceMonitor } from "./middleware/sentryMock.js";
import { authLimiter, aiLimiter, generalLimiter } from "./middleware/rateLimiter.js";

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
// import logisticsRoutes from "./routes/logisticsRoutes.js";
import kioskRoutes from "./routes/kioskRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import crmRoutes from "./routes/crmRoutes.js";
import rbacRoutes from "./routes/rbacRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import { ReminderService } from "./services/ReminderService.js";
// Business Network Module
import networkRoutes from "./routes/networkRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import catalogNetworkRoutes from "./routes/catalogNetworkRoutes.js";
import preferredSupplierRoutes from "./routes/preferredSupplierRoutes.js";
import tradeCreditRoutes from "./routes/tradeCreditRoutes.js";
import tradeReturnRoutes from "./routes/tradeReturnRoutes.js";

const app = express();

// Initialize Automation
ReminderService.init();
import "./utils/cronJobs.js";

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());

// Phase 4: Observability and General Security
app.use(responseTime);
app.use(performanceMonitor);
app.use("/api", generalLimiter);

// 🔓 Public Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/kiosk", kioskRoutes);
app.get("/api/health", (req, res) => res.status(200).json({ ok: true }));


// Subscriptions have their own internal auth / webhook
app.use("/api/subscriptions", subscriptionRoutes);


// Webhooks
import webhookRoutes from "./routes/webhookRoutes.js";
app.use("/api/webhooks", webhookRoutes);

// ADMIN PANEL ROUTES
import { adminAuth } from "./admin/middleware/adminAuth.js";
import { auditLog } from "./admin/middleware/auditLog.js";
import adminAuthRoutes from "./admin/routes/adminAuthRoutes.js";
import adminUsersRoutes from "./admin/routes/adminUsersRoutes.js";

app.use("/admin/auth", adminAuthRoutes);
app.use("/admin/users", adminAuth, auditLog, adminUsersRoutes);

import catalogRoutes from "./routes/catalogRoutes.js";
app.use("/api/catalog", catalogRoutes);

// 🔐 Protected Routes (FORCED ISOLATION)
app.use(authenticateToken);
app.use(enforceOwnership);
app.use(activityLogger);
app.use(auditMiddleware);

import schemeRoutes from "./routes/schemeRoutes.js";
app.use("/api/schemes", schemeRoutes);

import aiRoutes from "./routes/aiRoutes.js";
app.use("/api/ai", aiLimiter, aiRoutes);

import intelligenceRoutes from "./routes/intelligenceRoutes.js";
app.use("/api/intelligence", intelligenceRoutes);

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
// app.use("/api/logistics", logisticsRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/audit", auditRoutes);

import reportRoutes from "./routes/reportRoutes.js";
app.use("/api/reports", reportRoutes);

// 🌐 Business Network Module Routes
app.use("/api/network", networkRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/network-catalogs", catalogNetworkRoutes);
app.use("/api/network", preferredSupplierRoutes);
app.use("/api/trade-credit", tradeCreditRoutes);
app.use("/api/trade-returns", tradeReturnRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log("Server running on port", PORT));
