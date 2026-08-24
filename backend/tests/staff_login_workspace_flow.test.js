import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as StaffController from "../src/controllers/StaffController.js";
import * as StoreController from "../src/controllers/StoreController.js";
import { supabase } from "../src/config/db.js";

describe("Karobar Staff Login Experience & Role-Based Workspace Flow Tests", () => {
  let mockStaff = [];
  let mockStores = [];
  let mockStoreStaff = [];
  let mockRoles = [];
  let mockPermissions = [];
  let mockRolePermissions = [];
  let mockAttendance = [];
  let mockPayroll = [];
  let mockUserStorePreferences = [];

  const orgAId = "org-alpha-1";
  const orgBId = "org-beta-2";
  const ownerAId = "user-owner-1";
  const ownerBId = "user-owner-2";

  // Stores
  const storeA1 = "store-alpha-main";
  const storeA2 = "store-alpha-north";
  const storeB1 = "store-beta-main";

  // Staff members
  const cashierStaffId = "staff-cashier-101";
  const warehouseStaffId = "staff-warehouse-102";
  const accountantStaffId = "staff-accountant-103";
  const managerStaffId = "staff-manager-104";

  function applyFilters(tableName, filters) {
    let list = [];
    if (tableName === "staff") list = [...mockStaff];
    if (tableName === "stores") list = [...mockStores];
    if (tableName === "store_staff") list = [...mockStoreStaff];
    if (tableName === "roles") list = [...mockRoles];
    if (tableName === "permissions") list = [...mockPermissions];
    if (tableName === "role_permissions") list = [...mockRolePermissions];
    if (tableName === "attendance") list = [...mockAttendance];
    if (tableName === "payroll") list = [...mockPayroll];
    if (tableName === "user_store_preferences") list = [...mockUserStorePreferences];

    for (const f of filters) {
      if (f.type === "eq") {
        list = list.filter(item => item[f.col] === f.val);
      } else if (f.type === "gte") {
        list = list.filter(item => item[f.col] >= f.val);
      } else if (f.type === "lte") {
        list = list.filter(item => item[f.col] <= f.val);
      }
    }
    return list;
  }

  function createQueryBuilder(tableName) {
    const filters = [];
    const builder = {
      select: () => builder,
      eq: (col, val) => {
        filters.push({ type: "eq", col, val });
        return builder;
      },
      gte: (col, val) => {
        filters.push({ type: "gte", col, val });
        return builder;
      },
      lte: (col, val) => {
        filters.push({ type: "lte", col, val });
        return builder;
      },
      or: (cond) => {
        filters.push({ type: "or", cond });
        return builder;
      },
      order: () => builder,
      single: async () => {
        const results = applyFilters(tableName, filters);
        return { data: results[0] || null, error: results[0] ? null : { message: "Not found" } };
      },
      maybeSingle: async () => {
        const results = applyFilters(tableName, filters);
        return { data: results[0] || null, error: null };
      },
      then: (resolve) => {
        const results = applyFilters(tableName, filters);
        resolve({ data: results, error: null });
      }
    };
    return builder;
  }

  before(() => {
    supabase.from = (tableName) => {
      const qb = createQueryBuilder(tableName);
      return {
        select: (fields) => qb,
        insert: (payloads) => ({
          select: () => ({
            single: async () => {
              const row = { id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...payloads[0] };
              if (tableName === "payroll") mockPayroll.push(row);
              if (tableName === "attendance") mockAttendance.push(row);
              if (tableName === "stores") mockStores.push(row);
              return { data: row, error: null };
            }
          })
        }),
        upsert: (payload, opts) => ({
          select: () => ({
            single: async () => {
              if (tableName === "user_store_preferences") {
                const existingIdx = mockUserStorePreferences.findIndex(p => p.user_id === payload.user_id);
                if (existingIdx >= 0) {
                  mockUserStorePreferences[existingIdx] = { ...mockUserStorePreferences[existingIdx], ...payload };
                  return { data: mockUserStorePreferences[existingIdx], error: null };
                } else {
                  mockUserStorePreferences.push(payload);
                  return { data: payload, error: null };
                }
              }
              return { data: payload, error: null };
            }
          })
        }),
        delete: () => ({
          eq: (col, val) => ({
            eq: (col2, val2) => {
              if (tableName === "payroll") mockPayroll = mockPayroll.filter(p => !(p[col] === val && p[col2] === val2));
              return { error: null };
            }
          })
        })
      };
    };
  });

  beforeEach(() => {
    mockStores = [
      { id: storeA1, user_id: ownerAId, organization_id: orgAId, name: "Alpha Main Store", is_active: true },
      { id: storeA2, user_id: ownerAId, organization_id: orgAId, name: "Alpha North Warehouse", is_active: true },
      { id: storeB1, user_id: ownerBId, organization_id: orgBId, name: "Beta Store Branch", is_active: true }
    ];

    mockRoles = [
      { id: "role-cashier", name: "Cashier", description: "POS sales & checkout" },
      { id: "role-warehouse", name: "Warehouse Staff", description: "Stock & receiving" },
      { id: "role-accountant", name: "Accountant", description: "Ledger, expenses & GST" },
      { id: "role-manager", name: "Manager", description: "Store operations & staff" }
    ];

    mockStaff = [
      {
        id: cashierStaffId,
        user_id: ownerAId,
        organization_id: orgAId,
        name: "Rahul Cashier",
        position: "POS Cashier",
        base_salary: 22000,
        salary_type: "fixed",
        is_login_enabled: true,
        status: "active"
      },
      {
        id: warehouseStaffId,
        user_id: ownerAId,
        organization_id: orgAId,
        name: "Suresh Warehouse",
        position: "Warehouse Staff",
        base_salary: 24000,
        salary_type: "fixed",
        is_login_enabled: true,
        status: "active"
      },
      {
        id: accountantStaffId,
        user_id: ownerAId,
        organization_id: orgAId,
        name: "Anjali Accountant",
        position: "Accountant",
        base_salary: 35000,
        salary_type: "fixed",
        is_login_enabled: true,
        status: "active"
      },
      {
        id: managerStaffId,
        user_id: ownerAId,
        organization_id: orgAId,
        name: "Vikram Manager",
        position: "Manager",
        base_salary: 50000,
        salary_type: "fixed",
        is_login_enabled: true,
        status: "active"
      }
    ];

    // Cashier assigned only to Store A1
    // Manager assigned to Store A1 and Store A2
    mockStoreStaff = [
      { id: "ss-1", staff_id: cashierStaffId, store_id: storeA1, role_id: "role-cashier", stores: mockStores[0], roles: mockRoles[0] },
      { id: "ss-2", staff_id: warehouseStaffId, store_id: storeA2, role_id: "role-warehouse", stores: mockStores[1], roles: mockRoles[1] },
      { id: "ss-3", staff_id: accountantStaffId, store_id: storeA1, role_id: "role-accountant", stores: mockStores[0], roles: mockRoles[2] },
      { id: "ss-4", staff_id: managerStaffId, store_id: storeA1, role_id: "role-manager", stores: mockStores[0], roles: mockRoles[3] },
      { id: "ss-5", staff_id: managerStaffId, store_id: storeA2, role_id: "role-manager", stores: mockStores[1], roles: mockRoles[3] }
    ];

    mockAttendance = [
      { id: "att-c-1", staff_id: cashierStaffId, date: "2026-08-20", status: "present" },
      { id: "att-w-1", staff_id: warehouseStaffId, date: "2026-08-20", status: "present" }
    ];

    mockPayroll = [
      {
        id: "pay-c-1",
        staff_id: cashierStaffId,
        month: 8,
        year: 2026,
        base_pay: 22000,
        payable_days: 25,
        total_paid: 20000,
        payment_type: "salary",
        payment_status: "paid"
      },
      {
        id: "pay-w-1",
        staff_id: warehouseStaffId,
        month: 8,
        year: 2026,
        base_pay: 24000,
        payable_days: 28,
        total_paid: 23500,
        payment_type: "salary",
        payment_status: "paid"
      }
    ];

    mockUserStorePreferences = [];
  });

  test("1. Cashier Login Context: Stores query returns only assigned Store A1 with Cashier role", async () => {
    const req = {
      user: { id: cashierStaffId, staff_id: cashierStaffId, organization_id: orgAId, role: "Cashier" }
    };

    let responseData = null;
    const res = {
      status: () => res,
      json: (data) => { responseData = data; return res; }
    };

    await StoreController.getStores(req, res);

    assert.ok(responseData.success, "Stores query must succeed");
    const stores = responseData.data.stores;
    assert.equal(stores.length, 1, "Cashier should only have 1 assigned store");
    assert.equal(stores[0].id, storeA1, "Assigned store must be Store A1");
    assert.equal(stores[0].assigned_role, "Cashier");
  });

  test("2. Manager Login Context: Manager with multiple branches sees Store A1 & Store A2", async () => {
    const req = {
      user: { id: managerStaffId, staff_id: managerStaffId, organization_id: orgAId, role: "Manager" }
    };

    let responseData = null;
    const res = {
      status: () => res,
      json: (data) => { responseData = data; return res; }
    };

    await StoreController.getStores(req, res);

    assert.ok(responseData.success);
    const stores = responseData.data.stores;
    assert.equal(stores.length, 2, "Manager should see both assigned branches");
    const storeIds = stores.map(s => s.id);
    assert.ok(storeIds.includes(storeA1) && storeIds.includes(storeA2));
  });

  test("3. Branch Isolation: Cashier attempting to switch to unassigned Store A2 is blocked with 403", async () => {
    const req = {
      user: { id: cashierStaffId, staff_id: cashierStaffId, organization_id: orgAId },
      params: { id: storeA2 }
    };

    let statusCode = 200;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await StoreController.switchStore(req, res);

    assert.equal(statusCode, 403, "Switching to unassigned store must be rejected with 403");
    assert.match(responseData.message || responseData.error, /not assigned/i);
  });

  test("4. Multi-Branch Switching: Manager can switch between assigned Store A1 and Store A2", async () => {
    const req = {
      user: { id: managerStaffId, staff_id: managerStaffId, organization_id: orgAId },
      params: { id: storeA2 }
    };

    let statusCode = 200;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await StoreController.switchStore(req, res);

    assert.equal(statusCode, 200);
    assert.ok(responseData.success);
    assert.equal(responseData.data.active_store_id, storeA2);
  });

  test("5. Payroll Isolation: Cashier querying payroll only receives their own payslips", async () => {
    const req = {
      user: { id: cashierStaffId, staff_id: cashierStaffId, organization_id: orgAId },
      tenantId: orgAId,
      query: {}
    };

    let records = [];
    const res = {
      status: () => res,
      json: (data) => { records = data; return res; }
    };

    await StaffController.getPayroll(req, res);

    assert.ok(Array.isArray(records));
    assert.equal(records.length, 1, "Staff should only see 1 personal payslip");
    assert.equal(records[0].staff_id, cashierStaffId, "Payslip must belong strictly to cashier");
    assert.equal(records[0].total_paid, 20000);
  });

  test("6. Attendance Isolation: Staff querying attendance only sees their own records", async () => {
    const req = {
      user: { id: cashierStaffId, staff_id: cashierStaffId, organization_id: orgAId },
      tenantId: orgAId,
      query: {}
    };

    let records = [];
    const res = {
      status: () => res,
      json: (data) => { records = data; return res; }
    };

    await StaffController.getAttendance(req, res);

    assert.ok(Array.isArray(records));
    assert.equal(records.length, 1);
    assert.equal(records[0].staff_id, cashierStaffId);
  });

  test("7. Self-Service Profile: Staff can retrieve their own profile data", async () => {
    const req = {
      user: { id: cashierStaffId, staff_id: cashierStaffId, organization_id: orgAId }
    };

    let profileData = null;
    const res = {
      status: () => res,
      json: (data) => { profileData = data; return res; }
    };

    await StaffController.getMyProfile(req, res);

    assert.ok(profileData);
    assert.equal(profileData.id, cashierStaffId);
    assert.equal(profileData.name, "Rahul Cashier");
    assert.equal(profileData.position, "POS Cashier");
  });

  test("8. Security: Staff attempting to process salary payout is rejected with 403 Forbidden", async () => {
    const req = {
      user: { id: cashierStaffId, staff_id: cashierStaffId, organization_id: orgAId },
      tenantId: orgAId,
      body: {
        staff_id: warehouseStaffId,
        month: 8,
        year: 2026,
        total_paid: 25000,
        payment_type: "salary"
      }
    };

    let statusCode = 200;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await StaffController.processPayment(req, res);

    assert.equal(statusCode, 403, "Staff cannot create salary payouts");
    assert.match(responseData.error, /only business owners/i);
  });

  test("9. Security: Staff attempting to change another staff status is rejected with 403 Forbidden", async () => {
    const req = {
      user: { id: cashierStaffId, staff_id: cashierStaffId, organization_id: orgAId },
      tenantId: orgAId,
      params: { id: warehouseStaffId },
      body: { status: "suspended" }
    };

    let statusCode = 200;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await StaffController.updateStaffStatus(req, res);

    assert.equal(statusCode, 403, "Staff cannot change employee status");
  });

  test("10. Tenant & Cross-Organization Security: Staff cannot access foreign organization Store B1", async () => {
    const crossReq = {
      user: { id: cashierStaffId, staff_id: cashierStaffId, organization_id: orgAId },
      params: { id: storeB1 }
    };

    let statusCode = 200;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => data
    };

    await StoreController.switchStore(crossReq, res);
    assert.equal(statusCode, 403, "Foreign organization store switch must be rejected with 403");
  });
});
