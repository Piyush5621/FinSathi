import { AuthRepository } from "../repositories/AuthRepository.js";
import { RbacRepository } from "../repositories/RbacRepository.js";
import { AuditRepository } from "../repositories/AuditRepository.js";
import { PasswordService } from "./PasswordService.js";
import { supabase } from "../../../config/db.js";
import { ValidationError } from "../errors/appErrors.js";

const DEFAULT_ROLES = [
  { name: "Owner", description: "Business owner with full access" },
  { name: "Manager", description: "Store manager with operational controls" },
  { name: "Cashier", description: "Point of Sale billing clerk" },
  { name: "Accountant", description: "Financial and tax accountant" },
  { name: "Warehouse Staff", description: "Stock and logistics handler" },
  { name: "Delivery Staff", description: "Order fulfillment staff" }
];

const DEFAULT_PERMISSIONS = [
  { key: "view_catalog", label: "View Product Catalog" },
  { key: "edit_catalog", label: "Edit Product Catalog" },
  { key: "approve_po", label: "Approve Purchase Orders" },
  { key: "post_invoices", label: "Post Purchase Invoices" },
  { key: "run_counts", label: "Run Stock Counts" },
  { key: "adjust_costs", label: "Adjust Costs and Variances" },
  { key: "admin_setup", label: "Manage System Admin Settings" },
  { key: "view_billing", label: "View POS and Billing History" },
  { key: "create_sales", label: "Create POS Bills and Invoices" },
  { key: "delete_inventory", label: "Remove Catalog Products" }
];

const ROLE_PERMISSIONS_MAP = {
  "Owner": ["view_catalog", "edit_catalog", "approve_po", "post_invoices", "run_counts", "adjust_costs", "admin_setup", "view_billing", "create_sales", "delete_inventory"],
  "Manager": ["view_catalog", "edit_catalog", "approve_po", "post_invoices", "run_counts", "view_billing", "create_sales"],
  "Cashier": ["view_catalog", "view_billing", "create_sales"],
  "Accountant": ["view_catalog", "post_invoices", "view_billing"],
  "Warehouse Staff": ["view_catalog", "run_counts"],
  "Delivery Staff": ["view_catalog"]
};

export class OrganizationBootstrapService {
  /**
   * Seeding default global roles & permissions if they do not exist
   */
  static async seedRolesAndPermissions() {
    // 1. Seed Permissions
    const existingPerms = await RbacRepository.findAllPermissions();
    const existingPermKeys = new Set(existingPerms.map(p => p.key));

    const permsToInsert = DEFAULT_PERMISSIONS.filter(p => !existingPermKeys.has(p.key));
    if (permsToInsert.length > 0) {
      for (const perm of permsToInsert) {
        await RbacRepository.createPermission(perm);
      }
    }

    // 2. Seed Roles
    const existingRoles = await RbacRepository.findAllRoles();
    const existingRoleNames = new Set(existingRoles.map(r => r.name));

    const rolesToInsert = DEFAULT_ROLES.filter(r => !existingRoleNames.has(r.name));
    if (rolesToInsert.length > 0) {
      for (const role of rolesToInsert) {
        await RbacRepository.createRole(role);
      }
    }

    // 3. Map Permissions to Roles
    const allRoles = await RbacRepository.findAllRoles();
    const allPerms = await RbacRepository.findAllPermissions();

    const roleMap = new Map(allRoles.map(r => [r.name, r.id]));
    const permMap = new Map(allPerms.map(p => [p.key, p.id]));

    for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS_MAP)) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;

      // Clear existing role permissions mappings for safety before seeding
      await RbacRepository.clearRolePermissions(roleId);

      const inserts = permKeys
        .map(key => permMap.get(key))
        .filter(Boolean)
        .map(permId => ({
          role_id: roleId,
          permission_id: permId
        }));

      if (inserts.length > 0) {
        await RbacRepository.assignPermissionsToRoleBulk(inserts);
      }
    }
  }

  /**
   * Bootstraps a new Organization (Tenant)
   * @param {object} ownerData - Owner details (name, email, password, phone)
   * @param {object} orgData - Organization details (businessName, businessType, city, state, etc.)
   */
  static async bootstrap(ownerData, orgData) {
    // 1. Check if owner already exists
    const existingOwner = await AuthRepository.findOwnerByEmailOrPhone(ownerData.email);
    if (existingOwner) {
      throw new ValidationError("An account with this email/phone already exists.");
    }

    // Ensure Roles/Permissions are seeded first
    await this.seedRolesAndPermissions();

    // 2. Hash password
    const hashedPassword = await PasswordService.hashPassword(ownerData.password);

    // 3. Create Organization
    const organization = await AuthRepository.createOrganization({
      name: orgData.businessName,
      business_type: orgData.businessType || null,
      phone: ownerData.phone,
      city: orgData.city || null,
      state: orgData.state || null,
      address: orgData.address || null,
      gstin: orgData.gstin || null,
      logo_url: orgData.logoUrl || null,
      is_active: true
    });

    // 4. Create Business Owner (User)
    const owner = await AuthRepository.createOwner({
      organization_id: organization.id,
      email: ownerData.email,
      password: hashedPassword,
      name: ownerData.name,
      business_name: orgData.businessName,
      business_type: orgData.businessType || null,
      phone: ownerData.phone,
      city: orgData.city || null,
      state: orgData.state || null,
      address: orgData.address || null,
      gstin: orgData.gstin || null,
      logo_url: orgData.logoUrl || null,
      is_active: true,
      jwt_version: 1
    });

    // 5. Create Default Store
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .insert([{
        user_id: owner.id,
        name: `${orgData.businessName} - Main Store`,
        address: orgData.address || null,
        phone: ownerData.phone,
        gstin: orgData.gstin || null,
        is_active: true
      }])
      .select()
      .single();

    if (storeErr) throw storeErr;

    // 6. Create Default Warehouse
    const { data: warehouse, error: whErr } = await supabase
      .from("warehouses")
      .insert([{
        user_id: owner.id,
        name: "Main Warehouse",
        location: orgData.city || null,
        is_main_hub: true
      }])
      .select()
      .single();

    if (whErr) throw whErr;

    // 7. Create User Store Preference
    const { error: prefErr } = await supabase
      .from("user_store_preferences")
      .insert([{
        user_id: owner.id,
        active_store_id: store.id
      }]);

    if (prefErr) throw prefErr;

    // 8. Map Owner to Store with Owner Role
    const ownerRole = await RbacRepository.findRoleByName("Owner");
    if (ownerRole) {
      // Owner role doesn't have a staff row, but store_staff requires staff_id.
      // Wait! For owners, do they exist in store_staff?
      // Typically, owners bypass store_staff checks. But for consistency, let's map user store preference.
      // Owner doesn't need store_staff since enforcePermissions checks if req.user.staffId exists.
      // If no staffId exists, it assumes Owner and passes. So we don't need a store_staff mapping for Owner.
    }

    // 9. Write Audit Log
    await AuditRepository.createLoginHistory({
      organization_id: organization.id,
      actor_user_id: owner.id,
      actor_staff_id: null,
      event_type: "registration",
      ip_address: orgData.ipAddress || null,
      user_agent: orgData.userAgent || null,
      device: orgData.device || null,
      metadata: { action: "tenant_bootstrap", organization_name: orgData.businessName }
    });

    return { organization, owner, store, warehouse };
  }
}
