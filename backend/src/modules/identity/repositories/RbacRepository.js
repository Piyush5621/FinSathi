import { adminSupabase } from "../../../admin/adminSupabase.js";

export class RbacRepository {
  static async findRoleByName(name) {
    const { data, error } = await adminSupabase
      .from("roles")
      .select("*")
      .eq("name", name)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findRoleById(id) {
    const { data, error } = await adminSupabase
      .from("roles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findAllRoles() {
    const { data, error } = await adminSupabase
      .from("roles")
      .select("*");

    if (error) throw error;
    return data;
  }

  static async findAllPermissions() {
    const { data, error } = await adminSupabase
      .from("permissions")
      .select("*");

    if (error) throw error;
    return data;
  }

  static async findRolePermissions(roleId) {
    const { data, error } = await adminSupabase
      .from("role_permissions")
      .select("permission_id, permissions(*)")
      .eq("role_id", roleId);

    if (error) throw error;
    return data;
  }

  static async findUserPermissionOverrides(staffId) {
    const { data, error } = await adminSupabase
      .from("user_permissions")
      .select("permission_id, permissions(*)")
      .eq("staff_id", staffId);

    if (error) throw error;
    return data;
  }

  static async findPermissionByKey(key) {
    const { data, error } = await adminSupabase
      .from("permissions")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createRole(roleData) {
    const { data, error } = await adminSupabase
      .from("roles")
      .insert([roleData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createPermission(permData) {
    const { data, error } = await adminSupabase
      .from("permissions")
      .insert([permData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async assignPermissionToRole(roleId, permissionId) {
    const { data, error } = await adminSupabase
      .from("role_permissions")
      .insert([{ role_id: roleId, permission_id: permissionId }])
      .select();

    if (error) throw error;
    return data;
  }

  static async removePermissionFromRole(roleId, permissionId) {
    const { error } = await adminSupabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);

    if (error) throw error;
  }

  static async clearRolePermissions(roleId) {
    const { error } = await adminSupabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);

    if (error) throw error;
  }

  static async assignPermissionsToRoleBulk(inserts) {
    const { data, error } = await adminSupabase
      .from("role_permissions")
      .insert(inserts)
      .select();

    if (error) throw error;
    return data;
  }

  static async upsertPermissionOverride(staffId, permissionId) {
    const { data, error } = await adminSupabase
      .from("user_permissions")
      .upsert({ staff_id: staffId, permission_id }, { onConflict: "staff_id,permission_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deletePermissionOverride(staffId, permissionId) {
    const { error } = await adminSupabase
      .from("user_permissions")
      .delete()
      .eq("staff_id", staffId)
      .eq("permission_id", permissionId);

    if (error) throw error;
  }

  static async assignStaffStoreRole(storeId, staffId, roleId) {
    const { data, error } = await adminSupabase
      .from("store_staff")
      .upsert({ store_id: storeId, staff_id: staffId, role_id: roleId }, { onConflict: "store_id,staff_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findStaffAssignments(staffId) {
    const { data, error } = await adminSupabase
      .from("store_staff")
      .select("*, stores(*), roles(*)")
      .eq("staff_id", staffId);

    if (error) throw error;
    return data;
  }

  static async findStaffStoreRole(storeId, staffId) {
    const { data, error } = await adminSupabase
      .from("store_staff")
      .select("role_id")
      .eq("store_id", storeId)
      .eq("staff_id", staffId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
