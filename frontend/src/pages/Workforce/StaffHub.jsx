import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../../services/apiClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { 
  Users, Search, Edit, Ban, UserCheck, ShieldCheck, 
  Store, Plus, Trash2, Calendar, X, Check,
  AlertCircle, Lock, QrCode,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Info, RefreshCw,
  Clock, Phone, Mail,
  KeyRound, ArrowRight, UserPlus, Filter, CalendarDays, Shield
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

// Merchant-friendly capability definitions
const CAPABILITY_METADATA = {
  view_catalog: { label: 'View Products & Prices', group: 'Inventory', desc: 'Can browse product catalog and stock levels' },
  edit_catalog: { label: 'Add & Edit Products', group: 'Inventory', desc: 'Can create new items, change prices & update stock' },
  delete_inventory: { label: 'Delete Products', group: 'Inventory', desc: 'Can remove items permanently from catalog' },
  run_counts: { label: 'Stock Counts & Audits', group: 'Inventory', desc: 'Can enter physical stock count numbers' },
  create_sales: { label: 'Create POS Bills', group: 'Sales & Billing', desc: 'Can ring up sales and print customer invoices' },
  view_billing: { label: 'View Sales History', group: 'Sales & Billing', desc: 'Can view past customer bills and sales records' },
  approve_po: { label: 'Approve Supplier Orders', group: 'Purchases', desc: 'Can confirm and authorize purchase orders' },
  post_invoices: { label: 'Enter Supplier Invoices', group: 'Purchases', desc: 'Can record vendor purchase bills into inventory' },
  adjust_costs: { label: 'Adjust Cost Prices', group: 'Financials', desc: 'Can update supplier purchase costs and margins' },
  admin_setup: { label: 'Manage Store Settings & Roles', group: 'Owner Controls', desc: 'Can change store settings, staff access & permissions' }
};

const ROLE_HELPERS = {
  Owner: 'Full unrestricted access to all business features, settings, and financial reports.',
  Manager: 'Can manage daily operations, product catalog, customer billing, and supplier orders.',
  Cashier: 'Focused strictly on POS billing, customer checkout, and viewing bill history.',
  Accountant: 'Can record vendor bills, view billing records, and review product catalogs for taxation.',
  'Warehouse Staff': 'Can view catalog products and perform stock count adjustments.',
  'Delivery Staff': 'Can look up orders and catalog products for delivery fulfillment.'
};

export default function StaffHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active logged in user
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser.role || (currentUser.staff_id ? 'Staff' : 'Owner');
  const isStaff = !!(currentUser.staff_id);
  const isOwner = !isStaff || userRole === 'Owner' || userRole === 'Admin';
  const isManager = isOwner || userRole === 'Manager';

  // Active Tab: 'team' | 'roles' | 'attendance'
  const defaultTab = isManager ? 'team' : 'attendance';
  let activeTab = searchParams.get('tab') || defaultTab;
  if (!isManager && activeTab !== 'attendance') {
    activeTab = 'attendance';
  }
  if (!isOwner && activeTab === 'roles') {
    activeTab = isManager ? 'team' : 'attendance';
  }

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // Shared Data States
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [stores, setStores] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [attendance, setAttendance] = useState([]);

  // Search & Filter States for Team Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Unified Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false);
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

  // Edit Staff Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
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

  // Attendance Calendar States
  const [calStaffId, setCalStaffId] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calData, setCalData] = useState([]);
  const [showStoreQR, setShowStoreQR] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    fetchGlobalData();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance' && calStaffId) {
      fetchCalendarData();
    }
  }, [activeTab, calStaffId, calMonth, calYear]);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [staffRes, storesRes, matrixRes, attRes] = await Promise.all([
        API.get('/staff'),
        API.get('/stores').catch(() => ({ data: { data: { stores: [] } } })),
        API.get('/rbac/matrix').catch(() => ({ data: { data: { roles: [], permissions: [], rolePermissions: [] } } })),
        API.get(`/staff/attendance?date=${today}`).catch(() => ({ data: [] }))
      ]);

      const staffList = staffRes.data || [];
      const storeList = storesRes.data?.data?.stores || [];
      const matrixData = matrixRes.data?.data || { roles: [], permissions: [], rolePermissions: [] };

      setStaff(staffList);
      setStores(storeList);
      setRoles(matrixData.roles || []);
      setPermissions(matrixData.permissions || []);
      setRolePermissions(matrixData.rolePermissions || []);
      setAttendance(attRes.data || []);

      if (staffList.length > 0 && !calStaffId) {
        setCalStaffId(staffList[0].id);
      }

      if (storeList.length > 0 && !addForm.store_id) {
        setAddForm(prev => ({ ...prev, store_id: storeList[0].id }));
      }
      const defaultRole = (matrixData.roles || []).find(r => r.name === 'Cashier') || (matrixData.roles || [])[0];
      if (defaultRole && !addForm.role_id) {
        setAddForm(prev => ({ ...prev, role_id: defaultRole.id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load staff details');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    if (!calStaffId) return;
    const firstDay = new Date(calYear, calMonth, 1).toISOString();
    const lastDay = new Date(calYear, calMonth + 1, 0).toISOString();

    try {
      const { data } = await API.get(`/staff/attendance?staff_id=${calStaffId}&start=${firstDay}&end=${lastDay}`);
      setCalData(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // TEAM TAB ACTIONS (OWNER ONLY)
  // ----------------------------------------------------
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      return toast.error('Employee name is required');
    }

    if (addForm.is_login_enabled) {
      if (!addForm.password || addForm.password.length < 6) {
        return toast.error('Password must be at least 6 characters for login');
      }
      if (!addForm.email && !addForm.phone) {
        return toast.error('Email or Phone is required for login credentials');
      }
    }

    try {
      const payload = {
        name: addForm.name.trim(),
        phone: addForm.phone.trim() || null,
        email: addForm.email.trim() || null,
        position: addForm.position || 'Employee',
        salary_type: addForm.salary_type,
        base_salary: Number(addForm.base_salary || 0),
        is_login_enabled: Boolean(addForm.is_login_enabled),
        password: addForm.is_login_enabled ? addForm.password : undefined,
        store_id: addForm.store_id || null,
        role_id: addForm.role_id || null
      };

      await API.post('/staff', payload);
      toast.success(`Employee "${addForm.name}" added successfully!`);
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
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to add staff member');
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
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        position: editForm.position,
        salary_type: editForm.salary_type,
        base_salary: Number(editForm.base_salary || 0),
        is_login_enabled: Boolean(editForm.is_login_enabled),
        password: editForm.new_password ? editForm.new_password : undefined,
        store_id: editForm.store_id || null,
        role_id: editForm.role_id || null
      };

      await API.put(`/staff/${selectedStaff.id}`, payload);
      toast.success(`Staff details updated successfully!`);
      setShowEditModal(false);
      setSelectedStaff(null);
      fetchGlobalData();
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
      await API.patch(`/staff/${emp.id}/status`, {
        status: targetStatus,
        is_login_enabled: !isSuspending
      });

      toast.success(`Staff member ${emp.name} is now ${targetStatus}!`);
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || `Failed to ${actionLabel} staff`);
    }
  };

  const handleDeleteStaff = async (emp) => {
    if (!window.confirm(`Are you sure you want to remove ${emp.name}? This will unlink their attendance and store assignments.`)) {
      return;
    }

    try {
      await API.delete(`/staff/${emp.id}`);
      toast.success(`Staff member removed.`);
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to remove staff');
    }
  };

  // ----------------------------------------------------
  // ROLES & PERMISSIONS TAB ACTIONS
  // ----------------------------------------------------
  const isPermissionEnabled = (roleId, permissionId) => {
    return rolePermissions.some(rp => rp.role_id === roleId && rp.permission_id === permissionId);
  };

  const handleToggleRolePermission = async (roleId, permissionId) => {
    if (!isOwner) return;
    const isEnabled = isPermissionEnabled(roleId, permissionId);
    let nextPermissions;
    if (isEnabled) {
      nextPermissions = rolePermissions
        .filter(rp => rp.role_id === roleId && rp.permission_id !== permissionId)
        .map(rp => rp.permission_id);
    } else {
      nextPermissions = [
        ...rolePermissions.filter(rp => rp.role_id === roleId).map(rp => rp.permission_id),
        permissionId
      ];
    }

    const previous = [...rolePermissions];
    if (isEnabled) {
      setRolePermissions(prev => prev.filter(rp => !(rp.role_id === roleId && rp.permission_id === permissionId)));
    } else {
      setRolePermissions(prev => [...prev, { role_id: roleId, permission_id: permissionId }]);
    }

    try {
      await API.post(`/rbac/roles/${roleId}/permissions`, { permissionIds: nextPermissions });
      toast.success('Role permissions updated');
    } catch (err) {
      setRolePermissions(previous);
      toast.error('Failed to update permission');
    }
  };

  // ----------------------------------------------------
  // ATTENDANCE TAB ACTIONS
  // ----------------------------------------------------
  const handleMarkAttendance = async (staffId, status) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await API.post('/staff/attendance', {
        staff_id: staffId,
        date: today,
        status: status,
        clock_in: new Date().toISOString()
      });
      toast.success(`Marked as ${status}`);
      fetchGlobalData();
      if (calStaffId === staffId) fetchCalendarData();
    } catch (err) {
      toast.error('Failed to update attendance');
    }
  };

  // Filtered employees for Team tab
  const filteredEmployees = staff.filter(emp => {
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

  // KPI Metrics
  const totalEmployees = staff.length;
  const presentTodayCount = attendance.filter(a => a.status === 'present').length;
  const loginEnabledCount = staff.filter(e => e.is_login_enabled).length;

  const storeQRValue = `${window.location.origin}/attend?biz=${currentUser.id || ''}`;

  // Modern navigation tabs
  const navigationTabs = isOwner ? [
    { id: 'team', label: 'Team Directory', icon: Users, badge: staff.length },
    { id: 'roles', label: 'Roles & Access', icon: ShieldCheck, badge: roles.length },
    { id: 'attendance', label: 'Attendance & Kiosk', icon: Calendar, badge: presentTodayCount ? `${presentTodayCount} In` : null }
  ] : (userRole === 'Manager' ? [
    { id: 'team', label: 'Team Directory', icon: Users, badge: staff.length },
    { id: 'attendance', label: 'Attendance & Kiosk', icon: Calendar, badge: presentTodayCount ? `${presentTodayCount} In` : null }
  ] : [
    { id: 'attendance', label: 'My Attendance Log', icon: Calendar }
  ]);

  // Calendar days generation for Attendance Tab
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 🟢 Modern Header Console */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-2xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isManager ? 'Workforce & Staff Operations' : 'My Attendance & Store Log'}
            </h1>
            {(currentUser.store_name || currentUser.shop_name) && (
              <Badge variant="secondary" className="text-xs font-bold py-0.5 px-2.5 bg-slate-100 text-slate-700 border-slate-200">
                <Store size={12} className="inline mr-1 text-emerald-600" />
                {currentUser.store_name || currentUser.shop_name}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {isManager 
              ? 'Manage employee rosters, role capabilities, store assignments, and attendance.'
              : 'View your live attendance records and store check-in history.'}
          </p>
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() => setShowStoreQR(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            >
              <QrCode size={16} className="mr-1.5 text-slate-700" />
              Shop QR Kiosk
            </Button>
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <UserPlus size={16} className="mr-1.5" />
              Add Staff
            </Button>
          </div>
        )}
      </div>

      {/* 🟢 4-Pillar Workforce Snapshot (Owner Only) */}
      {isOwner && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Staff</span>
              <Users size={18} className="text-slate-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalEmployees}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Active business roster</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">On Duty Today</span>
              <UserCheck size={18} className="text-emerald-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">{presentTodayCount}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              {presentTodayCount === totalEmployees ? 'Full team present' : `${totalEmployees - presentTodayCount} pending / absent`}
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-indigo-600 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Web / POS Logins</span>
              <KeyRound size={18} className="text-indigo-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600">{loginEnabledCount}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Authenticated system users</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Store Branches</span>
              <Store size={18} className="text-slate-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{stores.length}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Configured retail locations</p>
          </div>
        </div>
      )}

      {/* 🟢 Modern Segmented Tab Navigation Bar */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100/90 border border-slate-200 rounded-2xl w-full sm:w-fit">
        {navigationTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: TEAM DIRECTORY (OWNER & MANAGER)              */}
      {/* ==================================================== */}
      {activeTab === 'team' && isManager && (
        <Card noPadding className="overflow-hidden border border-slate-200/80 shadow-2xs rounded-2xl bg-white">
          {/* Filter Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search staff by name, phone, email, designation..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 font-medium text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                aria-label="Filter by Role"
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Roles</option>
                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter by Status"
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>

              {(searchTerm || filterRole !== 'ALL' || filterStatus !== 'ALL') && (
                <button
                  onClick={() => { setSearchTerm(''); setFilterRole('ALL'); setFilterStatus('ALL'); }}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  Reset
                </button>
              )}

              <span className="text-[11px] font-bold text-slate-500 px-2">
                {filteredEmployees.length} of {staff.length} staff
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 font-semibold animate-pulse">Loading team roster...</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <Thead className="bg-slate-50/70 border-b border-slate-100">
                    <tr>
                      <Th className="py-3.5 px-6">Employee</Th>
                      <Th>Assigned Role</Th>
                      <Th>Store Branch</Th>
                      <Th>Login Access</Th>
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
                        <Tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                          <Td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-black shadow-xs shrink-0">
                                {emp.name?.charAt(0).toUpperCase() || 'E'}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-900">{emp.name}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                                  {emp.phone && <span>📞 {emp.phone}</span>}
                                  {emp.email && <span>✉️ {emp.email}</span>}
                                  {emp.qr_token && (
                                    <span className="font-mono text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded font-bold">
                                      PIN: {emp.qr_token}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Td>

                          <Td>
                            <Badge variant="indigo" className="font-bold text-[11px] py-0.5 px-2.5">
                              <ShieldCheck size={12} className="inline mr-1 text-indigo-600" />
                              {roleName}
                            </Badge>
                          </Td>

                          <Td>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <Store size={13} className="text-emerald-600 shrink-0" />
                              <span>{storeName}</span>
                            </div>
                          </Td>

                          <Td>
                            {emp.is_login_enabled ? (
                              <Badge variant="success" className="text-[10px] font-bold py-0.5 px-2">
                                <Check size={11} className="inline mr-1" /> Web / POS
                              </Badge>
                            ) : (
                              <Badge variant="gray" className="text-[10px] font-bold py-0.5 px-2 text-slate-500">
                                Operational Only
                              </Badge>
                            )}
                          </Td>

                          <Td>
                            {isSuspended ? (
                              <Badge variant="danger" className="text-[10px] font-bold py-0.5 px-2">
                                Suspended
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] font-bold py-0.5 px-2">
                                Active
                              </Badge>
                            )}
                          </Td>

                          <Td className="text-right px-6">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(emp)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Edit Staff & Role"
                              >
                                <Edit size={15} />
                              </button>

                              {isSuspended ? (
                                <button
                                  onClick={() => handleToggleStatus(emp, 'active')}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="Reactivate Login"
                                >
                                  <UserCheck size={15} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(emp, 'suspended')}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Suspend Login Access"
                                >
                                  <Ban size={15} />
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteStaff(emp)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Remove Staff"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </Td>
                        </Tr>
                      );
                    })}

                    {filteredEmployees.length === 0 && (
                      <Tr>
                        <Td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                          No team members match your search criteria.
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </div>

              {/* Mobile Card List View (< 768px) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredEmployees.map(emp => {
                  const mapping = emp.store_staff?.[0];
                  const roleName = mapping?.roles?.name || emp.position || 'Staff';
                  const storeName = mapping?.stores?.name || 'Main Branch';
                  const isSuspended = emp.status === 'suspended' || emp.status === 'disabled';

                  return (
                    <div key={emp.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-black shrink-0">
                            {emp.name?.charAt(0).toUpperCase() || 'E'}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">{emp.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{emp.position}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(emp, isSuspended ? 'active' : 'suspended')}
                            className={`p-1.5 rounded-lg ${isSuspended ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}
                          >
                            {isSuspended ? <UserCheck size={14} /> : <Ban size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(emp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center text-xs">
                        <Badge variant="indigo" className="text-[10px] py-0.5 px-2 font-bold">
                          {roleName}
                        </Badge>
                        <span className="text-slate-500 text-[11px]">
                          🏪 {storeName}
                        </span>
                        {emp.qr_token && (
                          <span className="font-mono text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded text-[10px] font-bold">
                            PIN: {emp.qr_token}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                        <span>{emp.phone || emp.email || 'No contact details'}</span>
                        <span className={`font-bold ${isSuspended ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <div className="p-8 text-center text-slate-400 font-medium text-xs">
                    No team members match your search criteria.
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      {/* ==================================================== */}
      {/* TAB 2: ATTENDANCE & KIOSK (OWNER & STAFF)             */}
      {/* ==================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Today's Live Attendance Table */}
          <Card noPadding className="overflow-hidden border border-slate-200/80 shadow-2xs rounded-2xl bg-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  {isOwner ? "Today's Live Attendance Roster" : "My Attendance Status"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clock in directly or let staff use the QR counter kiosk.
                </p>
              </div>

              {isOwner && (
                <Button 
                  variant="secondary" 
                  onClick={() => setShowStoreQR(true)} 
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 px-3.5 py-2 rounded-xl font-bold text-xs"
                >
                  <QrCode size={15} className="mr-1.5" />
                  Show Counter QR
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <Thead className="bg-slate-50/70 border-b border-slate-100">
                  <tr>
                    <Th className="py-3.5 px-6">Employee</Th>
                    <Th>Worker PIN</Th>
                    <Th>Today's Status</Th>
                    <Th className="text-right px-6">Direct Clock-In</Th>
                  </tr>
                </Thead>
                <Tbody className="divide-y divide-slate-100">
                  {staff.map(emp => {
                    const todayRecord = attendance.find(a => a.staff_id === emp.id);
                    const status = todayRecord?.status;

                    return (
                      <Tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                        <Td className="py-3.5 px-6">
                          <p className="font-bold text-sm text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.position}</p>
                        </Td>

                        <Td>
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            PIN: {emp.qr_token || '123456'}
                          </span>
                        </Td>

                        <Td>
                          {status === 'present' && (
                            <Badge variant="success" className="text-xs font-bold py-0.5 px-2.5">
                              <Check size={12} className="inline mr-1" /> Present
                            </Badge>
                          )}
                          {status === 'half_day' && (
                            <Badge variant="warning" className="text-xs font-bold py-0.5 px-2.5">
                              Half Day
                            </Badge>
                          )}
                          {status === 'absent' && (
                            <Badge variant="danger" className="text-xs font-bold py-0.5 px-2.5">
                              Absent
                            </Badge>
                          )}
                          {!status && (
                            <Badge variant="gray" className="text-xs font-bold py-0.5 px-2.5 text-slate-500">
                              Not Marked
                            </Badge>
                          )}
                        </Td>

                        <Td className="text-right px-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleMarkAttendance(emp.id, 'present')}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-all"
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(emp.id, 'half_day')}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg transition-all"
                            >
                              ½ Half
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(emp.id, 'absent')}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-all"
                            >
                              Absent
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
          </Card>

          {/* Monthly Attendance Calendar Review */}
          <Card className="p-5 sm:p-6 border border-slate-200/80 shadow-2xs rounded-2xl bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-indigo-600" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">Monthly Attendance Calendar</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isOwner && (
                  <select
                    value={calStaffId}
                    onChange={(e) => setCalStaffId(e.target.value)}
                    aria-label="Select Employee"
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.position})</option>)}
                  </select>
                )}

                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
                  <button
                    onClick={() => {
                      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                      else setCalMonth(m => m - 1);
                    }}
                    className="p-1 text-slate-600 hover:text-slate-900"
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2 text-xs font-bold text-slate-700">
                    {new Date(calYear, calMonth).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                      else setCalMonth(m => m + 1);
                    }}
                    className="p-1 text-slate-600 hover:text-slate-900"
                    title="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center pt-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-1">
                  {d}
                </div>
              ))}

              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2 sm:p-3 rounded-xl bg-slate-50/40" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const record = calData.find(r => r.date === dateStr);
                const status = record?.status;

                let badgeClass = "bg-slate-50 text-slate-600 border-slate-100";
                if (status === 'present') badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
                else if (status === 'half_day') badgeClass = "bg-amber-50 text-amber-700 border-amber-200 font-bold";
                else if (status === 'absent') badgeClass = "bg-rose-50 text-rose-700 border-rose-200 font-bold";

                return (
                  <div 
                    key={dayNum} 
                    className={`p-2 sm:p-3 rounded-xl border text-xs flex flex-col items-center justify-between min-h-[52px] sm:min-h-[64px] transition-all ${badgeClass}`}
                  >
                    <span className="font-bold">{dayNum}</span>
                    {status && (
                      <span className="text-[9px] uppercase font-black tracking-tight">
                        {status === 'half_day' ? 'Half' : status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: ROLES & ACCESS (OWNER ONLY)                   */}
      {/* ==================================================== */}
      {activeTab === 'roles' && isOwner && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-600" size={20} />
              <h2 className="text-base font-black text-slate-900">Role Capabilities & Store Access Control</h2>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed font-medium">
              Assign and modify role permissions across your business. Changes apply immediately across all assigned staff in their store branches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map(role => {
              const helperText = ROLE_HELPERS[role.name] || role.description || 'Custom store role';
              const assignedCount = staff.filter(s => s.store_staff?.[0]?.role_id === role.id).length;

              return (
                <Card key={role.id} className="p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4 bg-white">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-slate-900">{role.name}</h3>
                      <Badge variant="indigo" className="text-[10px] font-bold">
                        {assignedCount} Assigned
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">{helperText}</p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Role Capabilities</p>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {permissions.map(perm => {
                        const enabled = isPermissionEnabled(role.id, perm.id);
                        const meta = CAPABILITY_METADATA[perm.key] || { label: perm.label, desc: '' };
                        return (
                          <div 
                            key={perm.id} 
                            onClick={() => handleToggleRolePermission(role.id, perm.id)}
                            className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                              enabled ? 'bg-indigo-50 text-indigo-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            <span className="truncate pr-2">{meta.label}</span>
                            {enabled ? (
                              <CheckCircle size={15} className="text-indigo-600 shrink-0" />
                            ) : (
                              <XCircle size={15} className="text-slate-300 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 🟢 UNIFIED ADD STAFF MODAL (OWNER ONLY) */}
      {showAddModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg p-6 sm:p-8 space-y-5 my-8 animate-fade-in-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <UserPlus size={20} className="text-indigo-600" /> Add Staff Member
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Configure employee details, role permissions, and branch assignment.
                </p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pooja Sharma"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98102 33445"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. pooja@karobar.test"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Job Title / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. POS Cashier"
                    value={addForm.position}
                    onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Salary Type</label>
                  <select
                    value={addForm.salary_type}
                    onChange={(e) => setAddForm({ ...addForm, salary_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="fixed">Fixed Monthly</option>
                    <option value="per_day">Daily Wage</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Base Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={addForm.base_salary}
                    onChange={(e) => setAddForm({ ...addForm, base_salary: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Branch & Role Assignment */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Branch & Role Assignment</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Store Branch *</label>
                    <select
                      value={addForm.store_id}
                      onChange={(e) => setAddForm({ ...addForm, store_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                      required
                    >
                      {stores.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Assigned Role *</label>
                    <select
                      value={addForm.role_id}
                      onChange={(e) => setAddForm({ ...addForm, role_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                      required
                    >
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Login Credentials Toggle */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={15} className="text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Enable Web & POS Login</p>
                      <p className="text-[10px] text-slate-500 font-medium">Allows login with email/phone & password</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={addForm.is_login_enabled}
                    onChange={(e) => setAddForm({ ...addForm, is_login_enabled: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {addForm.is_login_enabled && (
                  <div className="pt-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Password * (Min 6 chars)</label>
                    <input
                      type="password"
                      required={addForm.is_login_enabled}
                      placeholder="e.g. Karobar@12345"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-indigo-600"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl shadow-xs">
                  Save Staff Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 EDIT STAFF MODAL */}
      {showEditModal && selectedStaff && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg p-6 sm:p-8 space-y-5 my-8 animate-fade-in-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Edit size={20} className="text-indigo-600" /> Edit Staff Details
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Update role, branch allocation, salary or credentials for {selectedStaff.name}.
                </p>
              </div>
              <button 
                onClick={() => { setShowEditModal(false); setSelectedStaff(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Job Title</label>
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Branch & Role Assignment</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Store Branch</label>
                    <select
                      value={editForm.store_id}
                      onChange={(e) => setEditForm({ ...editForm, store_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      {stores.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Assigned Role</label>
                    <select
                      value={editForm.role_id}
                      onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Web / POS Login Access</span>
                  <input
                    type="checkbox"
                    checked={editForm.is_login_enabled}
                    onChange={(e) => setEditForm({ ...editForm, is_login_enabled: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Reset Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    placeholder="New password..."
                    value={editForm.new_password}
                    onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => { setShowEditModal(false); setSelectedStaff(null); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl shadow-xs">
                  Update Staff
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 STORE CHECK-IN QR CODE MODAL */}
      {showStoreQR && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900">Shop Check-In QR Terminal</h3>
              <button onClick={() => setShowStoreQR(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl flex justify-center border border-slate-100 shadow-inner">
              <QRCodeSVG value={storeQRValue} size={180} level="H" />
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Place this QR at the store counter. Staff can scan with any phone or tablet to open the high-speed PIN terminal.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
