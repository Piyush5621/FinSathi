import bcrypt from 'bcryptjs';
import { supabase } from '../config/db.js';
import { SessionService } from '../modules/identity/services/SessionService.js';

export const getStaff = async (req, res) => {
  try {
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const userId = req.user?.id || req.user?.user_id;
    const staffId = req.user?.staff_id;

    // If staff user without admin setup permission, restrict to own profile
    let query = supabase
      .from('staff')
      .select('*, store_staff(*, stores(*), roles(*))');

    if (staffId) {
      query = query.eq('id', staffId);
    } else if (orgId) {
      query = query.or(`organization_id.eq.${orgId},user_id.eq.${userId}`);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("getStaff error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const userId = req.user?.id || req.user?.user_id;
    const staffId = req.user?.staff_id;

    if (staffId && staffId !== id) {
      return res.status(403).json({ error: "You can only view your own profile" });
    }

    const { data: staff, error } = await supabase
      .from('staff')
      .select('*, store_staff(*, stores(*), roles(*))')
      .eq('id', id)
      .single();

    if (error || !staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    if (orgId && staff.organization_id && staff.organization_id !== orgId) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    if (!orgId && staff.user_id !== userId) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    res.status(200).json(staff);
  } catch (error) {
    console.error("getStaffById error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const addStaff = async (req, res) => {
  try {
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const userId = req.user?.id || req.user?.user_id;
    const staffId = req.user?.staff_id;

    if (staffId) {
      return res.status(403).json({ error: "Only business owners and managers can add staff" });
    }

    const {
      name,
      phone,
      email,
      position,
      salary_type,
      base_salary,
      is_login_enabled,
      password,
      store_id,
      role_id,
      qr_token
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Staff name is required" });
    }

    const loginEnabled = Boolean(is_login_enabled);
    let passwordHash = null;

    if (loginEnabled) {
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password with at least 6 characters is required when login is enabled" });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const staffPayload = {
      name,
      phone: phone || null,
      email: email || null,
      position: position || "Employee",
      salary_type: salary_type || "fixed",
      base_salary: Number(base_salary || 0),
      is_login_enabled: loginEnabled,
      password_hash: passwordHash,
      user_id: userId,
      organization_id: orgId || null,
      store_id: store_id || null,
      qr_token: qr_token || Math.floor(100000 + Math.random() * 900000).toString(),
      status: "active",
      jwt_version: 1
    };

    const { data: createdStaff, error: staffErr } = await supabase
      .from('staff')
      .insert([staffPayload])
      .select()
      .single();

    if (staffErr) throw staffErr;

    // If store_id and role_id are provided, assign to store_staff
    if (store_id && role_id && createdStaff) {
      await supabase
        .from('store_staff')
        .upsert({
          store_id,
          staff_id: createdStaff.id,
          role_id
        }, { onConflict: 'store_id,staff_id' })
        .catch(err => console.warn('store_staff assignment warning:', err.message));
    }

    const { data: fullStaff } = await supabase
      .from('staff')
      .select('*, store_staff(*, stores(*), roles(*))')
      .eq('id', createdStaff.id)
      .single();

    res.status(201).json(fullStaff || createdStaff);
  } catch (error) {
    console.error("addStaff error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const userId = req.user?.id || req.user?.user_id;
    const staffId = req.user?.staff_id;

    if (staffId && staffId !== id) {
      return res.status(403).json({ error: "Only business owners can update staff settings" });
    }

    const { data: staff, error: fetchErr } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    if (orgId && staff.organization_id && staff.organization_id !== orgId) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    if (!orgId && staff.user_id !== userId) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const {
      name,
      phone,
      email,
      position,
      salary_type,
      base_salary,
      is_login_enabled,
      password,
      store_id,
      role_id
    } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (typeof phone !== 'undefined') updates.phone = phone;
    if (typeof email !== 'undefined') updates.email = email;

    // Privileged fields can only be changed by owner
    if (!staffId) {
      if (typeof position !== 'undefined') updates.position = position;
      if (typeof salary_type !== 'undefined') updates.salary_type = salary_type;
      if (typeof base_salary !== 'undefined') updates.base_salary = Number(base_salary);
      if (typeof is_login_enabled !== 'undefined') updates.is_login_enabled = Boolean(is_login_enabled);
      if (store_id) updates.store_id = store_id;
    }

    if (password && password.length >= 6) {
      updates.password_hash = await bcrypt.hash(password, 10);
      updates.jwt_version = (staff.jwt_version || 1) + 1;
      await SessionService.revokeAllSessionsForStaff(id).catch(() => {});
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedStaff, error: updateErr } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    if (!staffId && store_id && role_id) {
      await supabase
        .from('store_staff')
        .upsert({
          store_id,
          staff_id: id,
          role_id
        }, { onConflict: 'store_id,staff_id' })
        .catch(err => console.warn('store_staff assignment warning:', err.message));
    }

    const { data: fullStaff } = await supabase
      .from('staff')
      .select('*, store_staff(*, stores(*), roles(*))')
      .eq('id', id)
      .single();

    res.status(200).json(fullStaff || updatedStaff);
  } catch (error) {
    console.error("updateStaff error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, is_login_enabled } = req.body;
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const userId = req.user?.id || req.user?.user_id;
    const staffId = req.user?.staff_id;

    if (staffId) {
      return res.status(403).json({ error: "Only business owners can change employee status" });
    }

    const { data: staff, error: fetchErr } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    if (orgId && staff.organization_id && staff.organization_id !== orgId) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    if (!orgId && staff.user_id !== userId) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const updates = {};
    if (status) {
      updates.status = status;
      if (status === 'suspended' || status === 'disabled' || status === 'inactive') {
        updates.is_login_enabled = false;
        updates.jwt_version = (staff.jwt_version || 1) + 1;
        await SessionService.revokeAllSessionsForStaff(id).catch(() => {});
      } else if (status === 'active') {
        if (typeof is_login_enabled !== 'undefined') {
          updates.is_login_enabled = Boolean(is_login_enabled);
        } else {
          updates.is_login_enabled = Boolean(staff.password_hash);
        }
        updates.jwt_version = (staff.jwt_version || 1) + 1;
      }
    } else if (typeof is_login_enabled !== 'undefined') {
      updates.is_login_enabled = Boolean(is_login_enabled);
      if (!is_login_enabled) {
        updates.jwt_version = (staff.jwt_version || 1) + 1;
        await SessionService.revokeAllSessionsForStaff(id).catch(() => {});
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedStaff, error: updateErr } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select('*, store_staff(*, stores(*), roles(*))')
      .single();

    if (updateErr) throw updateErr;

    res.status(200).json(updatedStaff);
  } catch (error) {
    console.error("updateStaffStatus error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const userId = req.user?.id || req.user?.user_id;
    const staffId = req.user?.staff_id;

    if (staffId) {
      return res.status(403).json({ error: "Only business owners can remove staff" });
    }

    const { data: staff, error: fetchErr } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    if (orgId && staff.organization_id && staff.organization_id !== orgId) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    if (!orgId && staff.user_id !== userId) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    await SessionService.revokeAllSessionsForStaff(id).catch(() => {});
    await supabase.from('store_staff').delete().eq('staff_id', id).catch(() => {});
    await supabase.from('user_permissions').delete().eq('staff_id', id).catch(() => {});

    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
    res.status(200).json({ message: "Staff member removed" });
  } catch (error) {
    console.error("deleteStaff error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { date, staff_id, start, end } = req.query;
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const userId = req.user?.id || req.user?.user_id;
    const sessionStaffId = req.user?.staff_id;

    let query = supabase.from('attendance').select('*, staff(name, position)');
    
    // If staff user, forcefully restrict to their own attendance
    if (sessionStaffId) {
      query = query.eq('staff_id', sessionStaffId);
    } else if (orgId) {
      query = query.or(`organization_id.eq.${orgId},user_id.eq.${userId}`);
      if (staff_id) query = query.eq('staff_id', staff_id);
    } else {
      query = query.eq('user_id', userId);
      if (staff_id) query = query.eq('staff_id', staff_id);
    }
    
    if (date) query = query.eq('date', date);
    if (start) query = query.gte('date', start.split('T')[0]);
    if (end) query = query.lte('date', end.split('T')[0]);

    const { data, error } = await query.order('date', { ascending: true });
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { staff_id, date, status, clock_in } = req.body;
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const userId = req.user?.id || req.user?.user_id;
    const sessionStaffId = req.user?.staff_id;

    const targetStaffId = sessionStaffId || staff_id;
    if (!targetStaffId) {
      return res.status(400).json({ error: "Staff ID is required" });
    }

    const { data, error } = await supabase
      .from('attendance')
      .upsert({ 
        staff_id: targetStaffId, 
        user_id: userId,
        organization_id: orgId || null,
        date: date || new Date().toISOString().split('T')[0], 
        status: status || 'present',
        clock_in: clock_in || new Date().toISOString()
      }, { onConflict: 'staff_id, date' })
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPayroll = async (req, res) => {
  try {
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const userId = req.user?.id || req.user?.user_id;
    const sessionStaffId = req.user?.staff_id;
    const { staff_id, type } = req.query;

    let query = supabase
      .from('payroll')
      .select('*, staff(name, position, phone, email, base_salary, qr_token)')
      .order('created_at', { ascending: false });

    // If staff user, strictly restrict to their own payslips
    if (sessionStaffId) {
      query = query.eq('staff_id', sessionStaffId);
    } else if (orgId) {
      query = query.or(`organization_id.eq.${orgId},user_id.eq.${userId}`);
      if (staff_id) query = query.eq('staff_id', staff_id);
    } else {
      query = query.eq('user_id', userId);
      if (staff_id) query = query.eq('staff_id', staff_id);
    }

    if (type) query = query.eq('payment_type', type);

    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const processPayment = async (req, res) => {
  try {
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const userId = req.user?.id || req.user?.user_id;
    const sessionStaffId = req.user?.staff_id;

    if (sessionStaffId) {
      return res.status(403).json({ error: "Only business owners and managers can process salary payouts" });
    }

    const {
      staff_id,
      month,
      year,
      period_start,
      period_end,
      base_pay,
      present_days,
      half_days,
      absent_days,
      payable_days,
      advance_deduction,
      deductions,
      bonus,
      total_paid,
      payment_status,
      payment_type,
      payment_date,
      attendance_snapshot,
      notes
    } = req.body;

    if (!staff_id) {
      return res.status(400).json({ error: "Staff ID is required" });
    }

    const { data: staffMember, error: staffErr } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staff_id)
      .single();

    if (staffErr || !staffMember) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    if (orgId && staffMember.organization_id && staffMember.organization_id !== orgId) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    if (!orgId && staffMember.user_id !== userId) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const payType = payment_type || 'salary';

    if (payType === 'salary') {
      let dupQuery = supabase
        .from('payroll')
        .select('id')
        .eq('staff_id', staff_id)
        .eq('payment_type', 'salary');

      if (month && year) {
        dupQuery = dupQuery.eq('month', month).eq('year', year);
      } else if (period_start && period_end) {
        dupQuery = dupQuery.eq('period_start', period_start).eq('period_end', period_end);
      }

      const { data: existingPayout } = await dupQuery.maybeSingle();
      if (existingPayout) {
        return res.status(409).json({
          error: `Salary payout for this employee and period (${month ? `${month}/${year}` : `${period_start} to ${period_end}`}) has already been processed.`
        });
      }
    }

    const payload = {
      staff_id,
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
      period_start: period_start || null,
      period_end: period_end || null,
      base_pay: Number(base_pay || 0),
      present_days: Number(present_days || 0),
      half_days: Number(half_days || 0),
      absent_days: Number(absent_days || 0),
      payable_days: Number(payable_days || 0),
      advance_deduction: Number(advance_deduction || 0),
      deductions: Number(deductions || 0),
      bonus: Number(bonus || 0),
      total_paid: Number(total_paid || 0),
      payment_status: payment_status || 'paid',
      payment_type: payType,
      payment_date: payment_date || new Date().toISOString(),
      attendance_snapshot: attendance_snapshot || null,
      notes: notes || null,
      user_id: userId,
      organization_id: orgId || null,
      calculated_at: new Date().toISOString()
    };

    const { data: record, error } = await supabase
      .from('payroll')
      .insert([payload])
      .select('*, staff(name, position, phone, email, base_salary, qr_token)')
      .single();

    if (error) throw error;
    res.status(201).json(record);
  } catch (error) {
    console.error("processPayment error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionStaffId = req.user?.staff_id;

    if (sessionStaffId) {
      return res.status(403).json({ error: "Only business owners can delete payment records" });
    }

    const { error } = await supabase
      .from('payroll')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(200).json({ message: "Payment deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Self-service endpoints for logged in staff
export const getMyProfile = async (req, res) => {
  try {
    const staffId = req.user.staff_id;
    const userId = req.user.id || req.user.user_id;

    if (staffId) {
      const { data: staff, error } = await supabase
        .from('staff')
        .select('id, name, phone, email, position, base_salary, salary_type, qr_token, status, is_login_enabled, last_login_at, store_staff(*, stores(*), roles(*))')
        .eq('id', staffId)
        .single();

      if (error) throw error;
      return res.status(200).json(staff);
    } else {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, phone, business_name, is_active')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return res.status(200).json({ ...user, role: 'Owner' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
