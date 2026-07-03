import { test, describe, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { AuthenticationService } from "../src/modules/identity/services/AuthenticationService.js";
import { OrganizationBootstrapService } from "../src/modules/identity/services/OrganizationBootstrapService.js";
import { RbacService } from "../src/modules/identity/services/RbacService.js";
import { PasswordService } from "../src/modules/identity/services/PasswordService.js";
import { TokenService } from "../src/modules/identity/services/TokenService.js";
import { SessionService } from "../src/modules/identity/services/SessionService.js";
import { AuthRepository } from "../src/modules/identity/repositories/AuthRepository.js";
import { RbacRepository } from "../src/modules/identity/repositories/RbacRepository.js";
import { AuditRepository } from "../src/modules/identity/repositories/AuditRepository.js";
import { ValidationError, UnauthorizedError, LockedError, ForbiddenError } from "../src/modules/identity/errors/appErrors.js";
import { supabase } from "../src/config/db.js";

// Mock Database State
let mockOrgs = [];
let mockUsers = [];
let mockStaff = [];
let mockRoles = [];
let mockPermissions = [];
let mockRolePermissions = [];
let mockUserPermissions = [];
let mockStores = [];
let mockWarehouses = [];
let mockUserStorePrefs = [];
let mockSessions = [];
let mockRefreshTokens = [];
let mockLoginHistory = [];

describe("Identity Module Unit & Integration Tests", () => {
  before(() => {
    // Override Repository database methods to work with mock memory arrays
    
    // AuthRepository Mocking
    AuthRepository.findOwnerByEmailOrPhone = async (emailOrPhone) => {
      return mockUsers.find(u => u.email === emailOrPhone || u.phone === emailOrPhone) || null;
    };
    AuthRepository.findStaffByEmailOrPhone = async (emailOrPhone) => {
      return mockStaff.find(s => s.email === emailOrPhone || s.phone === emailOrPhone) || null;
    };
    AuthRepository.findOwnerById = async (id) => {
      return mockUsers.find(u => u.id === id) || null;
    };
    AuthRepository.findStaffById = async (id) => {
      return mockStaff.find(s => s.id === id) || null;
    };
    AuthRepository.createOrganization = async (orgData) => {
      const newOrg = { id: `org-${Date.now()}-${Math.random()}`, ...orgData };
      mockOrgs.push(newOrg);
      return newOrg;
    };
    AuthRepository.createOwner = async (ownerData) => {
      const newOwner = { id: `owner-${Date.now()}-${Math.random()}`, ...ownerData };
      mockUsers.push(newOwner);
      return newOwner;
    };
    AuthRepository.updateOwner = async (id, updates) => {
      const idx = mockUsers.findIndex(u => u.id === id);
      if (idx !== -1) {
        mockUsers[idx] = { ...mockUsers[idx], ...updates };
        return mockUsers[idx];
      }
      return null;
    };
    AuthRepository.updateStaff = async (id, updates) => {
      const idx = mockStaff.findIndex(s => s.id === id);
      if (idx !== -1) {
        mockStaff[idx] = { ...mockStaff[idx], ...updates };
        return mockStaff[idx];
      }
      return null;
    };

    // RbacRepository Mocking
    RbacRepository.findRoleByName = async (name) => {
      return mockRoles.find(r => r.name === name) || null;
    };
    RbacRepository.findRoleById = async (id) => {
      return mockRoles.find(r => r.id === id) || null;
    };
    RbacRepository.findAllRoles = async () => mockRoles;
    RbacRepository.findAllPermissions = async () => mockPermissions;
    RbacRepository.findRolePermissions = async (roleId) => {
      return mockRolePermissions
        .filter(rp => rp.role_id === roleId)
        .map(rp => ({
          ...rp,
          permissions: mockPermissions.find(p => p.id === rp.permission_id)
        }));
    };
    RbacRepository.findUserPermissionOverrides = async (staffId) => {
      return mockUserPermissions
        .filter(up => up.staff_id === staffId)
        .map(up => ({
          ...up,
          permissions: mockPermissions.find(p => p.id === up.permission_id)
        }));
    };
    RbacRepository.createRole = async (roleData) => {
      const newRole = { id: `role-${Date.now()}-${Math.random()}`, ...roleData };
      mockRoles.push(newRole);
      return newRole;
    };
    RbacRepository.createPermission = async (permData) => {
      const newPerm = { id: `perm-${Date.now()}-${Math.random()}`, ...permData };
      mockPermissions.push(newPerm);
      return newPerm;
    };
    RbacRepository.clearRolePermissions = async (roleId) => {
      mockRolePermissions = mockRolePermissions.filter(rp => rp.role_id !== roleId);
    };
    RbacRepository.assignPermissionsToRoleBulk = async (inserts) => {
      mockRolePermissions.push(...inserts);
      return inserts;
    };
    RbacRepository.upsertPermissionOverride = async (staffId, permissionId) => {
      const existing = mockUserPermissions.find(up => up.staff_id === staffId && up.permission_id === permissionId);
      if (!existing) {
        const o = { staff_id: staffId, permission_id: permissionId };
        mockUserPermissions.push(o);
        return o;
      }
      return existing;
    };
    RbacRepository.deletePermissionOverride = async (staffId, permissionId) => {
      mockUserPermissions = mockUserPermissions.filter(up => !(up.staff_id === staffId && up.permission_id === permissionId));
    };
    RbacRepository.assignStaffStoreRole = async (storeId, staffId, roleId) => {
      return { store_id: storeId, staff_id: staffId, role_id: roleId };
    };
    RbacRepository.findStaffStoreRole = async (storeId, staffId) => {
      return { role_id: "role-manager-id" }; // Mocked role
    };
    RbacRepository.findStaffAssignments = async (staffId) => {
      return [];
    };

    // AuditRepository Mocking
    AuditRepository.createSession = async (sessionData) => {
      const s = { id: `sess-${Date.now()}-${Math.random()}`, ...sessionData, created_at: new Date().toISOString() };
      mockSessions.push(s);
      return s;
    };
    AuditRepository.findSessionById = async (id) => {
      return mockSessions.find(s => s.id === id) || null;
    };
    AuditRepository.findActiveSessionsForUser = async (userId) => {
      return mockSessions.filter(s => s.user_id === userId && !s.revoked_at);
    };
    AuditRepository.findActiveSessionsForStaff = async (staffId) => {
      return mockSessions.filter(s => s.staff_id === staffId && !s.revoked_at);
    };
    AuditRepository.updateSession = async (id, updates) => {
      const idx = mockSessions.findIndex(s => s.id === id);
      if (idx !== -1) {
        mockSessions[idx] = { ...mockSessions[idx], ...updates };
        return mockSessions[idx];
      }
      return null;
    };
    AuditRepository.revokeAllSessionsForUser = async (userId) => {
      mockSessions = mockSessions.map(s => s.user_id === userId ? { ...s, revoked_at: new Date().toISOString() } : s);
    };
    AuditRepository.revokeAllSessionsForStaff = async (staffId) => {
      mockSessions = mockSessions.map(s => s.staff_id === staffId ? { ...s, revoked_at: new Date().toISOString() } : s);
    };
    AuditRepository.createRefreshToken = async (tokenData) => {
      const rt = { id: `rt-${Date.now()}-${Math.random()}`, ...tokenData, created_at: new Date().toISOString() };
      mockRefreshTokens.push(rt);
      return rt;
    };
    AuditRepository.findRefreshTokenByHash = async (tokenHash) => {
      const token = mockRefreshTokens.find(rt => rt.token_hash === tokenHash);
      if (!token) return null;
      const session = mockSessions.find(s => s.id === token.session_id);
      return { ...token, identity_sessions: session };
    };
    AuditRepository.updateRefreshToken = async (id, updates) => {
      const idx = mockRefreshTokens.findIndex(rt => rt.id === id);
      if (idx !== -1) {
        mockRefreshTokens[idx] = { ...mockRefreshTokens[idx], ...updates };
        return mockRefreshTokens[idx];
      }
      return null;
    };
    AuditRepository.revokeRefreshTokenBySession = async (sessionId) => {
      mockRefreshTokens = mockRefreshTokens.map(rt => rt.session_id === sessionId ? { ...rt, revoked_at: new Date().toISOString() } : rt);
    };
    AuditRepository.revokeAllRefreshTokensForSessionList = async (sessionIds) => {
      mockRefreshTokens = mockRefreshTokens.map(rt => sessionIds.includes(rt.session_id) ? { ...rt, revoked_at: new Date().toISOString() } : rt);
    };
    AuditRepository.createLoginHistory = async (historyData) => {
      const h = { id: `hist-${Date.now()}`, ...historyData, timestamp: new Date().toISOString() };
      mockLoginHistory.push(h);
      return h;
    };

    // Override Supabase client queries for Bootstrap service (e.g. stores, warehouses, preferences)
    supabase.from = (table) => {
      return {
        insert: (data) => {
          if (table === "stores") {
            const records = data.map(d => ({ id: `store-${Date.now()}`, ...d }));
            mockStores.push(...records);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: records[0], error: null })
              })
            };
          }
          if (table === "warehouses") {
            const records = data.map(d => ({ id: `wh-${Date.now()}`, ...d }));
            mockWarehouses.push(...records);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: records[0], error: null })
              })
            };
          }
          if (table === "user_store_preferences") {
            mockUserStorePrefs.push(...data);
            return Promise.resolve({ error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }
      };
    };
  });

  beforeEach(() => {
    mockOrgs = [];
    mockUsers = [];
    mockStaff = [];
    mockRoles = [];
    mockPermissions = [];
    mockRolePermissions = [];
    mockUserPermissions = [];
    mockStores = [];
    mockWarehouses = [];
    mockUserStorePrefs = [];
    mockSessions = [];
    mockRefreshTokens = [];
    mockLoginHistory = [];
  });

  test("1. Password Policy Strength Validation", () => {
    // Invalid passwords
    assert.throws(() => PasswordService.validatePasswordStrength("short"), ValidationError);
    assert.throws(() => PasswordService.validatePasswordStrength("nouppercase1!"), ValidationError);
    assert.throws(() => PasswordService.validatePasswordStrength("NOLOWERCASE1!"), ValidationError);
    assert.throws(() => PasswordService.validatePasswordStrength("NoNumber!"), ValidationError);
    assert.throws(() => PasswordService.validatePasswordStrength("NoSpecialChar1"), ValidationError);
    
    // Valid password
    assert.doesNotThrow(() => PasswordService.validatePasswordStrength("FinSathi123!"));
  });

  test("2. Organization Bootstrap & Owner Creation", async () => {
    const ownerData = {
      name: "Amit Patel",
      email: "amit@example.com",
      password: "PatelPassword123!",
      phone: "9876543210"
    };

    const orgData = {
      businessName: "Amit Kirana Store",
      businessType: "Retailer",
      city: "Ahmedabad",
      state: "Gujarat",
      address: "123 Main Rd",
      gstin: "24AAAAA1111A1Z1"
    };

    const result = await OrganizationBootstrapService.bootstrap(ownerData, orgData);

    assert.ok(result.organization.id);
    assert.equal(result.organization.name, "Amit Kirana Store");
    assert.equal(result.owner.email, "amit@example.com");
    assert.equal(result.owner.jwt_version, 1);
    
    // Verify bootstrap objects created
    assert.equal(mockOrgs.length, 1);
    assert.equal(mockUsers.length, 1);
    assert.equal(mockStores.length, 1);
    assert.equal(mockWarehouses.length, 1);
    assert.equal(mockUserStorePrefs.length, 1);
    
    // Roles & Permissions check
    assert.ok(mockRoles.length > 0);
    assert.ok(mockPermissions.length > 0);
    assert.ok(mockRolePermissions.length > 0);
  });

  test("3. Unified Login - Owner Authentication & Locks", async () => {
    // Bootstrap first
    const ownerData = {
      name: "Amit Patel",
      email: "amit@example.com",
      password: "PatelPassword123!",
      phone: "9876543210"
    };
    const orgData = { businessName: "Amit Kirana Store" };
    await OrganizationBootstrapService.bootstrap(ownerData, orgData);

    // 1. Invalid Login (Password mismatch)
    await assert.rejects(
      async () => AuthenticationService.login("amit@example.com", "WrongPassword!", {}),
      UnauthorizedError
    );
    assert.equal(mockUsers[0].failed_login_attempts, 1);

    // 2. Successful Login
    const session = await AuthenticationService.login("amit@example.com", "PatelPassword123!", {
      deviceName: "Pixel 7",
      ipAddress: "192.168.1.10"
    });
    
    assert.ok(session.accessToken);
    assert.ok(session.refreshToken);
    assert.equal(session.session.userId, mockUsers[0].id);
    assert.equal(mockUsers[0].failed_login_attempts, 0);
    assert.ok(mockSessions.length, 1);
    
    // 3. Test Account Lockout (5 failed attempts)
    mockUsers[0].failed_login_attempts = 4;
    await assert.rejects(
      async () => AuthenticationService.login("amit@example.com", "WrongPassword!", {}),
      UnauthorizedError
    );
    assert.equal(mockUsers[0].failed_login_attempts, 5);
    assert.ok(mockUsers[0].locked_until);

    // Verify it blocks login
    await assert.rejects(
      async () => AuthenticationService.login("amit@example.com", "PatelPassword123!", {}),
      LockedError
    );
  });

  test("4. Unified Login - Staff Authentication", async () => {
    // Bootstrap org first
    await OrganizationBootstrapService.bootstrap(
      { name: "Owner", email: "owner@example.com", password: "OwnerPassword1!", phone: "9999999999" },
      { businessName: "Test Store" }
    );

    const hashedStaffPassword = await PasswordService.hashPassword("StaffPassword1!");

    // Create staff member manually in mock memory
    const staff = {
      id: "staff-uuid-1",
      organization_id: mockOrgs[0].id,
      user_id: mockUsers[0].id,
      name: "Rajesh Kumar",
      phone: "8888888888",
      email: "rajesh@example.com",
      password_hash: hashedStaffPassword,
      jwt_version: 1,
      is_login_enabled: true,
      failed_login_attempts: 0,
      locked_until: null
    };
    mockStaff.push(staff);

    // Login राजेश
    const session = await AuthenticationService.login("rajesh@example.com", "StaffPassword1!", {
      deviceName: "Web Dashboard"
    });

    assert.ok(session.accessToken);
    assert.ok(session.refreshToken);
    assert.equal(session.session.staffId, "staff-uuid-1");
    assert.equal(session.session.userId, null); // user_id is null for staff DTO
  });

  test("5. Refresh Token Rotation Lifecycle", async () => {
    const ownerData = { name: "Amit", email: "amit@example.com", password: "PatelPassword1!", phone: "9876543210" };
    await OrganizationBootstrapService.bootstrap(ownerData, { businessName: "Amit Store" });

    // Login
    const session = await AuthenticationService.login("amit@example.com", "PatelPassword1!", {});
    const firstRefreshToken = session.refreshToken;

    // Rotate
    const rotationResult = await AuthenticationService.refresh(firstRefreshToken, { ipAddress: "127.0.0.1" });
    assert.ok(rotationResult.accessToken);
    assert.ok(rotationResult.refreshToken);
    assert.notEqual(rotationResult.refreshToken, firstRefreshToken);

    // Old token should be marked revoked
    const hashedFirst = TokenService.hashRefreshToken(firstRefreshToken);
    const oldTokenRecord = mockRefreshTokens.find(rt => rt.token_hash === hashedFirst);
    assert.ok(oldTokenRecord.revoked_at);

    // Try rotating again with old token (must fail)
    await assert.rejects(
      async () => AuthenticationService.refresh(firstRefreshToken, {}),
      UnauthorizedError
    );
  });

  test("6. Logout Current Device vs Logout All Devices", async () => {
    const ownerData = { name: "Amit", email: "amit@example.com", password: "PatelPassword1!", phone: "9876543210" };
    await OrganizationBootstrapService.bootstrap(ownerData, { businessName: "Amit Store" });

    // Login Device 1
    const session1 = await AuthenticationService.login("amit@example.com", "PatelPassword1!", { deviceName: "Mobile" });
    // Login Device 2
    const session2 = await AuthenticationService.login("amit@example.com", "PatelPassword1!", { deviceName: "Laptop" });

    assert.equal(mockSessions.filter(s => !s.revoked_at).length, 2);

    // Logout Device 1
    const actorInfo1 = {
      organizationId: mockOrgs[0].id,
      userId: mockUsers[0].id,
      staffId: null
    };
    await AuthenticationService.logout(session1.session.id, actorInfo1);
    
    // Session 1 revoked, Session 2 active
    const s1 = mockSessions.find(s => s.id === session1.session.id);
    const s2 = mockSessions.find(s => s.id === session2.session.id);
    assert.ok(s1.revoked_at);
    assert.equal(s2.revoked_at, null);

    // Logout All Devices
    await AuthenticationService.logoutAll(mockUsers[0].id, null, actorInfo1);
    const s2Updated = mockSessions.find(s => s.id === session2.session.id);
    assert.ok(s2Updated.revoked_at);
    
    // jwt_version incremented
    assert.equal(mockUsers[0].jwt_version, 2);
  });

  test("7. RBAC Matrix and Override Controls", async () => {
    await OrganizationBootstrapService.bootstrap(
      { name: "Owner", email: "owner@example.com", password: "OwnerPassword1!", phone: "9999999999" },
      { businessName: "Test Store" }
    );

    // 1. Get matrix
    const matrix = await RbacService.getPermissionsMatrix();
    assert.ok(matrix.roles.length > 0);
    assert.ok(matrix.permissions.length > 0);

    // 2. Toggle override
    const actorInfo = { organizationId: mockOrgs[0].id, userId: mockUsers[0].id };
    const staffId = "staff-1";
    const permissionId = mockPermissions[0].id;

    await RbacService.toggleStaffOverride(staffId, permissionId, true, actorInfo);
    assert.equal(mockUserPermissions.length, 1);

    await RbacService.toggleStaffOverride(staffId, permissionId, false, actorInfo);
    assert.equal(mockUserPermissions.length, 0);
  });
});
