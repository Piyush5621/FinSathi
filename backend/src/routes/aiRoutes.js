import express from "express";
import { AIService } from "../services/AIService.js";
import { supabase } from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHelper.js";

const router = express.Router();

/**
 * POST /api/ai/query
 * Body: { query: string }
 * User types or speaks a business query in Hindi/Hinglish/English.
 */
router.post("/query", async (req, res) => {
  try {
    const rawUserId = req.user.id;
    const staffId = req.user.staff_id || null;
    let targetUserId = req.user.user_id || rawUserId;
    const isStaff = Boolean(staffId);
    let staffRole = "Owner";
    let staffPermissions = ["*"];

    if (isStaff) {
      const { data: staffMember } = await supabase
        .from("staff")
        .select("user_id, role, position, store_staff(role_id, roles(name))")
        .eq("id", staffId)
        .maybeSingle();

      if (staffMember) {
        targetUserId = staffMember.user_id || targetUserId;
        staffRole = staffMember.store_staff?.[0]?.roles?.name || staffMember.role || staffMember.position || "Staff";
      }

      if (Array.isArray(req.permissions) && req.permissions.length > 0) {
        staffPermissions = req.permissions;
      } else if (staffMember?.store_staff?.[0]?.role_id) {
        const { data: rps } = await supabase
          .from("role_permissions")
          .select("permissions(key)")
          .eq("role_id", staffMember.store_staff[0].role_id);
        staffPermissions = (rps || []).map((r) => r.permissions?.key).filter(Boolean);
      }
    }

    // Build context: business name, top customers, products
    const [{ data: user }, { data: customers }, { data: products }] = await Promise.all([
      supabase.from("users").select("name, business_name").eq("id", targetUserId).single(),
      supabase.from("customers").select("name").eq("user_id", targetUserId).limit(10),
      supabase.from("inventory").select("name").eq("user_id", targetUserId).limit(10),
    ]);

    const context = {
      businessName: user?.business_name || user?.name || "your business",
      customers: (customers || []).map((c) => c.name),
      categories: (products || []).map((p) => p.name),
      isStaff,
      staffRole,
      staffPermissions
    };

    const result = await AIService.query(targetUserId, query.trim(), context);

    return successResponse(res, result, "AI processing complete");
  } catch (err) {
    console.error("AI query route error:", err);
    return errorResponse(res, err, 500, "AI Assistant could not process this query");
  }
});

export default router;
