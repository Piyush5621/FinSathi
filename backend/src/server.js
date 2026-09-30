import "dotenv/config";
import { validateEnv } from "./infrastructure/config/envValidator.js";
validateEnv();

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
import { authLimiter, generalLimiter } from "./middleware/rateLimiter.js";
import { logger } from "./infrastructure/logging/logger.js";

// Override global console in production to enforce structured logging
if (process.env.NODE_ENV === 'production') {
  console.log = (...args) => logger.info(args.join(' '));
  console.error = (...args) => logger.error(args.join(' '));
  console.warn = (...args) => logger.warn(args.join(' '));
  console.info = (...args) => logger.info(args.join(' '));
}

import { correlationIdMiddleware } from "./infrastructure/logging/correlation.js";
import { initEventPublisher } from "./infrastructure/events/publishers/index.js";
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueue, QUEUES } from "./infrastructure/queues/queueManager.js";

// Routes
import identityRouter from "./modules/identity/index.js";
import mastersRouter from "./modules/masters/index.js";
import catalogRouter from "./modules/catalog/index.js";
import inventoryRouter from "./modules/inventory/index.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import cashbookRoutes from "./routes/cashbookRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import kioskRoutes from "./routes/kioskRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import purchaseRequestRoutes from "./routes/purchaseRequestRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import { ReminderService } from "./services/ReminderService.js";

const app = express();

// Initialize Automation & Events
ReminderService.init();
const publisher = initEventPublisher();

import "./utils/cronJobs.js";

// Allowed origins configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);
      if (
        process.env.NODE_ENV !== "production" ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".karobar.local") ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(new Error("CORS: Request from this origin is not allowed."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-store-id",
      "x-idempotency-key",
      "x-correlation-id",
      "x-timezone"
    ]
  })
);
app.use(correlationIdMiddleware);
app.use(express.json());
app.use(helmet());
app.use(compression());

// Setup Bull-Board for Queue Monitoring (if Redis configured)
if (process.env.REDIS_URL) {
  try {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');
    createBullBoard({
      queues: Object.values(QUEUES).map(q => new BullMQAdapter(getQueue(q))),
      serverAdapter: serverAdapter,
    });
    app.use('/admin/queues', serverAdapter.getRouter());
  } catch (err) {
    logger.warn('[BullBoard] Failed to mount queues dashboard:', err.message);
  }
}

// Phase 4: Observability and General Security
app.use(responseTime);
app.use(performanceMonitor);
app.use("/api", generalLimiter);

// 🩺 Public Health Check & Unauthenticated Endpoints
import healthRoutes from "./routes/healthRoutes.js";
app.use("/api/health", healthRoutes);
app.get("/health", (req, res) => res.json({ status: "healthy", timestamp: new Date().toISOString() }));

// Webhooks
import webhookRoutes from "./routes/webhookRoutes.js";
app.use("/api/webhooks", webhookRoutes);

// Kiosk (Public employee terminal)
app.use("/api/kiosk", kioskRoutes);

// 🔓 Public / Private Identity Module Routes (Unified Auth & RBAC)
app.use("/api/v1", identityRouter);
app.use("/api", identityRouter); // Backward compatibility

// ADMIN PANEL ROUTES
import { adminAuth } from "./admin/middleware/adminAuth.js";
import { auditLog } from "./admin/middleware/auditLog.js";
import adminAuthRoutes from "./admin/routes/adminAuthRoutes.js";
import adminUsersRoutes from "./admin/routes/adminUsersRoutes.js";

app.use("/admin/auth", adminAuthRoutes);
app.use("/admin/users", adminAuth, auditLog, adminUsersRoutes);

// Modular Subsystems
app.use("/api/v1/catalog", catalogRouter);
app.use("/api/catalog", catalogRouter);

app.use("/api/v1/inventory", inventoryRouter);

app.use("/api/v1", mastersRouter);
app.use(["/api/uom", "/api/uoms", "/api/categories", "/api/warehouses", "/api/companies", "/api/brands", "/api/settings"], mastersRouter);

import catalogRoutes from "./routes/catalogRoutes.js";
app.use("/api/public-catalog", catalogRoutes);


// 🔐 Protected Routes (FORCED ISOLATION)
app.use(authenticateToken);
app.use(enforceOwnership);
app.use(activityLogger);
app.use(auditMiddleware);

app.use("/api/sales", salesRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/cashbook", cashbookRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/purchase-requests", purchaseRequestRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/audit", auditRoutes);

import reportRoutes from "./routes/reportRoutes.js";
app.use("/api/reports", reportRoutes);

// Global Error Handler must be the last middleware
import { errorHandler } from "./middleware/errorHandler.js";
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      `Port ${PORT} is already in use by another process. Please stop the existing process or specify a different PORT in your .env file.`
    );
    process.exit(1);
  } else {
    logger.error(`Server error: ${err.message}`);
    process.exit(1);
  }
});

const gracefulShutdown = () => {
  logger.info("Received termination signal, closing HTTP server...");
  server.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

