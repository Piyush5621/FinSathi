import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { AuthRepository } from "../src/modules/identity/repositories/AuthRepository.js";
import { RbacRepository } from "../src/modules/identity/repositories/RbacRepository.js";
import { AuditRepository } from "../src/modules/identity/repositories/AuditRepository.js";
import { AuthenticationService } from "../src/modules/identity/services/AuthenticationService.js";
import { authenticate, attachTenant, attachPermissions, authorize } from "../src/modules/identity/middleware/authMiddleware.js";
import * as StaffController from "../src/controllers/StaffController.js";
import { supabase } from "../src/config/db.js";

describe("Karobar Owner → Staff → Role Management Workflow Tests", () => {
  // In-memory Database Mock
  let mockOrgs = [];
  let mockOwners = [];
  let mockStaff = [];
  let mockStores = [];
  let mockRoles = [];
  let mockPermissions = [];
  let mockRolePermissions = [];
  let mockStoreStaff = [];
  let mockUserPermissions = [];
  let mockSessions = [];
  let mockRefreshTokens = [];
  let mockAttendance = [];
  let mockPayroll = [];

  const orgAId = "org-aaa-111";
  const orgBId = "org-bbb-222";
  const ownerAId = "owner-aaa-111";
  const ownerBId = "owner-bbb-222";
  const storeA1Id = "store-a1-main";
  const storeA2Id = "store-a2-city";
  const storeB1Id = "store-b1-depot";

  const roleOwnerId = "role-owner-id";
  const roleManagerId = "role-manager-id";
  const roleCashierId = "role-cashier-id";

  before(() => {
    // 1. Roles & Permissions setup
    mockRoles = [
      { id: roleOwnerId, name: "Owner", description: "Full business owner access" },
      { id: roleManagerId, name: "Manager", description: "Store manager operational oversight" },
      { id: roleCashierId, name: "Cashier", description: "Point of Sale billing clerk" }
    ];

    mockPermissions = [
      { id: "p-cat-v", key: "view_catalog", label: "View Catalog" },
      { id: "p-cat-e", key: "edit_catalog", label: "Edit Catalog" },
      { id: "p-bill-v", key: "view_billing", label: "View Billing" },
      { id: "p-bill-c", key: "create_sales", label: "Create Sales" },
      { id: "p-po-a", key: "approve_po", label: "Approve PO" },
      { id: "p-inv-p", key: "post_invoices", label: "Post Invoices" },
      { id: "p-adm-s", key: "admin_setup", label: "Admin Setup" }
    ];

    // Role permissions mappings
    mockRolePermissions = [
      // Cashier permissions
      { role_id: roleCashierId, permission_id: "p-cat-v", permissions: { key: "view_catalog" } },
      { role_id: roleCashierId, permission_id: "p-bill-v", permissions: { key: "view_billing" } },
      { role_id: roleCashierId, permission_id: "p-bill-c", permissions: { key: "create_sales" } },
      // Manager permissions
      { role_id: roleManagerId, permission_id: "p-cat-v", permissions: { key: "view_catalog" } },
      { role_id: roleManagerId, permission_id: "p-cat-e", permissions: { key: "edit_catalog" } },
      { role_id: roleManagerId, permission_id: "p-bill-v", permissions: { key: "view_billing" } },
      { role_id: roleManagerId, permission_id: "p-bill-c", permissions: { key: "create_sales" } },
      { role_id: roleManagerId, permission_id: "p-po-a", permissions: { key: "approve_po" } },
      { role_id: roleManagerId, permission_id: "p-inv-p", permissions: { key: "post_invoices" } }
    ];

    // 2. Mock Repositories
    AuthRepository.findOwnerById = async (id) => mockOwners.find(o => o.id === id) || null;
    AuthRepository.findOwnerByEmailOrPhone = async (term) => mockOwners.find(o => o.email === term || o.phone === term) || null;
    AuthRepository.updateOwner = async (id, updates) => {
      const idx = mockOwners.findIndex(o => o.id === id);
      if (idx !== -1) mockOwners[idx] = { ...mockOwners[idx], ...updates };
      return mockOwners[idx];
    };

    AuthRepository.findStaffById = async (id) => mockStaff.find(s => s.id === id) || null;
    AuthRepository.findStaffByEmailOrPhone = async (term) => mockStaff.find(s => s.email === term || s.phone === term) || null;
    AuthRepository.updateStaff = async (id, updates) => {
      const idx = mockStaff.findIndex(s => s.id === id);
      if (idx !== -1) mockStaff[idx] = { ...mockStaff[idx], ...updates };
      return mockStaff[idx];
    };

    RbacRepository.findStaffAssignments = async (staffId) => {
      return mockStoreStaff.filter(ss => ss.staff_id === staffId);
    };

    RbacRepository.findStaffStoreRole = async (storeId, staffId) => {
      return mockStoreStaff.find(ss => ss.store_id === storeId && ss.staff_id === staffId) || null;
    };

    RbacRepository.findRolePermissions = async (roleId) => {
      return mockRolePermissions.filter(rp => rp.role_id === roleId);
    };

    RbacRepository.findUserPermissionOverrides = async (staffId) => {
      return mockUserPermissions.filter(up => up.staff_id === staffId);
    };

    AuditRepository.createSession = async (data) => {
      const session = { id: `sess-${Math.random().toString(36).slice(2, 9)}`, ...data };
      mockSessions.push(session);
      return session;
    };

    AuditRepository.createRefreshToken = async (data) => {
      const token = { id: `rt-${Math.random().toString(36).slice(2, 9)}`, ...data };
      mockRefreshTokens.push(token);
      return token;
    };

    AuditRepository.findActiveSessionsForStaff = async (staffId) => {
      return mockSessions.filter(s => s.staff_id === staffId && !s.revoked_at);
    };

    AuditRepository.revokeAllSessionsForStaff = async (staffId) => {
      mockSessions.forEach(s => {
        if (s.staff_id === staffId) s.revoked_at = new Date().toISOString();
      });
    };

    AuditRepository.revokeAllRefreshTokensForSessionList = async (sessionIds) => {
      mockRefreshTokens.forEach(rt => {
        if (sessionIds.includes(rt.session_id)) rt.revoked_at = new Date().toISOString();
      });
    };

    AuditRepository.createLoginHistory = async (data) => data;

    // 3. Supabase Mock chain for StaffController
    supabase.from = (tableName) => {
      return {
        select: (fields) => ({
          eq: (col, val) => ({
            eq: (col2, val2) => ({
              single: async () => {
                const item = mockStaff.find(s => s[col] === val && s[col2] === val2);
                return { data: item || null, error: item ? null : { message: "Not found" } };
              },
              order: (orderCol) => ({
                data: mockStaff.filter(s => s[col] === val && s[col2] === val2),
                error: null
              })
            }),
            single: async () => {
              let item = null;
              if (tableName === "staff") item = mockStaff.find(s => s[col] === val);
              if (tableName === "stores") item = mockStores.find(st => st[col] === val);
              return { data: item || null, error: item ? null : { message: "Not found" } };
            },
            order: (orderCol) => {
              if (tableName === "staff") {
                return { data: mockStaff.filter(s => s[col] === val), error: null };
              }
              if (tableName === "attendance") {
                return { data: mockAttendance.filter(a => a[col] === val), error: null };
              }
              if (tableName === "payroll") {
                return { data: mockPayroll.filter(p => p[col] === val), error: null };
              }
              return { data: [], error: null };
            }
          }),
          or: (condition) => ({
            order: () => ({
              data: mockStaff.filter(s => s.organization_id === orgAId || s.user_id === ownerAId),
              error: null
            }),
            single: async () => {
              const item = mockStaff.find(s => s.organization_id === orgAId || s.user_id === ownerAId);
              return { data: item || null, error: item ? null : { message: "Not found" } };
            }
          })
        }),
        insert: (payloads) => ({
          select: () => ({
            single: async () => {
              const row = { id: `staff-${Date.now()}`, ...payloads[0] };
              if (tableName === "staff") mockStaff.push(row);
              if (tableName === "attendance") mockAttendance.push(row);
              if (tableName === "payroll") mockPayroll.push(row);
              return { data: row, error: null };
            }
          })
        }),
        update: (updates) => ({
          eq: (col, val) => ({
            select: () => ({
              single: async () => {
                const idx = mockStaff.findIndex(s => s[col] === val);
                if (idx !== -1) {
                  mockStaff[idx] = { ...mockStaff[idx], ...updates };
                  return { data: mockStaff[idx], error: null };
                }
                return { data: null, error: { message: "Not found" } };
              }
            })
          })
        }),
        delete: () => ({
          eq: (col, val) => ({
            eq: (col2, val2) => {
              if (tableName === "staff") {
                mockStaff = mockStaff.filter(s => !(s[col] === val && s[col2] === val2));
              }
              return { error: null };
            }
          })
        }),
        upsert: (payload, opts) => {
          if (tableName === "store_staff") {
            const idx = mockStoreStaff.findIndex(ss => ss.store_id === payload.store_id && ss.staff_id === payload.staff_id);
            if (idx !== -1) mockStoreStaff[idx] = { ...mockStoreStaff[idx], ...payload };
            else mockStoreStaff.push({ id: `ss-${Date.now()}`, ...payload });
          }
          return {
            select: () => ({
              single: async () => ({ data: payload, error: null })
            }),
            catch: () => {}
          };
        }
      };
    };
  });

  beforeEach(() => {
    mockOwners = [
      { id: ownerAId, organization_id: orgAId, email: "owner.a@karobar.test", is_active: true, jwt_version: 1 },
      { id: ownerBId, organization_id: orgBId, email: "owner.b@karobar.test", is_active: true, jwt_version: 1 }
    ];
    mockStaff = [];
    mockStoreStaff = [];
    mockSessions = [];
    mockRefreshTokens = [];
    mockAttendance = [];
    mockPayroll = [];
  });

  test("1. Owner adds Cashier with Web Login credentials and Store Branch assignment", async () => {
    const req = {
      user: { id: ownerAId, user_id: ownerAId, organization_id: orgAId },
      tenantId: orgAId,
      body: {
        name: "Pooja Sharma",
        phone: "+91 98102 33445",
        email: "pooja.cashier@karobar.test",
        position: "POS Cashier",
        salary_type: "fixed",
        base_salary: 28000,
        is_login_enabled: true,
        password: "CashierSecret@123",
        store_id: storeA1Id,
        role_id: roleCashierId
      }
    };

    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await StaffController.addStaff(req, res);

    assert.equal(statusCode, 201);
    assert.ok(responseData.id, "Staff should have generated UUID");
    assert.equal(responseData.name, "Pooja Sharma");
    assert.equal(responseData.is_login_enabled, true);
    assert.notEqual(responseData.password_hash, "CashierSecret@123", "Password must be securely hashed");
    assert.ok(await bcrypt.compare("CashierSecret@123", responseData.password_hash), "Bcrypt hash must match password");

    // Verify store_staff mapping was created
    const mapping = mockStoreStaff.find(ss => ss.staff_id === responseData.id);
    assert.ok(mapping, "store_staff mapping must be created");
    assert.equal(mapping.store_id, storeA1Id);
    assert.equal(mapping.role_id, roleCashierId);
  });

  test("2. Staff member logs in with email + password, receiving staff JWT with tenant & role context", async () => {
    // Seed staff in mock DB
    const hashedPassword = await bcrypt.hash("CashierSecret@123", 10);
    const staffId = "staff-pooja-1";
    mockStaff.push({
      id: staffId,
      organization_id: orgAId,
      user_id: ownerAId,
      name: "Pooja Sharma",
      email: "pooja.cashier@karobar.test",
      phone: "+91 98102 33445",
      password_hash: hashedPassword,
      is_login_enabled: true,
      status: "active",
      jwt_version: 1
    });

    mockStoreStaff.push({
      id: "ss-1",
      store_id: storeA1Id,
      staff_id: staffId,
      role_id: roleCashierId
    });

    const loginResult = await AuthenticationService.login(
      "pooja.cashier@karobar.test",
      "CashierSecret@123",
      { ipAddress: "127.0.0.1", userAgent: "Chrome" }
    );

    assert.ok(loginResult.accessToken, "Should return JWT access token");
    assert.ok(loginResult.refreshToken, "Should return refresh token");
    assert.equal(loginResult.session.staffId, staffId);
    assert.equal(loginResult.session.organizationId, orgAId);
    assert.equal(loginResult.session.roleId, roleCashierId);
  });

  test("3. Cashier is authorized for POS billing and blocked from Admin Setup (RBAC)", async () => {
    const staffId = "staff-pooja-1";
    const tokenPayload = {
      sub: staffId,
      user_id: null,
      staff_id: staffId,
      tenant_id: orgAId,
      jwt_version: 1
    };

    mockStaff.push({
      id: staffId,
      organization_id: orgAId,
      is_login_enabled: true,
      status: "active",
      jwt_version: 1
    });

    mockStoreStaff.push({
      store_id: storeA1Id,
      staff_id: staffId,
      role_id: roleCashierId
    });

    // Mock request in store A1 context
    const req = {
      user: tokenPayload,
      headers: { "x-store-id": storeA1Id }
    };

    // Attach permissions
    await new Promise((resolve) => attachPermissions(req, {}, resolve));

    assert.ok(req.permissions.includes("create_sales"), "Cashier should have create_sales");
    assert.ok(req.permissions.includes("view_billing"), "Cashier should have view_billing");
    assert.equal(req.permissions.includes("admin_setup"), false, "Cashier MUST NOT have admin_setup");

    // Test authorization middleware
    let salesAllowed = false;
    authorize("create_sales")(req, {}, (err) => {
      if (!err) salesAllowed = true;
    });
    assert.equal(salesAllowed, true, "create_sales must be allowed");

    let adminBlocked = false;
    authorize("admin_setup")(req, {}, (err) => {
      if (err && err.statusCode === 403) adminBlocked = true;
    });
    assert.equal(adminBlocked, true, "admin_setup must return HTTP 403 Forbidden");
  });

  test("4. Multi-Store Isolation: Cashier assigned to Branch A1 is blocked from Branch A2 operations", async () => {
    const staffId = "staff-pooja-1";
    mockStoreStaff.push({
      store_id: storeA1Id,
      staff_id: staffId,
      role_id: roleCashierId
    });

    // Request sent with unassigned store header storeA2Id
    const req = {
      user: { user_id: null, staff_id: staffId, tenant_id: orgAId },
      headers: { "x-store-id": storeA2Id }
    };

    await new Promise((resolve) => attachPermissions(req, {}, resolve));

    assert.equal(req.permissions.length, 0, "Staff should have no permissions in unassigned store branch");

    let blockedInStoreB = false;
    authorize("create_sales")(req, {}, (err) => {
      if (err && err.statusCode === 403) blockedInStoreB = true;
    });
    assert.equal(blockedInStoreB, true, "Actions in unassigned store must be blocked");
  });

  test("5. Role Change: Owner promotes Cashier to Manager $\\rightarrow$ updated permissions take effect", async () => {
    const staffId = "staff-pooja-1";
    mockStaff.push({
      id: staffId,
      organization_id: orgAId,
      user_id: ownerAId,
      is_login_enabled: true,
      status: "active",
      jwt_version: 1
    });

    mockStoreStaff.push({
      store_id: storeA1Id,
      staff_id: staffId,
      role_id: roleCashierId
    });

    // Owner updates staff role to Manager
    const updateReq = {
      user: { id: ownerAId, user_id: ownerAId, organization_id: orgAId },
      tenantId: orgAId,
      params: { id: staffId },
      body: {
        store_id: storeA1Id,
        role_id: roleManagerId,
        position: "Store Manager"
      }
    };
    let statusCode = 200;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (d) => d
    };
    await StaffController.updateStaff(updateReq, res);

    assert.equal(statusCode, 200);

    // Re-evaluate permissions for staff
    const req = {
      user: { user_id: null, staff_id: staffId, tenant_id: orgAId },
      headers: { "x-store-id": storeA1Id }
    };
    await new Promise((resolve) => attachPermissions(req, {}, resolve));

    assert.ok(req.permissions.includes("edit_catalog"), "Promoted manager now has edit_catalog");
    assert.ok(req.permissions.includes("approve_po"), "Promoted manager now has approve_po");
  });

  test("6. Owner suspends staff: Login is blocked, jwt_version bumps, and existing sessions are revoked", async () => {
    const hashedPassword = await bcrypt.hash("Password123", 10);
    const staffId = "staff-sunil-1";
    mockStaff.push({
      id: staffId,
      organization_id: orgAId,
      user_id: ownerAId,
      name: "Sunil Verma",
      email: "sunil@karobar.test",
      password_hash: hashedPassword,
      is_login_enabled: true,
      status: "active",
      jwt_version: 1
    });

    // Seed active session
    mockSessions.push({ id: "sess-sunil-1", staff_id: staffId, revoked_at: null });
    mockRefreshTokens.push({ id: "rt-1", session_id: "sess-sunil-1", staff_id: staffId, revoked_at: null });

    // Owner suspends Sunil
    const statusReq = {
      user: { id: ownerAId, user_id: ownerAId, organization_id: orgAId },
      tenantId: orgAId,
      params: { id: staffId },
      body: { status: "suspended" }
    };
    let statusCode = 200;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (d) => d
    };
    await StaffController.updateStaffStatus(statusReq, res);

    assert.equal(statusCode, 200);

    const updated = mockStaff.find(s => s.id === staffId);
    assert.equal(updated.status, "suspended");
    assert.equal(updated.is_login_enabled, false);
    assert.equal(updated.jwt_version, 2, "jwt_version must be incremented to invalidate active JWTs");

    // Verify session revoked
    const session = mockSessions.find(s => s.id === "sess-sunil-1");
    assert.ok(session.revoked_at, "Active session must be revoked");

    // Attempting login while suspended must throw UnauthorizedError
    await assert.rejects(
      async () => {
        await AuthenticationService.login("sunil@karobar.test", "Password123", {});
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        assert.match(err.message, /disabled/i);
        return true;
      }
    );
  });

  test("7. Owner reactivates staff: Login is re-enabled and historical attendance/payroll records remain intact", async () => {
    const staffId = "staff-sunil-1";
    const hashedPassword = await bcrypt.hash("Password123", 10);
    mockStaff.push({
      id: staffId,
      organization_id: orgAId,
      user_id: ownerAId,
      name: "Sunil Verma",
      email: "sunil@karobar.test",
      password_hash: hashedPassword,
      is_login_enabled: false,
      status: "suspended",
      jwt_version: 2
    });

    // Seed historical attendance and payroll records
    mockAttendance.push({ id: "att-1", staff_id: staffId, user_id: ownerAId, status: "present", date: "2026-08-01" });
    mockPayroll.push({ id: "pay-1", staff_id: staffId, user_id: ownerAId, amount: 35000, month: 7 });

    // Reactivate Sunil
    const reactivateReq = {
      user: { id: ownerAId, user_id: ownerAId, organization_id: orgAId },
      tenantId: orgAId,
      params: { id: staffId },
      body: { status: "active" }
    };
    let statusCode = 200;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (d) => d
    };
    await StaffController.updateStaffStatus(reactivateReq, res);

    assert.equal(statusCode, 200);

    const reactivated = mockStaff.find(s => s.id === staffId);
    assert.equal(reactivated.status, "active");
    assert.equal(reactivated.is_login_enabled, true);

    // Login now succeeds
    const loginRes = await AuthenticationService.login("sunil@karobar.test", "Password123", {});
    assert.ok(loginRes.accessToken);

    // Historical records preserved
    assert.equal(mockAttendance.length, 1);
    assert.equal(mockPayroll.length, 1);
    assert.equal(mockAttendance[0].staff_id, staffId);
    assert.equal(mockPayroll[0].staff_id, staffId);
  });

  test("8. Tenant Isolation: Owner of Organization A cannot manage Organization B staff", async () => {
    const staffBId = "staff-org-b";
    mockStaff.push({
      id: staffBId,
      organization_id: orgBId,
      user_id: ownerBId,
      name: "Org B Worker",
      status: "active"
    });

    // Owner A attempts to suspend Org B staff
    const crossReq = {
      user: { id: ownerAId, user_id: ownerAId, organization_id: orgAId },
      tenantId: orgAId,
      params: { id: staffBId },
      body: { status: "suspended" }
    };

    let crossStatus = 200;
    const res = {
      status: (code) => { crossStatus = code; return res; },
      json: (d) => d
    };

    await StaffController.updateStaffStatus(crossReq, res);
    assert.equal(crossStatus, 404, "Cross-tenant staff modification must be rejected with 404");
  });
});
