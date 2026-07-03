import { AuditRepository } from "../repositories/AuditRepository.js";
import { AuthRepository } from "../repositories/AuthRepository.js";
import { TokenService } from "./TokenService.js";
import { UnauthorizedError } from "../errors/appErrors.js";

export class SessionService {
  /**
   * Creates a new user/staff session and registers a refresh token
   * @param {object} params 
   */
  static async createSession({ organizationId, userId, staffId, requestInfo }) {
    // 1. Create session entry
    const session = await AuditRepository.createSession({
      organization_id: organizationId,
      user_id: userId || null,
      staff_id: staffId || null,
      device_name: requestInfo.deviceName || null,
      device_id: requestInfo.deviceId || null,
      platform: requestInfo.platform || null,
      browser: requestInfo.browser || null,
      operating_system: requestInfo.operatingSystem || null,
      app_version: requestInfo.appVersion || null,
      ip_address: requestInfo.ipAddress || null,
      user_agent: requestInfo.userAgent || null
    });

    // 2. Generate Refresh Token
    const plaintextToken = TokenService.generateRefreshToken();
    const tokenHash = TokenService.hashRefreshToken(plaintextToken);

    // 3. Save Refresh Token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    await AuditRepository.createRefreshToken({
      session_id: session.id,
      organization_id: organizationId,
      user_id: userId || null,
      staff_id: staffId || null,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString()
    });

    return { session, plaintextToken };
  }

  /**
   * Rotates a refresh token
   * @param {string} plaintextToken - Plaintext token from client
   * @returns {Promise<object>} New access and refresh tokens
   */
  static async rotateSession(plaintextToken) {
    const tokenHash = TokenService.hashRefreshToken(plaintextToken);
    const tokenRecord = await AuditRepository.findRefreshTokenByHash(tokenHash);

    if (!tokenRecord) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    if (tokenRecord.revoked_at || new Date(tokenRecord.expires_at) < new Date()) {
      throw new UnauthorizedError("Refresh token has expired or been revoked.");
    }

    const session = tokenRecord.identity_sessions;
    if (!session || session.revoked_at) {
      throw new UnauthorizedError("Associated session is inactive.");
    }

    // 1. Revoke the old refresh token
    await AuditRepository.updateRefreshToken(tokenRecord.id, {
      revoked_at: new Date().toISOString()
    });

    // 2. Generate a new Refresh Token
    const newPlaintextToken = TokenService.generateRefreshToken();
    const newHash = TokenService.hashRefreshToken(newPlaintextToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await AuditRepository.createRefreshToken({
      session_id: session.id,
      organization_id: session.organization_id,
      user_id: session.user_id,
      staff_id: session.staff_id,
      token_hash: newHash,
      expires_at: expiresAt.toISOString()
    });

    // 3. Update session activity
    await AuditRepository.updateSession(session.id, {
      last_seen_at: new Date().toISOString()
    });

    return { session, newPlaintextToken };
  }

  /**
   * Revokes a specific session
   * @param {string} sessionId 
   */
  static async revokeSession(sessionId) {
    await AuditRepository.updateSession(sessionId, {
      revoked_at: new Date().toISOString()
    });
    await AuditRepository.revokeRefreshTokenBySession(sessionId);
  }

  /**
   * Revokes all active sessions for a user (Business Owner)
   * @param {string} userId 
   */
  static async revokeAllSessionsForUser(userId) {
    const activeSessions = await AuditRepository.findActiveSessionsForUser(userId);
    const sessionIds = activeSessions.map(s => s.id);

    if (sessionIds.length > 0) {
      await AuditRepository.revokeAllSessionsForUser(userId);
      await AuditRepository.revokeAllRefreshTokensForSessionList(sessionIds);
    }

    // Increment JWT version to immediately invalidate active JWTs
    const user = await AuthRepository.findOwnerById(userId);
    if (user) {
      await AuthRepository.updateOwner(userId, {
        jwt_version: user.jwt_version + 1,
        last_password_changed_at: new Date().toISOString()
      });
    }
  }

  /**
   * Revokes all active sessions for a staff member
   * @param {string} staffId 
   */
  static async revokeAllSessionsForStaff(staffId) {
    const activeSessions = await AuditRepository.findActiveSessionsForStaff(staffId);
    const sessionIds = activeSessions.map(s => s.id);

    if (sessionIds.length > 0) {
      await AuditRepository.revokeAllSessionsForStaff(staffId);
      await AuditRepository.revokeAllRefreshTokensForSessionList(sessionIds);
    }

    // Increment JWT version to immediately invalidate active JWTs
    const staff = await AuthRepository.findStaffById(staffId);
    if (staff) {
      await AuthRepository.updateStaff(staffId, {
        jwt_version: staff.jwt_version + 1
      });
    }
  }

  /**
   * Gets all active sessions for a user or staff
   */
  static async getActiveSessions(userId, staffId) {
    if (staffId) {
      return AuditRepository.findActiveSessionsForStaff(staffId);
    }
    return AuditRepository.findActiveSessionsForUser(userId);
  }
}
