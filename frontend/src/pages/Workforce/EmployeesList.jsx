import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/apiClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { 
  Users, Search, Edit, Key, Ban, UserCheck, ShieldCheck, 
  Store, Plus, Trash2, Shield, Calendar, DollarSign, X, Check,
  AlertCircle, Lock, Smartphone, Mail, Briefcase, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmployeesList() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Add Staff Form State
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    email: '',
    position: 'POS Cashier',
    salary_type: 'fixed',
    base_salary: '',
    is_login_enabled: true,
    password: '',
    store_id: '',
    role_id: ''
  });

  // Edit Staff Form State
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    position: '',
    salary_type: 'fixed',
    base_salary: '',
    is_login_enabled: false,
    new_password: '',
    store_id: '',
    role_id: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [staffRes, storesRes, matrixRes] = await Promise.all([
        API.get('/staff'),
        API.get('/stores'),
        API.get('/rbac/matrix').catch(() => ({ data: { data: { roles: [] } } }))
      ]);

      const staffList = staffRes.data || [];
      const storeList = storesRes.data?.data?.stores || [];
      const roleList = matrixRes.data?.data?.roles || [];

      setEmployees(staffList);
      setStores(storeList);
      setRoles(roleList);

      // Default first store/role for add form
      if (storeList.length > 0 && !addForm.store_id) {
        setAddForm(prev => ({ ...prev, store_id: storeList[0].id }));
      }
      const cashierRole = roleList.find(r => r.name === 'Cashier') || roleList[0];
      if (cashierRole && !addForm.role_id) {
        setAddForm(prev => ({ ...prev, role_id: cashierRole.id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load workforce directory');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      return toast.error('Employee name is required');
    }

    if (addForm.is_login_enabled) {
      if (!addForm.password || addForm.password.length < 6) {
        return toast.error('Password must be at least 6 characters for login access');
      }
      if (!addForm.email && !addForm.phone) {
        return toast.error('Email or Phone is required for login credentials');
      }
    }

    try {
      const payload = {
        name: addForm.name.trim(),
        phone: addForm.phone.trim(),
        email: addForm.email.trim() || null,
        position: addForm.position || 'Employee',
        salary_type: addForm.salary_type,
        base_salary: Number(addForm.base_salary || 0),
        is_login_enabled: Boolean(addForm.is_login_enabled),
        password: addForm.is_login_enabled ? addForm.password : undefined,
        store_id: addForm.store_id || null,
        role_id: addForm.role_id || null
      };

      const res = await API.post('/staff', payload);
      if (res.status === 200 || res.status === 201) {
        toast.success(`Staff member "${addForm.name}" created successfully!`);
        setShowAddModal(false);
        setAddForm({
          name: '',
          phone: '',
          email: '',
          position: 'POS Cashier',
          salary_type: 'fixed',
          base_salary: '',
          is_login_enabled: true,
          password: '',
          store_id: stores[0]?.id || '',
          role_id: roles.find(r => r.name === 'Cashier')?.id || roles[0]?.id || ''
        });
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to create staff member');
    }
  };

  const handleOpenEdit = (emp) => {
    setSelectedStaff(emp);
    const mapping = emp.store_staff?.[0];
    setEditForm({
      name: emp.name || '',
      phone: emp.phone || '',
      email: emp.email || '',
      position: emp.position || '',
      salary_type: emp.salary_type || 'fixed',
      base_salary: emp.base_salary || '',
      is_login_enabled: Boolean(emp.is_login_enabled),
      new_password: '',
      store_id: mapping?.store_id || emp.store_id || stores[0]?.id || '',
      role_id: mapping?.role_id || roles[0]?.id || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      const payload = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || null,
        position: editForm.position,
        salary_type: editForm.salary_type,
        base_salary: Number(editForm.base_salary || 0),
        is_login_enabled: Boolean(editForm.is_login_enabled),
        password: editForm.new_password ? editForm.new_password : undefined,
        store_id: editForm.store_id || null,
        role_id: editForm.role_id || null
      };

      const res = await API.put(`/staff/${selectedStaff.id}`, payload);
      if (res.status === 200) {
        toast.success(`Staff details updated successfully!`);
        setShowEditModal(false);
        setSelectedStaff(null);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update staff member');
    }
  };

  const handleToggleStatus = async (emp, targetStatus) => {
    const isSuspending = targetStatus === 'suspended';
    const actionLabel = isSuspending ? 'suspend' : 'reactivate';

    if (!window.confirm(`Are you sure you want to ${actionLabel} access for ${emp.name}?`)) {
      return;
    }

    try {
      const res = await API.patch(`/staff/${emp.id}/status`, {
        status: targetStatus,
        is_login_enabled: !isSuspending
      });

      if (res.status === 200) {
        toast.success(`Staff member ${emp.name} is now ${targetStatus}!`);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || `Failed to ${actionLabel} staff`);
    }
  };

  const handleDeleteStaff = async (emp) => {
    if (!window.confirm(`Are you sure you want to delete ${emp.name}? Historical payroll records will be unlinked.`)) {
      return;
    }

    try {
      const res = await API.delete(`/staff/${emp.id}`);
      if (res.status === 200) {
        toast.success(`Staff member removed.`);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to remove staff');
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.includes(searchTerm) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const mapping = emp.store_staff?.[0];
    const roleName = mapping?.roles?.name || emp.position;
    const matchesRole = filterRole === 'ALL' || roleName === filterRole;

    const empStatus = emp.status || 'active';
    const matchesStatus = filterStatus === 'ALL' || empStatus === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Metrics
  const totalEmployees = employees.length;
  const loginEnabledCount = employees.filter(e => e.is_login_enabled).length;
  const suspendedCount = employees.filter(e => e.status === 'suspended' || e.status === 'disabled').length;
  const activeCount = totalEmployees - suspendedCount;

  return (
    <div className="space-y-8 animate-fade-in-up pb-16 max-w-[1400px] mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[#0F172A] p-8 md:p-10 rounded-[36px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-brand-blue/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-[90px]" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 bg-brand-blue rounded-[26px] flex items-center justify-center text-white shadow-xl shadow-brand-blue/25 ring-4 ring-brand-blue/15">
            <Users size={38} />
          </div>
          <div>
            <h1 className="text-[30px] font-black text-white tracking-tight">Staff & Workforce Hub</h1>
            <p className="text-slate-400 text-sm font-medium mt-1">
              Manage multi-branch employee credentials, assign roles & control granular access.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Button 
            variant="secondary"
            onClick={() => navigate('/workforce/payroll')}
            icon={<Calendar size={18} />}
            className="bg-white/10 text-white border-white/10 hover:bg-white/20 px-5 py-3 rounded-2xl font-bold text-xs"
          >
            Attendance & Payroll
          </Button>
          <Button 
            variant="secondary"
            onClick={() => navigate('/rbac')}
            icon={<Shield size={18} />}
            className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30 px-5 py-3 rounded-2xl font-bold text-xs"
          >
            Access Matrix (RBAC)
          </Button>
          <Button 
            onClick={() => setShowAddModal(true)} 
            icon={<Plus size={18} />} 
            className="px-6 py-3.5 rounded-2xl font-black bg-brand-blue hover:bg-blue-600 text-white shadow-lg shadow-brand-blue/30 text-xs"
          >
            Add New Staff
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="p-6 bg-white rounded-[26px] border border-slate-100 shadow-sm">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Employees</p>
          <p className="text-[32px] font-black text-slate-900">{totalEmployees}</p>
        </div>
        <div className="p-6 bg-white rounded-[26px] border border-slate-100 shadow-sm">
          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-wider mb-1">Active Accounts</p>
          <p className="text-[32px] font-black text-emerald-600">{activeCount}</p>
        </div>
        <div className="p-6 bg-white rounded-[26px] border border-slate-100 shadow-sm">
          <p className="text-[11px] font-black text-brand-blue uppercase tracking-wider mb-1">Web/POS Login Enabled</p>
          <p className="text-[32px] font-black text-brand-blue">{loginEnabledCount}</p>
        </div>
        <div className="p-6 bg-white rounded-[26px] border border-slate-100 shadow-sm">
          <p className="text-[11px] font-black text-rose-500 uppercase tracking-wider mb-1">Suspended / Inactive</p>
          <p className="text-[32px] font-black text-rose-500">{suspendedCount}</p>
        </div>
      </div>

      {/* Directory Filter & Search Header */}
      <Card noPadding className="overflow-hidden border-none shadow-xl rounded-[32px] bg-white">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/40">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, phone, email, role..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 font-bold text-xs text-slate-800 outline-none focus:border-brand-blue shadow-inner"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">All Roles</option>
              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

            <Badge variant="outline" className="px-4 py-2 text-xs font-black tracking-widest uppercase text-slate-500 border-slate-200">
              Showing: {filteredEmployees.length} of {employees.length}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 font-bold animate-pulse">Loading workforce directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead className="bg-slate-50/70 border-b border-slate-100">
                <tr>
                  <Th className="py-5 px-6">Employee</Th>
                  <Th>System Role</Th>
                  <Th>Store Branch</Th>
                  <Th>Login Status</Th>
                  <Th>Account State</Th>
                  <Th className="text-right px-6">Actions</Th>
                </tr>
              </Thead>
              <Tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(emp => {
                  const mapping = emp.store_staff?.[0];
                  const roleName = mapping?.roles?.name || emp.position || 'Staff';
                  const storeName = mapping?.stores?.name || 'Main Branch';
                  const isSuspended = emp.status === 'suspended' || emp.status === 'disabled';

                  return (
                    <Tr key={emp.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Employee Info */}
                      <Td className="py-5 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-base font-black shadow-md">
                            {emp.name?.charAt(0).toUpperCase() || 'E'}
                          </div>
                          <div>
                            <p className="font-black text-sm text-slate-900">{emp.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                              {emp.phone && <span>📞 {emp.phone}</span>}
                              {emp.email && <span>✉️ {emp.email}</span>}
                              {emp.qr_token && <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">PIN: {emp.qr_token}</span>}
                            </div>
                          </div>
                        </div>
                      </Td>

                      {/* System Role */}
                      <Td>
                        <Badge variant="indigo" className="font-black tracking-wide text-[11px] py-1 px-3">
                          <ShieldCheck size={13} className="inline mr-1.5 text-indigo-600" />
                          {roleName}
                        </Badge>
                      </Td>

                      {/* Store Branch */}
                      <Td>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Store size={14} className="text-emerald-600 shrink-0" />
                          <span>{storeName}</span>
                        </div>
                      </Td>

                      {/* Login Status */}
                      <Td>
                        {emp.is_login_enabled ? (
                          <Badge variant="success" className="text-[10px] font-black uppercase tracking-wider py-1 px-2.5">
                            <Check size={11} className="inline mr-1" /> Web / POS Login
                          </Badge>
                        ) : (
                          <Badge variant="gray" className="text-[10px] font-black uppercase tracking-wider py-1 px-2.5">
                            Operational Only
                          </Badge>
                        )}
                      </Td>

                      {/* Account State */}
                      <Td>
                        {isSuspended ? (
                          <Badge variant="danger" className="text-[10px] font-black uppercase tracking-wider py-1 px-2.5">
                            Suspended
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px] font-black uppercase tracking-wider py-1 px-2.5">
                            Active
                          </Badge>
                        )}
                      </Td>

                      {/* Action Buttons */}
                      <Td className="text-right px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit Staff & Role"
                          >
                            <Edit size={16} />
                          </button>

                          {isSuspended ? (
                            <button
                              onClick={() => handleToggleStatus(emp, 'active')}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Reactivate Login"
                            >
                              <UserCheck size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(emp, 'suspended')}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Suspend Login Access"
                            >
                              <Ban size={16} />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteStaff(emp)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Remove Staff"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <Tr>
                    <Td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                      No staff members match the selected search and filters.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* 🟢 ADD NEW STAFF MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-xl p-8 space-y-6 my-8 animate-fade-in-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Users size={22} className="text-brand-blue" /> Add Staff Member
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Create an operational staff profile, configure credentials & assign branch role.
                </p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pooja Sharma"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98102 33445"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. pooja@karobar.test"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Job Title / Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. POS Cashier"
                    value={addForm.position}
                    onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Salary Type</label>
                  <select
                    value={addForm.salary_type}
                    onChange={(e) => setAddForm({ ...addForm, salary_type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
                  >
                    <option value="fixed">Fixed Monthly</option>
                    <option value="per_day">Daily Wage</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Base Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 28000"
                    value={addForm.base_salary}
                    onChange={(e) => setAddForm({ ...addForm, base_salary: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Branch & Role Assignment */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Branch & Role Assignment</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Store Branch *</label>
                    <select
                      value={addForm.store_id}
                      onChange={(e) => setAddForm({ ...addForm, store_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      required
                    >
                      {stores.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">System Role *</label>
                    <select
                      value={addForm.role_id}
                      onChange={(e) => setAddForm({ ...addForm, role_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      required
                    >
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Login Credentials Toggle */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-indigo-600" />
                    <div>
                      <p className="text-xs font-black text-slate-900">Enable Web & POS Login</p>
                      <p className="text-[11px] text-slate-500 font-medium">Allow staff to sign in with email/phone & password</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={addForm.is_login_enabled}
                    onChange={(e) => setAddForm({ ...addForm, is_login_enabled: e.target.checked })}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {addForm.is_login_enabled && (
                  <div className="pt-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Initial Password * (Min 6 chars)</label>
                    <input
                      type="password"
                      required={addForm.is_login_enabled}
                      placeholder="e.g. Karobar@12345"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-indigo-600"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-brand-blue hover:bg-blue-600 text-white font-black px-6 py-2.5 rounded-xl shadow-lg shadow-brand-blue/20">
                  Save Staff Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔵 EDIT STAFF MODAL */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-xl p-8 space-y-6 my-8 animate-fade-in-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Edit size={22} className="text-indigo-600" /> Edit Staff Details
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Update role, branch allocation, salary or reset credentials for {selectedStaff.name}.
                </p>
              </div>
              <button 
                onClick={() => { setShowEditModal(false); setSelectedStaff(null); }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Job Title</label>
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Branch & Role Assignment */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Branch & Role Assignment</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Store Branch</label>
                    <select
                      value={editForm.store_id}
                      onChange={(e) => setEditForm({ ...editForm, store_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      {stores.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">System Role</label>
                    <select
                      value={editForm.role_id}
                      onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Credentials & Password Reset */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">Web / POS Login Access</span>
                  <input
                    type="checkbox"
                    checked={editForm.is_login_enabled}
                    onChange={(e) => setEditForm({ ...editForm, is_login_enabled: e.target.checked })}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Reset Password (Leave blank to keep current)</label>
                  <input
                    type="password"
                    placeholder="New password..."
                    value={editForm.new_password}
                    onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => { setShowEditModal(false); setSelectedStaff(null); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20">
                  Update Staff Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
