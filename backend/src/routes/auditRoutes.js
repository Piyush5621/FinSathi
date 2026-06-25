import express from "express";
import { supabase } from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHelper.js";

const router = express.Router();

/**
 * GET /api/audit/logs
 * Retrieve the latest 100 compliance audit logs for the authenticated merchant
 */
router.get("/logs", async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from("compliance_audit_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      // Degrade gracefully if table doesn't exist yet
      console.warn("[AuditRoutes] compliance_audit_logs check failed:", error.message);
      return successResponse(res, [], "No compliance audit logs found");
    }

    return successResponse(res, data || [], "Compliance logs retrieved");
  } catch (err) {
    console.error("Fetch compliance logs error:", err);
    return errorResponse(res, err, 500, "Could not fetch compliance logs");
  }
});

export default router;
