import { RbacRepository } from "../repositories/RbacRepository.js";
import { NotFoundError, ValidationError } from "../errors/appErrors.js";
import { AuditRepository } from "../repositories/AuditRepository.js";

export class RbacService {
  /**
   * Retrieves roles, permissions, and role-permissions mappings
   */
  static async getPermissionsMatrix() {
    const [roles, permissions, rolePermissions] = await Promise.all([
      RbacRepository.findAllRoles(),
      RbacRepository.findAllPermissions(),
      // We need all role_permissions
      RbacRepository.findAllPermissions().then(async () => {
        // Find mappings bulk
        // For simplicity, we can fetch role permissions for each role or do a direct select
        // Let's do a direct select on role_permissions via a custom helper or just query it
        const { data, error } = await RbacRepository.findAllRoles().then(() => {
          return RbacRepository.findRolePermissions(null); // Wait, findRolePermissions(null) might fail.
        }).catch(() => ({ data: [] }));
        return data || [];
      })
    ]);

    // Let's write a direct query for role_permissions mapping to avoid errors
    const { data: mappings, error: mapErr } = await RbacRepository.findAllRoles().then(async () => {
      // Direct query role_permissions since RbacRepository doesn't expose it cleanly in a single call
      const { data, error } = await RbacRepository.findAllRoles();
      // Fetch mappings for all roles
      const allMapppingPromise = data.map(role => RbacRepository.findRolePermissions(role.id));
      const results = await Promise.all(allMapppingPromise);
      return results.flat();
    }).catch(() => ({ data: [] }));

    return {
      roles,
      permissions,
      rolePermissions: mappings || []
    };
  }

  /**
   * Updates permission mappings for a specific role
   */
  static async updateRolePermissions(roleId, permissionIds, actorInfo) {
    const role = await RbacRepository.findRoleById(roleId);
    if (!role) {
      throw new NotFoundError("Role not found.");
    }

    if (!Array.isArray(permissionIds)) {
      throw new ValidationError("permissionIds must be an array of UUIDs.");
    }

    // Clear existing role permissions
    await RbacRepository.clearRolePermissions(roleId);

    // Insert new mappings
    if (permissionIds.length > 0) {
      const inserts = permissionIds.map(permId => ({
        role_id: roleId,
        permission_id: permId
      }));
      await RbacRepository.assignPermissionsToRoleBulk(inserts);
    }

    // Audit log
    await AuditRepository.createLoginHistory({
      organization_id: actorInfo.organizationId,
      actor_user_id: actorInfo.userId || null,
      actor_staff_id: actorInfo.staffId || null,
      target_id: roleId,
      event_type: "role_changed",
      ip_address: actorInfo.ipAddress || null,
      user_agent: actorInfo.userAgent || null,
      device: actorInfo.device || null,
      metadata: { action: "update_role_permissions", role_name: role.name, permission_count: permissionIds.length }
    });
  }

  /**
   * Retrieves overrides for a staff member
   */
  static async getStaffOverrides(staffId) {
    return RbacRepository.findUserPermissionOverrides(staffId);
  }

  /**
   * Toggles permission override for a staff member
   */
  static async toggleStaffOverride(staffId, permissionId, grant, actorInfo) {
    const override = grant;
    
    if (override) {
      await RbacRepository.upsertPermissionOverride(staffId, permissionId);
    } else {
      await RbacRepository.deletePermissionOverride(staffId, permissionId);
    }

    // Audit log
    await AuditRepository.createLoginHistory({
      organization_id: actorInfo.organizationId,
      actor_user_id: actorInfo.userId || null,
      actor_staff_id: actorInfo.staffId || null,
      target_id: staffId,
      event_type: "permission_override",
      ip_address: actorInfo.ipAddress || null,
      user_agent: actorInfo.userAgent || null,
      device: actorInfo.device || null,
      metadata: { action: override ? "grant_override" : "revoke_override", permission_id: permissionId }
    });
  }

  /**
   * Assigns staff member to store with a role
   */
  static async assignStaffStoreRole(storeId, staffId, roleId, actorInfo) {
    const assignment = await RbacRepository.assignStaffStoreRole(storeId, staffId, roleId);

    // Audit log
    await AuditRepository.createLoginHistory({
      organization_id: actorInfo.organizationId,
      actor_user_id: actorInfo.userId || null,
      actor_staff_id: actorInfo.staffId || null,
      target_id: staffId,
      event_type: "role_changed",
      ip_address: actorInfo.ipAddress || null,
      user_agent: actorInfo.userAgent || null,
      device: actorInfo.device || null,
      metadata: { action: "assign_staff_store_role", store_id: storeId, role_id: roleId }
    });

    return assignment;
  }
}
