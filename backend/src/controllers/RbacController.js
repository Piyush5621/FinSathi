import { supabase } from "../config/db.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * Get permission matrix: roles, permissions list, and role mappings
 * GET /api/rbac/matrix
 */
export const getPermissionsMatrix = async (req, res) => {
  try {
    const [roles, permissions, rolePerms] = await Promise.all([
      supabase.from("roles").select("*"),
      supabase.from("permissions").select("*"),
      supabase.from("role_permissions").select("*")
    ]);

    if (roles.error) throw roles.error;
    if (permissions.error) throw permissions.error;
    if (rolePerms.error) throw rolePerms.error;

    return successResponse(res, {
      roles: roles.data,
      permissions: permissions.data,
      rolePermissions: rolePerms.data
    }, "Permissions matrix loaded");
  } catch (err) {
    console.error("getPermissionsMatrix Error:", err);
    return errorResponse(res, err, 500, "Failed to load matrix");
  }
};

/**
 * Save role permissions mapping updates
 * POST /api/rbac/roles/:id/permissions
 */
export const updateRolePermissions = async (req, res) => {
  try {
    const { id: roleId } = req.params;
    const { permissionIds } = req.body; // Array of UUIDs

    if (!Array.isArray(permissionIds)) {
      return errorResponse(res, "permissionIds array required", 400);
    }

    // Delete existing
    await supabase.from("role_permissions").delete().eq("role_id", roleId);

    // Insert new mappings
    if (permissionIds.length > 0) {
      const inserts = permissionIds.map(pId => ({
        role_id: roleId,
        permission_id: pId
      }));
      const { error } = await supabase.from("role_permissions").insert(inserts);
      if (error) throw error;
    }

    return successResponse(res, null, "Role permissions updated successfully");
  } catch (err) {
    console.error("updateRolePermissions Error:", err);
    return errorResponse(res, err, 500, "Failed to update role permissions");
  }
};

/**
 * Get user permission overrides for a specific staff member
 * GET /api/rbac/staff/:id/overrides
 */
export const getStaffOverrides = async (req, res) => {
  try {
    const { id: staffId } = req.params;
    const { data: overrides, error } = await supabase
      .from("user_permissions")
      .select("*, permissions(*)")
      .eq("staff_id", staffId);

    if (error) throw error;
    return successResponse(res, overrides, "Staff permission overrides retrieved");
  } catch (err) {
    console.error("getStaffOverrides Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve overrides");
  }
};

/**
 * Add or remove permission override for staff
 * POST /api/rbac/staff/:id/overrides
 */
export const toggleStaffOverride = async (req, res) => {
  try {
    const { id: staffId } = req.params;
    const { permission_id, grant } = req.body; // grant: boolean

    if (!permission_id) {
      return errorResponse(res, "permission_id required", 400);
    }

    if (grant) {
      const { data, error } = await supabase
        .from("user_permissions")
        .upsert({ staff_id: staffId, permission_id })
        .select("*")
        .single();

      if (error) throw error;
      return successResponse(res, data, "Permission override granted successfully");
    } else {
      const { error } = await supabase
        .from("user_permissions")
        .delete()
        .eq("staff_id", staffId)
        .eq("permission_id", permission_id);

      if (error) throw error;
      return successResponse(res, null, "Permission override revoked successfully");
    }
  } catch (err) {
    console.error("toggleStaffOverride Error:", err);
    return errorResponse(res, err, 500, "Failed to toggle permission override");
  }
};

/**
 * Assign staff member to store with a role
 * POST /api/rbac/staff/assign
 */
export const assignStaffStoreRole = async (req, res) => {
  try {
    const { store_id, staff_id, role_id } = req.body;

    if (!store_id || !staff_id || !role_id) {
      return errorResponse(res, "Missing store_id, staff_id, or role_id", 400);
    }

    const { data, error } = await supabase
      .from("store_staff")
      .upsert({ store_id, staff_id, role_id }, { onConflict: "store_id,staff_id" })
      .select("*")
      .single();

    if (error) throw error;
    return successResponse(res, data, "Staff member mapped to store role successfully");
  } catch (err) {
    console.error("assignStaffStoreRole Error:", err);
    return errorResponse(res, err, 500, "Failed to assign staff store role");
  }
};

/**
 * Get staff assignments
 * GET /api/rbac/staff/:id/assignments
 */
export const getStaffAssignments = async (req, res) => {
  try {
    const { id: staffId } = req.params;
    const { data, error } = await supabase
      .from("store_staff")
      .select("*, stores(*), roles(*)")
      .eq("staff_id", staffId);

    if (error) throw error;
    return successResponse(res, data, "Staff store-role mappings retrieved");
  } catch (err) {
    console.error("getStaffAssignments Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve mappings");
  }
};
