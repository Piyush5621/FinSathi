import { AuthRepository } from "../repositories/AuthRepository.js";
import { AuditRepository } from "../repositories/AuditRepository.js";
import { PasswordService } from "./PasswordService.js";
import { TokenService } from "./TokenService.js";
import { SessionService } from "./SessionService.js";
import { UnauthorizedError, LockedError, ValidationError } from "../errors/appErrors.js";
import { RbacRepository } from "../repositories/RbacRepository.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class AuthenticationService {
  /**
   * Unified Login Flow
   */
  static async login(emailOrPhone, password, requestInfo) {
    let account = null;
    let isOwner = false;
    let actorUserId = null;
    let actorStaffId = null;
    let owner = null;

    // 1. Search Staff first so staff with unique logins are resolved accurately
    account = await AuthRepository.findStaffByEmailOrPhone(emailOrPhone);
    if (account) {
      isOwner = false;
      actorStaffId = account.id;
      actorUserId = account.user_id; // Owner's user ID for data scoping

      if (!account.is_login_enabled || account.status === "suspended" || account.status === "disabled") {
        throw new UnauthorizedError("Your staff login access is disabled or suspended. Please contact your store manager.");
      }

      // Fetch the business owner account for this staff
      owner = await AuthRepository.findOwnerById(account.user_id);
      if (!owner) {
        throw new UnauthorizedError("Associated business owner account could not be found.");
      }
      if (owner.is_active === false) {
        throw new UnauthorizedError("The business owner account is currently suspended. Please contact support.");
      }
    } else {
      // 2. Search Business Owner in users table
      account = await AuthRepository.findOwnerByEmailOrPhone(emailOrPhone);
      if (account) {
        isOwner = true;
        actorUserId = account.id;
        actorStaffId = null;
        owner = account;
      }
    }

    if (!account) {
      throw new UnauthorizedError("Invalid email/phone or password.");
    }

    const tenantId = account.organization_id || owner?.organization_id || null;

    // 3. Lockout Check
    if (account.locked_until && new Date(account.locked_until) > new Date()) {
      const waitTime = Math.ceil((new Date(account.locked_until) - new Date()) / 1000 / 60);
      throw new LockedError(`Account is temporarily locked. Try again in ${waitTime} minutes.`);
    }

    // 4. Validate password
    const dbPassword = isOwner ? account.password : account.password_hash;
    const isPasswordValid = await PasswordService.comparePassword(password, dbPassword);

    if (!isPasswordValid) {
      const attempts = (account.failed_login_attempts || 0) + 1;
      const updates = { failed_login_attempts: attempts };

      if (attempts >= 5) {
        updates.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins lock
        await AuditRepository.createLoginHistory({
          organization_id: tenantId,
          actor_user_id: isOwner ? account.id : account.user_id,
          actor_staff_id: actorStaffId,
          event_type: "account_locked",
          ip_address: requestInfo.ipAddress || null,
          user_agent: requestInfo.userAgent || null,
          device: requestInfo.deviceName || null,
          metadata: { reason: "max_failed_attempts", attempts }
        });
      }

      if (isOwner) {
        await AuthRepository.updateOwner(account.id, updates);
      } else {
        await AuthRepository.updateStaff(account.id, updates);
      }

      await AuditRepository.createLoginHistory({
        organization_id: tenantId,
        actor_user_id: isOwner ? account.id : account.user_id,
        actor_staff_id: actorStaffId,
        event_type: "login_failed",
        ip_address: requestInfo.ipAddress || null,
        user_agent: requestInfo.userAgent || null,
        device: requestInfo.deviceName || null,
        metadata: { error: "password_mismatch" }
      });

      throw new UnauthorizedError("Invalid email/phone or password.");
    }

    // 5. Reset attempts on success & update last login
    const resetUpdates = {
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString()
    };
    if (isOwner) {
      await AuthRepository.updateOwner(account.id, resetUpdates);
    } else {
      await AuthRepository.updateStaff(account.id, resetUpdates);
    }

    // 6. Create Session & Generate Refresh Token
    const { session, plaintextToken } = await SessionService.createSession({
      organizationId: tenantId,
      userId: isOwner ? account.id : account.user_id,
      staffId: actorStaffId,
      requestInfo
    });

    // 7. Resolve store context & organization metadata
    let assignedStore = null;
    const storeLookupId = isOwner ? null : account.store_id;
    if (storeLookupId) {
      const { data: st } = await adminSupabase.from("stores").select("*").eq("id", storeLookupId).maybeSingle();
      assignedStore = st;
    }
    if (!assignedStore) {
      const targetUserId = isOwner ? account.id : account.user_id;
      const { data: st } = await adminSupabase.from("stores").select("*").eq("user_id", targetUserId).order("is_default", { ascending: false }).limit(1).maybeSingle();
      assignedStore = st;
    }

    let organization = null;
    if (tenantId) {
      organization = await AuthRepository.findOrganizationById(tenantId).catch(() => null);
    }

    // 8. Resolve Role & Granular Permissions
    let roleId = null;
    let roleName = isOwner ? 'Owner' : (account.role || account.position || 'Staff');
    let permissionKeys = [];

    if (!isOwner) {
      // Find staff assignment in active store context
      const assignments = await RbacRepository.findStaffAssignments(account.id).catch(() => []);
      if (assignments && assignments.length > 0) {
        roleId = assignments[0].role_id;
        const role = await RbacRepository.findRoleById(roleId).catch(() => null);
        if (role?.name) roleName = role.name;
        const rolePerms = await RbacRepository.findRolePermissions(roleId).catch(() => []);
        permissionKeys = rolePerms.map(rp => rp.permissions?.key).filter(Boolean);
      }

      // Canonical fallback role permissions if role_permissions join is unpopulated
      if (permissionKeys.length === 0) {
        const normRole = (roleName || '').toLowerCase();
        if (normRole.includes('manager')) {
          roleName = 'Manager';
          permissionKeys = [
            'view_catalog', 'edit_catalog', 'run_counts', 'adjust_costs',
            'view_billing', 'create_sales',
            'approve_po', 'post_invoices',
            'manage_staff', 'view_analytics'
          ];
        } else if (normRole.includes('cashier')) {
          roleName = 'Cashier';
          permissionKeys = [
            'view_catalog', 'view_billing', 'create_sales'
          ];
        } else if (normRole.includes('accountant')) {
          roleName = 'Accountant';
          permissionKeys = [
            'view_catalog', 'post_invoices', 'view_billing', 'view_finance', 'view_reports'
          ];
        } else if (normRole.includes('warehouse') || normRole.includes('inventory')) {
          roleName = 'Warehouse Staff';
          permissionKeys = [
            'view_catalog', 'run_counts', 'approve_po', 'post_invoices'
          ];
        } else if (normRole.includes('delivery')) {
          roleName = 'Delivery Staff';
          permissionKeys = ['view_catalog'];
        } else {
          roleName = 'Staff';
          permissionKeys = ['view_catalog', 'view_billing'];
        }
      }

      // Merge individual staff overrides from user_permissions
      const overrides = await RbacRepository.findUserPermissionOverrides(account.id).catch(() => []);
      const overrideKeys = overrides.map(o => o.permissions?.key).filter(Boolean);
      permissionKeys = [...new Set([...permissionKeys, ...overrideKeys])];
    } else {
      roleName = 'Owner';
      permissionKeys = ['*'];
    }

    // 9. Generate JWT Access Token with owner user_id and store_id embedded
    const accessToken = TokenService.generateAccessToken({
      sub: account.id,
      tenant_id: tenantId,
      user_id: isOwner ? account.id : account.user_id, // Scoped to business owner's data
      staff_id: actorStaffId,
      role_id: roleId,
      role: roleName,
      store_id: assignedStore?.id || account.store_id || null,
      jwt_version: account.jwt_version || 1,
      session_id: session.id
    });

    // 10. Write Login Audit
    await AuditRepository.createLoginHistory({
      organization_id: tenantId,
      actor_user_id: isOwner ? account.id : account.user_id,
      actor_staff_id: actorStaffId,
      event_type: "login_success",
      ip_address: requestInfo.ipAddress || null,
      user_agent: requestInfo.userAgent || null,
      device: requestInfo.deviceName || null,
      metadata: { session_id: session.id, role: roleName }
    });

    // 11. Authoritative Session Payload with Owner & Shop Context
    const ownerName = isOwner ? account.name : (owner?.name || "Store Owner");
    const businessName = isOwner 
      ? (account.business_name || "My Business") 
      : (owner?.business_name || organization?.name || "Sharma General Store");
    const shopName = businessName;
    const storeName = assignedStore?.name || "Main Branch";
    const storeId = assignedStore?.id || (isOwner ? null : account.store_id);

    return {
      accessToken,
      refreshToken: plaintextToken,
      session: {
        id: session.id,
        organizationId: tenantId,
        userId: isOwner ? account.id : account.user_id, // Critical for data scoping
        staffId: actorStaffId,
        isStaff: !isOwner,
        isOwner: isOwner,
        roleId,
        role: roleName,
        permissions: permissionKeys,
        name: account.name,
        email: account.email || null,
        phone: account.phone || null,
        ownerName,
        owner_name: ownerName,
        businessName,
        business_name: businessName,
        shopName,
        shop_name: shopName,
        storeId,
        store_id: storeId,
        storeName,
        store_name: storeName
      }
    };
  }

  /**
   * Token Refresh Rotation
   */
  static async refresh(refreshToken, requestInfo) {
    try {
      const { session, newPlaintextToken } = await SessionService.rotateSession(refreshToken);

      const actorUserId = session.user_id;
      const actorStaffId = session.staff_id;
      const tenantId = session.organization_id;

      let roleName = "Owner";
      let storeId = null;

      if (actorStaffId) {
        const staff = await AuthRepository.findStaffById(actorStaffId);
        jwtVersion = staff?.jwt_version || 1;
        roleName = staff?.role || staff?.position || "Staff";
        storeId = staff?.store_id || null;

        const assignments = await RbacRepository.findStaffAssignments(actorStaffId);
        if (assignments && assignments.length > 0) {
          roleId = assignments[0].role_id;
          const roleObj = await RbacRepository.findRoleById(roleId).catch(() => null);
          if (roleObj?.name) roleName = roleObj.name;
        }
      } else if (actorUserId) {
        const owner = await AuthRepository.findOwnerById(actorUserId);
        jwtVersion = owner?.jwt_version || 1;
      }

      const accessToken = TokenService.generateAccessToken({
        sub: actorStaffId || actorUserId,
        tenant_id: tenantId,
        user_id: actorUserId, // Scoped to business owner
        staff_id: actorStaffId,
        role_id: roleId,
        role: roleName,
        store_id: storeId,
        jwt_version: jwtVersion,
        session_id: session.id
      });

      await AuditRepository.createLoginHistory({
        organization_id: tenantId,
        actor_user_id: actorUserId,
        actor_staff_id: actorStaffId,
        event_type: "refresh_success",
        ip_address: requestInfo.ipAddress || null,
        user_agent: requestInfo.userAgent || null,
        device: requestInfo.deviceName || null,
        metadata: { session_id: session.id }
      });

      return {
        accessToken,
        refreshToken: newPlaintextToken
      };
    } catch (err) {
      // Create failure audit log if we can resolve the token
      const tokenHash = TokenService.hashRefreshToken(refreshToken);
      const tokenRecord = await AuditRepository.findRefreshTokenByHash(tokenHash).catch(() => null);
      if (tokenRecord) {
        await AuditRepository.createLoginHistory({
          organization_id: tokenRecord.organization_id,
          actor_user_id: tokenRecord.user_id,
          actor_staff_id: tokenRecord.staff_id,
          event_type: "refresh_failed",
          ip_address: requestInfo.ipAddress || null,
          user_agent: requestInfo.userAgent || null,
          device: requestInfo.deviceName || null,
          metadata: { error: err.message }
        }).catch(() => null);
      }
      throw err;
    }
  }

  /**
   * Log out current device (Revoke active session)
   */
  static async logout(sessionId, actorInfo) {
    await SessionService.revokeSession(sessionId);

    await AuditRepository.createLoginHistory({
      organization_id: actorInfo.organizationId,
      actor_user_id: actorInfo.userId || null,
      actor_staff_id: actorInfo.staffId || null,
      event_type: "logout",
      ip_address: actorInfo.ipAddress || null,
      user_agent: actorInfo.userAgent || null,
      device: actorInfo.device || null,
      metadata: { session_id: sessionId }
    });
  }

  /**
   * Log out all devices (Forces password/token invalidation)
   */
  static async logoutAll(userId, staffId, actorInfo) {
    if (staffId) {
      await SessionService.revokeAllSessionsForStaff(staffId);
    } else if (userId) {
      await SessionService.revokeAllSessionsForUser(userId);
    }

    await AuditRepository.createLoginHistory({
      organization_id: actorInfo.organizationId,
      actor_user_id: actorInfo.userId || null,
      actor_staff_id: actorInfo.staffId || null,
      event_type: "logout_all_devices",
      ip_address: actorInfo.ipAddress || null,
      user_agent: actorInfo.userAgent || null,
      device: actorInfo.device || null,
      metadata: { target_revoked: userId || staffId }
    });
  }

  /**
   * Change user password (forces logout from all other devices)
   */
  static async changePassword(userId, staffId, oldPassword, newPassword, actorInfo) {
    let account = null;
    let isOwner = false;

    if (userId) {
      account = await AuthRepository.findOwnerById(userId);
      isOwner = true;
    } else if (staffId) {
      account = await AuthRepository.findStaffById(staffId);
      isOwner = false;
    }

    if (!account) {
      throw new ValidationError("Account not found.");
    }

    const dbPassword = isOwner ? account.password : account.password_hash;
    const isMatch = await PasswordService.comparePassword(oldPassword, dbPassword);
    if (!isMatch) {
      throw new ValidationError("Incorrect old password.");
    }

    const newHashedPassword = await PasswordService.hashPassword(newPassword);

    // Save password
    if (isOwner) {
      await AuthRepository.updateOwner(userId, {
        password: newHashedPassword,
        last_password_changed_at: new Date().toISOString()
      });
      // Revoke all active sessions
      await SessionService.revokeAllSessionsForUser(userId);
    } else {
      await AuthRepository.updateStaff(staffId, {
        password_hash: newHashedPassword
      });
      // Revoke all active sessions
      await SessionService.revokeAllSessionsForStaff(staffId);
    }

    // Write audit log
    await AuditRepository.createLoginHistory({
      organization_id: actorInfo.organizationId,
      actor_user_id: actorInfo.userId || null,
      actor_staff_id: actorInfo.staffId || null,
      event_type: "password_changed",
      ip_address: actorInfo.ipAddress || null,
      user_agent: actorInfo.userAgent || null,
      device: actorInfo.device || null,
      metadata: { change_type: "self" }
    });
  }
}
