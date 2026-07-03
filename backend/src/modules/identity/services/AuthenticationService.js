import { AuthRepository } from "../repositories/AuthRepository.js";
import { AuditRepository } from "../repositories/AuditRepository.js";
import { PasswordService } from "./PasswordService.js";
import { TokenService } from "./TokenService.js";
import { SessionService } from "./SessionService.js";
import { UnauthorizedError, LockedError, ValidationError } from "../errors/appErrors.js";
import { RbacRepository } from "../repositories/RbacRepository.js";

export class AuthenticationService {
  /**
   * Unified Login Flow
   */
  static async login(emailOrPhone, password, requestInfo) {
    let account = null;
    let isOwner = false;
    let actorUserId = null;
    let actorStaffId = null;

    // 1. Search Business Owner
    account = await AuthRepository.findOwnerByEmailOrPhone(emailOrPhone);
    if (account) {
      isOwner = true;
      actorUserId = account.id;
    } else {
      // 2. Search Staff
      account = await AuthRepository.findStaffByEmailOrPhone(emailOrPhone);
      if (account) {
        isOwner = false;
        actorStaffId = account.id;
        
        if (!account.is_login_enabled) {
          throw new UnauthorizedError("Your login access is disabled. Please contact your manager.");
        }
      }
    }

    if (!account) {
      // We don't have a tenant_id yet, but let's log to a default if we can, or just throw
      throw new UnauthorizedError("Invalid email/phone or password.");
    }

    const tenantId = isOwner ? account.organization_id : account.organization_id;

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
        // Log account locked
        await AuditRepository.createLoginHistory({
          organization_id: tenantId,
          actor_user_id: actorUserId,
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
        actor_user_id: actorUserId,
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
      userId: actorUserId,
      staffId: actorStaffId,
      requestInfo
    });

    // 7. Resolve staff roles if staff
    let roleId = null;
    if (!isOwner) {
      // Find staff assignment in active store context
      const assignments = await RbacRepository.findStaffAssignments(account.id);
      // Fallback: use first assignment if multiple, or null
      roleId = assignments.length > 0 ? assignments[0].role_id : null;
    }

    // 8. Generate JWT Access Token
    const accessToken = TokenService.generateAccessToken({
      sub: isOwner ? account.id : account.id,
      tenant_id: tenantId,
      user_id: actorUserId,
      staff_id: actorStaffId,
      role_id: roleId,
      jwt_version: account.jwt_version,
      session_id: session.id
    });

    // 9. Write Login Audit
    await AuditRepository.createLoginHistory({
      organization_id: tenantId,
      actor_user_id: actorUserId,
      actor_staff_id: actorStaffId,
      event_type: "login_success",
      ip_address: requestInfo.ipAddress || null,
      user_agent: requestInfo.userAgent || null,
      device: requestInfo.deviceName || null,
      metadata: { session_id: session.id }
    });

    return {
      accessToken,
      refreshToken: plaintextToken,
      session: {
        id: session.id,
        organizationId: tenantId,
        userId: actorUserId,
        staffId: actorStaffId,
        roleId,
        name: account.name,
        email: isOwner ? account.email : account.email || null,
        phone: account.phone
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

      // Fetch active jwt_version from DB to keep token updated
      let jwtVersion = 1;
      let roleId = null;

      if (actorUserId) {
        const owner = await AuthRepository.findOwnerById(actorUserId);
        jwtVersion = owner?.jwt_version || 1;
      } else if (actorStaffId) {
        const staff = await AuthRepository.findStaffById(actorStaffId);
        jwtVersion = staff?.jwt_version || 1;

        const assignments = await RbacRepository.findStaffAssignments(actorStaffId);
        roleId = assignments.length > 0 ? assignments[0].role_id : null;
      }

      const accessToken = TokenService.generateAccessToken({
        sub: actorUserId || actorStaffId,
        tenant_id: tenantId,
        user_id: actorUserId,
        staff_id: actorStaffId,
        role_id: roleId,
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
