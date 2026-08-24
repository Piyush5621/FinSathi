import express from "express";
import { AuthController } from "./controllers/AuthController.js";
import { RbacController } from "./controllers/RbacController.js";
import { authenticate, attachTenant, attachPermissions, authorize, audit } from "./middleware/authMiddleware.js";
import { authLimiter } from "../../middleware/rateLimiter.js";

const router = express.Router();

// 🔓 Public Auth Routes (With Brute-force & Hammering Protection)
router.post("/auth/register", authLimiter, AuthController.register);
router.post("/auth/login", authLimiter, AuthController.login);
router.post("/auth/refresh", authLimiter, AuthController.refresh);

// 🔒 Protected Auth Routes
router.post("/auth/logout", authenticate, AuthController.logout);
router.post("/auth/logout-all", authenticate, AuthController.logoutAll);
router.post("/auth/change-password", authenticate, attachTenant, AuthController.changePassword);
router.get("/auth/me", authenticate, AuthController.getProfile);
router.put("/auth/update", authenticate, AuthController.updateProfile);

// 🛡️ Protected RBAC Settings Routes (Requires admin_setup permission)
router.use("/rbac", authenticate, attachTenant, attachPermissions);

router.get("/rbac/matrix", authorize("admin_setup"), RbacController.getPermissionsMatrix);
router.post("/rbac/roles/:id/permissions", authorize("admin_setup"), audit, RbacController.updateRolePermissions);
router.get("/rbac/staff/:id/overrides", authorize("admin_setup"), RbacController.getStaffOverrides);
router.post("/rbac/staff/:id/overrides", authorize("admin_setup"), audit, RbacController.toggleStaffOverride);
router.post("/rbac/staff/assign", authorize("admin_setup"), audit, RbacController.assignStaffStoreRole);
router.get("/rbac/staff/:id/assignments", authorize("admin_setup"), RbacController.getStaffAssignments);

export default router;
