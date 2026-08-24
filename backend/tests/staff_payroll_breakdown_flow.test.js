import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as StaffController from "../src/controllers/StaffController.js";
import { supabase } from "../src/config/db.js";

describe("Karobar Staff Salary Payout & Attendance Breakdown Flow Tests", () => {
  let mockStaff = [];
  let mockAttendance = [];
  let mockPayroll = [];

  const orgAId = "org-111";
  const orgBId = "org-222";
  const ownerAId = "owner-111";
  const ownerBId = "owner-222";
  const staffId = "staff-vikas-1";
  const staffBId = "staff-foreign-2";

  function applyFilters(tableName, filters) {
    let list = [];
    if (tableName === "staff") list = [...mockStaff];
    if (tableName === "attendance") list = [...mockAttendance];
    if (tableName === "payroll") list = [...mockPayroll];

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
              const row = { id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...payloads[0] };
              if (tableName === "payroll") mockPayroll.push(row);
              if (tableName === "attendance") mockAttendance.push(row);
              return { data: row, error: null };
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
    mockStaff = [
      {
        id: staffId,
        user_id: ownerAId,
        organization_id: orgAId,
        name: "Vikas Kumar",
        position: "Store Cashier",
        base_salary: 30000,
        salary_type: "fixed",
        is_login_enabled: true,
        status: "active"
      },
      {
        id: staffBId,
        user_id: ownerBId,
        organization_id: orgBId,
        name: "Foreign Staff",
        position: "Manager",
        base_salary: 45000,
        status: "active"
      }
    ];

    // Seed 30 days of attendance: 20 Present, 4 Half Day, 6 Absent
    mockAttendance = [];
    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-08-${String(day).padStart(2, '0')}`;
      let status = 'present';
      if (day > 20 && day <= 24) status = 'half_day';
      if (day > 24) status = 'absent';

      mockAttendance.push({
        id: `att-${day}`,
        staff_id: staffId,
        user_id: ownerAId,
        organization_id: orgAId,
        date: dateStr,
        status
      });
    }

    mockPayroll = [];
  });

  test("1. Attendance breakdown calculation: 20 Present + 4 Half Day yields 22 Payable Days", async () => {
    const req = {
      user: { id: ownerAId, user_id: ownerAId, organization_id: orgAId },
      tenantId: orgAId,
      query: {
        staff_id: staffId,
        start: "2026-08-01",
        end: "2026-08-30"
      }
    };

    let result = null;
    const res = {
      status: () => res,
      json: (data) => { result = data; return res; }
    };

    await StaffController.getAttendance(req, res);

    assert.ok(Array.isArray(result), "Should return attendance array");
    const presentCount = result.filter(a => a.status === "present").length;
    const halfCount = result.filter(a => a.status === "half_day").length;
    const absentCount = result.filter(a => a.status === "absent").length;

    assert.equal(presentCount, 20);
    assert.equal(halfCount, 4);
    assert.equal(absentCount, 6);

    const payableDays = presentCount + (halfCount * 0.5);
    assert.equal(payableDays, 22, "Payable days must equal 20 + 4 * 0.5 = 22");
  });

  test("2. Salary Payout Creation: Persists frozen calculation snapshot, advance deduction, and attendance snapshot", async () => {
    // 1. Seed prior advance payment of ₹5,000
    mockPayroll.push({
      id: "adv-1",
      staff_id: staffId,
      user_id: ownerAId,
      organization_id: orgAId,
      payment_type: "advance",
      total_paid: 5000,
      payment_status: "paid"
    });

    const attendanceSnapshot = mockAttendance.map(a => ({ date: a.date, status: a.status }));

    // Calculation:
    // Base Salary: ₹30,000 (30 days @ ₹1,000/day)
    // Payable Days: 22 -> Earned Base: ₹22,000
    // Absence Cuts: ₹8,000
    // Advance Recovery: ₹5,000
    // Bonus: ₹2,000
    // Final Net Payout: ₹22,000 - ₹5,000 + ₹2,000 = ₹19,000
    const req = {
      user: { id: ownerAId, user_id: ownerAId, organization_id: orgAId },
      tenantId: orgAId,
      body: {
        staff_id: staffId,
        month: 8,
        year: 2026,
        period_start: "2026-08-01",
        period_end: "2026-08-30",
        base_pay: 30000,
        present_days: 20,
        half_days: 4,
        absent_days: 6,
        payable_days: 22,
        advance_deduction: 5000,
        deductions: 13000,
        bonus: 2000,
        total_paid: 19000,
        payment_type: "salary",
        payment_status: "paid",
        attendance_snapshot: attendanceSnapshot,
        notes: "August 2026 Salary Settlement"
      }
    };

    let statusCode = 200;
    let payoutRecord = null;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { payoutRecord = d; return res; }
    };

    await StaffController.processPayment(req, res);

    assert.equal(statusCode, 201);
    assert.ok(payoutRecord.id);
    assert.equal(payoutRecord.total_paid, 19000);
    assert.equal(payoutRecord.payable_days, 22);
    assert.equal(payoutRecord.advance_deduction, 5000);
    assert.equal(payoutRecord.attendance_snapshot.length, 30);
    assert.ok(payoutRecord.calculated_at);
  });

  test("3. Historical Immutability: Editing or deleting attendance later does NOT alter the saved payout record", async () => {
    // 1. Seed existing completed payout record
    mockPayroll.push({
      id: "pay-aug-2026",
      staff_id: staffId,
      user_id: ownerAId,
      organization_id: orgAId,
      month: 8,
      year: 2026,
      period_start: "2026-08-01",
      period_end: "2026-08-30",
      base_pay: 30000,
      present_days: 20,
      half_days: 4,
      absent_days: 6,
      payable_days: 22,
      total_paid: 19000,
      payment_type: "salary",
      payment_status: "paid"
    });

    // 2. Modify live attendance records drastically
    mockAttendance = mockAttendance.map(a => ({ ...a, status: "absent" }));

    // 3. Retrieve payroll records
    const req = {
      user: { id: ownerAId, user_id: ownerAId, organization_id: orgAId },
      tenantId: orgAId,
      query: { staff_id: staffId, type: "salary" }
    };

    let records = [];
    const res = {
      status: () => res,
      json: (data) => { records = data; return res; }
    };

    await StaffController.getPayroll(req, res);

    const savedPayout = records.find(p => p.month === 8 && p.year === 2026);
    assert.ok(savedPayout, "Saved payout must exist");
    assert.equal(savedPayout.total_paid, 19000, "Payout total must remain intact");
    assert.equal(savedPayout.payable_days, 22, "Payable days snapshot must remain 22");
    assert.equal(savedPayout.present_days, 20, "Present days snapshot must remain 20");
  });

  test("4. Duplicate Payout Prevention: Processing payout for the same employee + period returns 409 Conflict", async () => {
    // 1. Seed first payout
    mockPayroll.push({
      id: "pay-first",
      staff_id: staffId,
      user_id: ownerAId,
      organization_id: orgAId,
      month: 8,
      year: 2026,
      period_start: "2026-08-01",
      period_end: "2026-08-30",
      payment_type: "salary",
      total_paid: 19000
    });

    // 2. Attempt second payout for same period
    const req = {
      user: { id: ownerAId, user_id: ownerAId, organization_id: orgAId },
      tenantId: orgAId,
      body: {
        staff_id: staffId,
        month: 8,
        year: 2026,
        period_start: "2026-08-01",
        period_end: "2026-08-30",
        base_pay: 30000,
        total_paid: 19000,
        payment_type: "salary"
      }
    };

    let statusCode = 200;
    let responseData = null;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { responseData = d; return res; }
    };

    await StaffController.processPayment(req, res);

    assert.equal(statusCode, 409, "Duplicate payout must be blocked with HTTP 409");
    assert.match(responseData.error, /already been processed/i);
  });

  test("5. Tenant Isolation: Organization A cannot process payroll for Organization B employee", async () => {
    const crossReq = {
      user: { id: ownerAId, user_id: ownerAId, organization_id: orgAId },
      tenantId: orgAId,
      body: {
        staff_id: staffBId,
        month: 8,
        year: 2026,
        total_paid: 45000,
        payment_type: "salary"
      }
    };

    let statusCode = 200;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => d
    };

    await StaffController.processPayment(crossReq, res);
    assert.equal(statusCode, 404, "Cross-tenant staff payroll must be rejected with 404");
  });
});
