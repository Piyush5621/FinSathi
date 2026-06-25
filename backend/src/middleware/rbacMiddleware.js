import { supabase } from "../config/db.js";
import { StoreService } from "../services/StoreService.js";
import { errorResponse } from "../utils/responseHelper.js";

/**
 * Middleware to enforce role-based access control and overrides.
 * Bypassed for Owner accounts.
 */
export const enforcePermissions = (requiredPermissionKey) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      // Allow overriding staffId via headers for dev/testing
      const staffId = req.headers["x-staff-id"] || req.user.staffId;

      // 1. If no staffId exists, assume it is the business Owner. Bypasses checks.
      if (!staffId) {
        return next();
      }

      // 2. Fetch permission ID
      const { data: perm, error: permErr } = await supabase
        .from("permissions")
        .select("id")
        .eq("key", requiredPermissionKey)
        .maybeSingle();

      if (permErr) throw permErr;
      if (!perm) {
        return errorResponse(res, `System permission key '${requiredPermissionKey}' not configured`, 500);
      }

      // 3. Check for granular staff-level overrides first
      const { data: userOverride, error: overrideErr } = await supabase
        .from("user_permissions")
        .select("id")
        .eq("staff_id", staffId)
        .eq("permission_id", perm.id)
        .maybeSingle();

      if (overrideErr) throw overrideErr;
      if (userOverride) {
        return next(); // Granted via custom override
      }

      // 4. Retrieve preferred active store ID to scope the role
      const activeStoreId = await StoreService.getActiveStore(userId);
      if (!activeStoreId) {
        return errorResponse(res, "Store context not established", 403);
      }

      // 5. Lookup staff role inside the active store context
      const { data: mapping, error: mapErr } = await supabase
        .from("store_staff")
        .select("role_id")
        .eq("store_id", activeStoreId)
        .eq("staff_id", staffId)
        .maybeSingle();

      if (mapErr) throw mapErr;
      if (!mapping) {
        return errorResponse(res, "Staff member is not assigned to this store branch", 403);
      }

      // 6. Check role permissions mapping
      const { data: rolePerm, error: rolePermErr } = await supabase
        .from("role_permissions")
        .select("role_id")
        .eq("role_id", mapping.role_id)
        .eq("permission_id", perm.id)
        .maybeSingle();

      if (rolePermErr) throw rolePermErr;
      if (!rolePerm) {
        return errorResponse(res, `Access Denied: Role lacks permission '${requiredPermissionKey}'`, 403);
      }

      next();
    } catch (err) {
      console.error("RBAC Middleware Error:", err);
      return errorResponse(res, err, 500, "Access validation failed");
    }
  };
};
