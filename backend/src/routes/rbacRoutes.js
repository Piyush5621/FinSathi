import express from "express";
import { getPermissionsMatrix, updateRolePermissions, getStaffOverrides, toggleStaffOverride, assignStaffStoreRole, getStaffAssignments } from "../controllers/RbacController.js";

const router = express.Router();

router.get("/matrix", getPermissionsMatrix);
router.post("/roles/:id/permissions", updateRolePermissions);
router.get("/staff/:id/overrides", getStaffOverrides);
router.post("/staff/:id/overrides", toggleStaffOverride);
router.post("/staff/assign", assignStaffStoreRole);
router.get("/staff/:id/assignments", getStaffAssignments);

export default router;
