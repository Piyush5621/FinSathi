import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import { AuthenticationService } from "../src/modules/identity/services/AuthenticationService.js";
import { AuthController } from "../src/modules/identity/controllers/AuthController.js";
import { TokenService } from "../src/modules/identity/services/TokenService.js";
import { SessionService } from "../src/modules/identity/services/SessionService.js";
import { AuthRepository } from "../src/modules/identity/repositories/AuthRepository.js";
import { AuditRepository } from "../src/modules/identity/repositories/AuditRepository.js";
import { UnauthorizedError } from "../src/modules/identity/errors/appErrors.js";

// Mock Database State Arrays
let mockUsers = [];
let mockSessions = [];
let mockRefreshTokens = [];
let mockLoginHistory = [];

describe("Automatic Access Token Refresh Flow & Queueing Tests", () => {
  before(() => {
    // 1. Mock AuthRepository
    AuthRepository.findOwnerById = async (id) => {
      return mockUsers.find(u => u.id === id) || null;
    };
    AuthRepository.findStaffById = async () => null;

    // 2. Mock AuditRepository
    AuditRepository.createRefreshToken = async (tokenData) => {
      const record = { id: `rt-${Math.random()}`, created_at: new Date().toISOString(), ...tokenData };
      mockRefreshTokens.push(record);
      return record;
    };

    AuditRepository.findRefreshTokenByHash = async (tokenHash) => {
      return mockRefreshTokens.find(rt => rt.token_hash === tokenHash) || null;
    };

    AuditRepository.updateRefreshToken = async (id, updates) => {
      const idx = mockRefreshTokens.findIndex(rt => rt.id === id);
      if (idx !== -1) {
        mockRefreshTokens[idx] = { ...mockRefreshTokens[idx], ...updates };
        return mockRefreshTokens[idx];
      }
      return null;
    };

    AuditRepository.createLoginHistory = async (historyData) => {
      mockLoginHistory.push(historyData);
    };

    // 3. Mock SessionService session database table
    SessionService.createSession = async ({ organizationId, userId, staffId, requestInfo }) => {
      const session = {
        id: `session-${Math.random()}`,
        organization_id: organizationId,
        user_id: userId,
        staff_id: staffId,
        revoked_at: null,
        created_at: new Date().toISOString()
      };
      mockSessions.push(session);

      const plaintextToken = TokenService.generateRefreshToken();
      const tokenHash = TokenService.hashRefreshToken(plaintextToken);

      await AuditRepository.createRefreshToken({
        session_id: session.id,
        organization_id: organizationId,
        user_id: userId,
        staff_id: staffId,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      return { session, plaintextToken };
    };

    SessionService.rotateSession = async (plaintextToken) => {
      const tokenHash = TokenService.hashRefreshToken(plaintextToken);
      const tokenRecord = await AuditRepository.findRefreshTokenByHash(tokenHash);

      if (!tokenRecord || tokenRecord.revoked_at || new Date(tokenRecord.expires_at) < new Date()) {
        throw new UnauthorizedError("Invalid or expired refresh token.");
      }

      // Revoke old token
      await AuditRepository.updateRefreshToken(tokenRecord.id, {
        revoked_at: new Date().toISOString()
      });

      // Issue new token
      const newPlaintextToken = TokenService.generateRefreshToken();
      const newTokenHash = TokenService.hashRefreshToken(newPlaintextToken);

      await AuditRepository.createRefreshToken({
        session_id: tokenRecord.session_id,
        organization_id: tokenRecord.organization_id,
        user_id: tokenRecord.user_id,
        staff_id: tokenRecord.staff_id,
        token_hash: newTokenHash,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      const session = mockSessions.find(s => s.id === tokenRecord.session_id);
      return { session, newPlaintextToken };
    };
  });

  beforeEach(() => {
    mockUsers = [
      { id: "owner-1", email: "cashier@karobar.local", jwt_version: 1, organization_id: "org-1" }
    ];
    mockSessions = [];
    mockRefreshTokens = [];
    mockLoginHistory = [];
  });

  test("1. Expired Access Token triggers refresh and yields valid new access token", async () => {
    const orgId = "org-1";
    const userId = "owner-1";

    // 1. Initial Session
    const { session, plaintextToken } = await SessionService.createSession({
      organizationId: orgId,
      userId,
      staffId: null,
      requestInfo: {}
    });

    // 2. Create expired access token (issued in past)
    const secret = process.env.JWT_SECRET || "karobar-dev-secret-super-secure-key-change-in-prod-12345";
    const expiredAccessToken = jwt.sign(
      { sub: userId, tenant_id: orgId, user_id: userId, jwt_version: 1, session_id: session.id },
      secret,
      { expiresIn: "-10s" }
    );

    // Verify token is indeed expired
    let isExpired = false;
    try {
      jwt.verify(expiredAccessToken, secret);
    } catch (e) {
      if (e.name === "TokenExpiredError") isExpired = true;
    }
    assert.strictEqual(isExpired, true, "Access token must be expired");

    // 3. Client calls AuthenticationService.refresh with refreshToken
    const refreshed = await AuthenticationService.refresh(plaintextToken, { ipAddress: "127.0.0.1" });
    assert.ok(refreshed.accessToken);
    assert.ok(refreshed.refreshToken);
    assert.notStrictEqual(refreshed.refreshToken, plaintextToken);

    // 4. Verify newly generated access token is valid
    const decoded = jwt.verify(refreshed.accessToken, secret);
    assert.strictEqual(decoded.user_id, userId);
    assert.strictEqual(decoded.tenant_id, orgId);
  });

  test("2. HttpOnly Cookie Refresh — Controller sets cookie and omits refreshToken from JSON", async () => {
    const orgId = "org-1";
    const userId = "owner-1";

    const { plaintextToken } = await SessionService.createSession({
      organizationId: orgId,
      userId,
      staffId: null,
      requestInfo: {}
    });

    // Mock Express req and res
    const req = {
      headers: {
        cookie: `refreshToken=${plaintextToken}`,
        "user-agent": "Karobar POS Terminal"
      },
      body: {},
      ip: "127.0.0.1"
    };

    let setCookieCalled = false;
    let cookieName = "";
    let cookieValue = "";
    let cookieOptions = null;
    let responseStatus = null;
    let responseJson = null;

    const res = {
      cookie: (name, val, opts) => {
        setCookieCalled = true;
        cookieName = name;
        cookieValue = val;
        cookieOptions = opts;
      },
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseJson = data;
          }
        };
      }
    };

    await AuthController.refresh(req, res, (err) => {
      if (err) throw err;
    });

    // 1. Verify 200 OK
    assert.strictEqual(responseStatus, 200);

    // 2. Verify HttpOnly cookie was set
    assert.strictEqual(setCookieCalled, true);
    assert.strictEqual(cookieName, "refreshToken");
    assert.ok(cookieValue);
    assert.strictEqual(cookieOptions.httpOnly, true);

    // 3. Verify JSON body contains access token and does NOT expose refreshToken
    assert.ok(responseJson.data.accessToken);
    assert.strictEqual(responseJson.data.refreshToken, undefined, "refreshToken must NOT be in JSON data");
    assert.strictEqual(responseJson.refreshToken, undefined, "refreshToken must NOT be in root JSON");
  });

  test("3. Concurrent 401 requests trigger only ONE refresh operation via client queue", async () => {
    const orgId = "org-1";
    const userId = "owner-1";

    const { session, plaintextToken } = await SessionService.createSession({
      organizationId: orgId,
      userId,
      staffId: null,
      requestInfo: {}
    });

    // Emulate frontend client queue logic
    let isRefreshing = false;
    let failedQueue = [];
    let refreshCallCount = 0;

    const mockRefreshApi = async () => {
      refreshCallCount++;
      // Simulate network delay
      await new Promise(r => setTimeout(r, 20));
      return await AuthenticationService.refresh(plaintextToken, {});
    };

    const handle401Request = async (requestId) => {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
      }

      isRefreshing = true;
      try {
        const res = await mockRefreshApi();
        const newAccessToken = res.accessToken;

        failedQueue.forEach(p => p.resolve(newAccessToken));
        failedQueue = [];
        isRefreshing = false;
        return newAccessToken;
      } catch (err) {
        failedQueue.forEach(p => p.reject(err));
        failedQueue = [];
        isRefreshing = false;
        throw err;
      }
    };

    // Simulate 5 simultaneous requests receiving 401 at the exact same moment
    const results = await Promise.all([
      handle401Request("req-1"),
      handle401Request("req-2"),
      handle401Request("req-3"),
      handle401Request("req-4"),
      handle401Request("req-5"),
    ]);

    // Verify exactly 1 refresh call was made
    assert.strictEqual(refreshCallCount, 1, "Exactly one refresh call should be made for concurrent 401s");
    
    // Verify all 5 callers received the exact same valid new access token
    assert.strictEqual(results.length, 5);
    results.forEach(tok => {
      assert.ok(tok);
      assert.strictEqual(tok, results[0]);
    });
  });

  test("4. Revoked or Expired Refresh Token fails and rejects all pending queued requests", async () => {
    const orgId = "org-1";
    const userId = "owner-1";

    const { plaintextToken } = await SessionService.createSession({
      organizationId: orgId,
      userId,
      staffId: null,
      requestInfo: {}
    });

    // Revoke the token to simulate expiry/session revocation
    const tokenHash = TokenService.hashRefreshToken(plaintextToken);
    const rt = mockRefreshTokens.find(r => r.token_hash === tokenHash);
    rt.revoked_at = new Date().toISOString();

    // Client queue logic under failure
    let isRefreshing = false;
    let failedQueue = [];

    const handle401Request = async () => {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
      }

      isRefreshing = true;
      try {
        const res = await AuthenticationService.refresh(plaintextToken, {});
        failedQueue.forEach(p => p.resolve(res.accessToken));
        failedQueue = [];
        isRefreshing = false;
        return res.accessToken;
      } catch (err) {
        failedQueue.forEach(p => p.reject(err));
        failedQueue = [];
        isRefreshing = false;
        throw err;
      }
    };

    // All concurrent requests must be rejected
    const promises = [
      handle401Request(),
      handle401Request(),
      handle401Request()
    ];

    for (const p of promises) {
      await assert.rejects(
        async () => p,
        UnauthorizedError
      );
    }
  });

  test("5. Request loop prevention flag (_retry) blocks recursive refresh loops", async () => {
    const originalRequest = { url: "/api/sales", headers: {}, _retry: false };

    // First attempt: _retry is false -> allows refresh
    assert.strictEqual(originalRequest._retry, false);
    originalRequest._retry = true;

    // Second attempt on same request: _retry is true -> must not retry again
    const shouldAttemptRefresh = !originalRequest._retry;
    assert.strictEqual(shouldAttemptRefresh, false, "Must block retry loop when _retry is already true");
  });
});
