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

    const role = (req.user?.role || "").toLowerCase();
    const isManager = role === 'manager' || role === 'admin' || !staffId;

    if (!isManager && staffId) {
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
    const role = (req.user?.role || "").toLowerCase();
    if (role === 'cashier' || (staffId && role !== 'manager' && role !== 'admin')) {
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
    const role = (req.user?.role || "").toLowerCase();

    if (role === 'cashier' || (staffId && staffId !== id)) {
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
    const role = (req.user?.role || "").toLowerCase();

    if (role === 'cashier' || staffId) {
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
    const role = (req.user?.role || "").toLowerCase();

    if (role === 'cashier' || staffId) {
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
    const userId = req.user?.id || req.user?.user_id;
    const sessionStaffId = req.user?.staff_id;
    const role = (req.user?.role || "").toLowerCase();
    const isManager = role === 'manager' || role === 'admin' || !sessionStaffId;

    let query = supabase.from('attendance').select('*, staff(name, position)');
    
    // If regular staff (e.g. Cashier), restrict to their own attendance
    if (!isManager && sessionStaffId) {
      query = query.eq('staff_id', sessionStaffId);
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
    const { staff_id, date, status, clock_in, clock_out, notes } = req.body;
    const userId = req.user?.id || req.user?.user_id;
    const sessionStaffId = req.user?.staff_id;
    const role = (req.user?.role || "").toLowerCase();
    const isManager = role === 'manager' || role === 'admin' || !sessionStaffId;

    // Non-managers can only mark attendance for their own staff record
    const targetStaffId = (!isManager && sessionStaffId) ? sessionStaffId : (staff_id || sessionStaffId);
    if (!targetStaffId) {
      return res.status(400).json({ error: "Staff ID is required" });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const attendanceStatus = status || 'present';

    const payload = { 
      staff_id: targetStaffId, 
      user_id: userId,
      date: attendanceDate, 
      status: attendanceStatus
    };

    if (clock_in) payload.clock_in = clock_in;
    if (clock_out) payload.clock_out = clock_out;
    if (notes) payload.notes = notes;

    // Default clock_in if not set
    if (!payload.clock_in) {
      payload.clock_in = new Date().toISOString();
    }
    // If marking half_day / clocked out and clock_out not explicitly supplied, timestamp it
    if ((attendanceStatus === 'half_day' || attendanceStatus === 'absent') && !payload.clock_out) {
      payload.clock_out = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('attendance')
      .upsert(payload, { onConflict: 'staff_id, date' })
      .select('*, staff(name, position)')
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("markAttendance error:", error);
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

/**
 * Staff self-service: Update own profile (name, phone, avatar only)
 * PUT /api/staff/me/profile
 */
export const updateMyProfile = async (req, res) => {
  try {
    const staffId = req.user?.staff_id;
    if (!staffId) {
      return res.status(403).json({ error: 'Only staff members can use this endpoint' });
    }

    // Staff can only update safe fields - not role, salary, login settings etc.
    const { name, phone, avatar_url } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    updates.updated_at = new Date().toISOString();

    const { data: updatedStaff, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', staffId)
      .select('id, name, phone, email, position, status, is_login_enabled')
      .single();

    if (error) throw error;
    res.status(200).json(updatedStaff);
  } catch (error) {
    console.error('updateMyProfile error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Staff self-service: Change own password
 * PUT /api/staff/me/password
 */
export const updateMyPassword = async (req, res) => {
  try {
    const staffId = req.user?.staff_id;
    if (!staffId) {
      return res.status(403).json({ error: 'Only staff members can use this endpoint' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'currentPassword and newPassword (min 6 chars) are required' });
    }

    // Fetch current password hash
    const { data: staff, error: fetchErr } = await supabase
      .from('staff')
      .select('password_hash, jwt_version')
      .eq('id', staffId)
      .single();

    if (fetchErr || !staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    if (!staff.password_hash) {
      return res.status(400).json({ error: 'No password set for this account. Contact your manager.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, staff.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password
    const newHash = await bcrypt.hash(newPassword, 10);
    await supabase
      .from('staff')
      .update({
        password_hash: newHash,
        jwt_version: (staff.jwt_version || 1) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId);

    // Revoke all existing sessions so staff must log in again with new password
    await SessionService.revokeAllSessionsForStaff(staffId).catch(() => {});

    res.status(200).json({ message: 'Password updated successfully. Please log in again with your new password.' });
  } catch (error) {
    console.error('updateMyPassword error:', error);
    res.status(500).json({ error: error.message });
  }
};
