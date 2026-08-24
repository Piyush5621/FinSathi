import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../../services/apiClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { 
  Users, Search, Edit, Ban, UserCheck, ShieldCheck, 
  Store, Plus, Trash2, Shield, Calendar, DollarSign, X, Check,
  AlertCircle, Lock, QrCode, Wallet, Coins, HandCoins, Calculator,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Info, RefreshCw,
  ShoppingBag, Package, Receipt, Award, Landmark, User, Clock,
  FileText, Printer, Eye, ChevronDown, ChevronUp
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
  const userRole = currentUser.role || 'Owner';
  const isOwner = userRole === 'Owner' || userRole === 'Admin' || !currentUser.staff_id;

  // Active Tab: 'team' | 'roles' | 'attendance' | 'payroll'
  const defaultTab = isOwner ? 'team' : 'attendance';
  const activeTab = searchParams.get('tab') || defaultTab;
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
  const [payroll, setPayroll] = useState([]);

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

  // Payroll & Salary Payout Modal States
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: '', notes: '' });
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAttendanceDetailView, setShowAttendanceDetailView] = useState(false);
  const [showSalarySlipModal, setShowSalarySlipModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);

  // Comprehensive Pay Calculation State
  const [payForm, setPayForm] = useState({ 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    totalDaysInPeriod: 30,
    presentDays: 0,
    halfDays: 0,
    absentDays: 0,
    payableDays: 0,
    baseSalary: 0,
    dailyRate: 0,
    earnedBasePay: 0,
    leaveDeductions: 0,
    advanceDeduction: 0,
    bonus: 0,
    netPayable: 0,
    attendanceRecords: [],
    periodLabel: ''
  });

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
      const [staffRes, storesRes, matrixRes, attRes, payrollRes] = await Promise.all([
        API.get('/staff'),
        API.get('/stores').catch(() => ({ data: { data: { stores: [] } } })),
        API.get('/rbac/matrix').catch(() => ({ data: { data: { roles: [], permissions: [], rolePermissions: [] } } })),
        API.get(`/staff/attendance?date=${today}`).catch(() => ({ data: [] })),
        API.get('/staff/payroll').catch(() => ({ data: [] }))
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
      setPayroll(payrollRes.data || []);

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
    if (!window.confirm(`Are you sure you want to remove ${emp.name}? This will unlink their attendance and payroll.`)) {
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
      await API.post(`/rbac/roles/${roleId}/permissions`, { permissions: nextPermissions });
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

  // ----------------------------------------------------
  // PAYROLL & ATTENDANCE BREAKDOWN CALCULATION
  // ----------------------------------------------------
  const handleOpenPayModal = async (emp) => {
    setSelectedStaff(emp);
    setShowAttendanceDetailView(false);
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startStr = startOfMonth.toISOString().split('T')[0];
    const endStr = endOfMonth.toISOString().split('T')[0];

    await calculateSalaryBreakdownForPeriod(emp, startStr, endStr);
    setShowPayModal(true);
  };

  const calculateSalaryBreakdownForPeriod = async (emp, startStr, endStr) => {
    try {
      const [attRes, advRes] = await Promise.all([
        API.get(`/staff/attendance?staff_id=${emp.id}&start=${startStr}&end=${endStr}`).catch(() => ({ data: [] })),
        API.get(`/staff/payroll?staff_id=${emp.id}&type=advance`).catch(() => ({ data: [] }))
      ]);

      const attList = attRes.data || [];
      const presentDays = attList.filter(a => a.status === 'present').length;
      const halfDays = attList.filter(a => a.status === 'half_day').length;
      const absentDays = attList.filter(a => a.status === 'absent').length;
      const payableDays = presentDays + (halfDays * 0.5);

      const d1 = new Date(startStr);
      const d2 = new Date(endStr);
      const totalDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;

      const baseSalary = Number(emp.base_salary || 0);
      const dailyRate = baseSalary / 30;
      const earnedBase = Math.round(dailyRate * payableDays);
      const leaveDeductions = Math.max(0, Math.round(baseSalary - earnedBase));

      const totalAdvances = (advRes.data || []).reduce((sum, a) => sum + Number(a.total_paid || 0), 0);
      const bonus = Number(payForm.bonus || 0);
      const netPay = Math.max(0, earnedBase + bonus - totalAdvances);

      setPayForm({
        month: new Date(startStr).getMonth() + 1,
        year: new Date(startStr).getFullYear(),
        startDate: startStr,
        endDate: endStr,
        totalDaysInPeriod: totalDays,
        presentDays,
        halfDays,
        absentDays,
        payableDays,
        baseSalary,
        dailyRate: Math.round(dailyRate),
        earnedBasePay: earnedBase,
        leaveDeductions,
        advanceDeduction: totalAdvances,
        bonus: 0,
        netPayable: netPay,
        attendanceRecords: attList,
        periodLabel: `${new Date(startStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(endStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
      });
    } catch (err) {
      console.error(err);
      toast.error("Could not calculate salary breakdown from attendance");
    }
  };

  const handleBonusChange = (bonusVal) => {
    const b = Number(bonusVal || 0);
    const net = Math.max(0, payForm.earnedBasePay + b - payForm.advanceDeduction);
    setPayForm(prev => ({
      ...prev,
      bonus: b,
      netPayable: net
    }));
  };

  const handleProcessSalary = async (e) => {
    e.preventDefault();
    if (!selectedStaff || !isOwner) return;

    try {
      const payload = {
        staff_id: selectedStaff.id,
        month: payForm.month,
        year: payForm.year,
        period_start: payForm.startDate,
        period_end: payForm.endDate,
        base_pay: payForm.baseSalary,
        present_days: payForm.presentDays,
        half_days: payForm.halfDays,
        absent_days: payForm.absentDays,
        payable_days: payForm.payableDays,
        advance_deduction: payForm.advanceDeduction,
        deductions: payForm.leaveDeductions + payForm.advanceDeduction,
        bonus: payForm.bonus,
        total_paid: payForm.netPayable,
        payment_status: 'paid',
        payment_type: 'salary',
        payment_date: new Date().toISOString(),
        attendance_snapshot: payForm.attendanceRecords,
        notes: `Salary payout for ${payForm.periodLabel}. Present: ${payForm.presentDays}d, Half: ${payForm.halfDays}d, Absent: ${payForm.absentDays}d`
      };

      await API.post('/staff/payroll', payload);

      // Record business expense
      await API.post('/expenses', {
        amount: payForm.netPayable,
        category: 'Staff Salary',
        description: `Salary paid to ${selectedStaff.name} (${payForm.periodLabel})`,
        date: new Date().toISOString()
      }).catch(() => {});

      toast.success(`Salary payout of ₹${payForm.netPayable.toLocaleString()} processed & logged!`);
      setShowPayModal(false);
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to process salary payout');
    }
  };

  const handleIssueAdvance = async (e) => {
    e.preventDefault();
    if (!selectedStaff || !isOwner) return;

    try {
      await API.post('/staff/payroll', {
        staff_id: selectedStaff.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        base_pay: 0,
        bonus: 0,
        deductions: 0,
        total_paid: Number(advanceForm.amount),
        payment_status: 'paid',
        payment_type: 'advance',
        payment_date: new Date().toISOString(),
        notes: advanceForm.notes
      });

      await API.post('/expenses', {
        amount: Number(advanceForm.amount),
        category: 'Staff Advance',
        description: `Advance given to ${selectedStaff.name}: ${advanceForm.notes || 'No notes'}`,
        date: new Date().toISOString()
      }).catch(() => {});

      toast.success('Cash advance recorded & added to expenses');
      setShowAdvanceModal(false);
      setAdvanceForm({ amount: '', notes: '' });
      fetchGlobalData();
    } catch (err) {
      toast.error('Failed to record advance');
    }
  };

  const handleOpenSalarySlip = (payoutRecord) => {
    setSelectedSlip(payoutRecord);
    setShowSalarySlipModal(true);
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
  const monthlyBudget = staff.reduce((s, a) => s + Number(a.base_salary || 0), 0);

  const storeQRValue = `${window.location.origin}/attend?biz=${currentUser.id || ''}`;

  // Tabs for Owner vs Staff
  const navigationTabs = isOwner ? [
    { id: 'team', label: '1. Team Directory', icon: Users },
    { id: 'roles', label: '2. Roles & Permissions', icon: ShieldCheck },
    { id: 'attendance', label: '3. Attendance', icon: Calendar },
    { id: 'payroll', label: '4. Salary Payouts & Slips', icon: DollarSign }
  ] : [
    { id: 'attendance', label: '1. My Attendance Log', icon: Calendar },
    { id: 'payroll', label: '2. My Payslips & Slips', icon: DollarSign }
  ];

  return (
    <div className="space-y-8 animate-fade-in-up pb-20 max-w-[1400px] mx-auto">
      {/* 🟢 Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[#0F172A] p-8 md:p-10 rounded-[36px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-brand-blue/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-[90px]" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 bg-brand-blue rounded-[26px] flex items-center justify-center text-white shadow-xl shadow-brand-blue/25 ring-4 ring-brand-blue/15">
            <Users size={38} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[30px] font-black text-white tracking-tight">
                {isOwner ? 'Staff & Payroll Hub' : 'My Work & Salary'}
              </h1>
              {currentUser.store_name && (
                <Badge variant="indigo" className="text-xs font-bold py-1 px-3 bg-white/10 text-white border-white/20">
                  <Store size={13} className="inline mr-1 text-emerald-400" /> {currentUser.store_name}
                </Badge>
              )}
            </div>
            <p className="text-slate-400 text-sm font-medium mt-1">
              {isOwner 
                ? 'Transparent salary payouts based on verified attendance, cash advances & role capabilities.'
                : 'View your recorded attendance, verify monthly work hours, and download official payslips.'}
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <Button 
              onClick={() => setShowAddModal(true)} 
              icon={<Plus size={18} />} 
              className="px-6 py-3.5 rounded-2xl font-black bg-brand-blue hover:bg-blue-600 text-white shadow-lg shadow-brand-blue/30 text-xs"
            >
              Add New Staff
            </Button>
          </div>
        )}
      </div>

      {/* 🟢 KPI Stats Overview (Owner Only) */}
      {isOwner && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="p-6 bg-white rounded-[26px] border border-slate-100 shadow-sm">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Team Size</p>
            <p className="text-[32px] font-black text-slate-900">{totalEmployees}</p>
          </div>
          <div className="p-6 bg-white rounded-[26px] border border-slate-100 shadow-sm">
            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-wider mb-1">On Duty Today</p>
            <p className="text-[32px] font-black text-emerald-600">{presentTodayCount}</p>
          </div>
          <div className="p-6 bg-white rounded-[26px] border border-slate-100 shadow-sm">
            <p className="text-[11px] font-black text-brand-blue uppercase tracking-wider mb-1">Web/POS Logins</p>
            <p className="text-[32px] font-black text-brand-blue">{loginEnabledCount}</p>
          </div>
          <div className="p-6 bg-white rounded-[26px] border border-slate-100 shadow-sm">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">Monthly Salary Budget</p>
            <p className="text-[32px] font-black text-slate-900">₹{monthlyBudget.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* 🟢 Navigation Bar */}
      <div className="flex bg-slate-100 p-1.5 rounded-[22px] w-fit shadow-inner mx-auto border border-slate-200">
        {navigationTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-[16px] text-xs font-black transition-all ${
                isActive 
                  ? 'bg-white text-slate-900 shadow-md border border-slate-200/60' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-brand-blue' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: TEAM DIRECTORY (OWNER ONLY)                   */}
      {/* ==================================================== */}
      {activeTab === 'team' && isOwner && (
        <Card noPadding className="overflow-hidden border-none shadow-xl rounded-[32px] bg-white">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/40">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, phone, email, designation..." 
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

              {(searchTerm || filterRole !== 'ALL' || filterStatus !== 'ALL') && (
                <button
                  onClick={() => { setSearchTerm(''); setFilterRole('ALL'); setFilterStatus('ALL'); }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  Reset filters
                </button>
              )}

              <Badge variant="outline" className="px-4 py-2 text-xs font-black tracking-widest uppercase text-slate-500 border-slate-200">
                Showing: {filteredEmployees.length} of {staff.length}
              </Badge>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 font-bold animate-pulse">Loading team roster...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Thead className="bg-slate-50/70 border-b border-slate-100">
                  <tr>
                    <Th className="py-5 px-6">Employee</Th>
                    <Th>Assigned Role</Th>
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

                        <Td>
                          <Badge variant="indigo" className="font-black tracking-wide text-[11px] py-1 px-3">
                            <ShieldCheck size={13} className="inline mr-1.5 text-indigo-600" />
                            {roleName}
                          </Badge>
                        </Td>

                        <Td>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Store size={14} className="text-emerald-600 shrink-0" />
                            <span>{storeName}</span>
                          </div>
                        </Td>

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
                        No team members match the search query. Click "Reset filters" to view all.
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {/* ==================================================== */}
      {/* TAB 2: ROLES & PERMISSIONS (OWNER ONLY)               */}
      {/* ==================================================== */}
      {activeTab === 'roles' && isOwner && (
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-8 rounded-[32px] text-white space-y-3">
            <div className="flex items-center gap-3">
              <Shield className="text-indigo-400" size={24} />
              <h2 className="text-lg font-black tracking-tight">What Can Each Role Do?</h2>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Control what features each employee can view and edit. When you change permissions for a role, all staff holding that role will update immediately across their store branch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map(role => {
              const helperText = ROLE_HELPERS[role.name] || role.description || 'Custom store role';
              const assignedCount = staff.filter(s => s.store_staff?.[0]?.role_id === role.id).length;

              return (
                <Card key={role.id} className="p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-slate-900">{role.name}</h3>
                      <Badge variant="indigo" className="text-[10px] font-bold">
                        {assignedCount} Assigned
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">{helperText}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Enabled Capabilities</p>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {permissions.map(perm => {
                        const enabled = isPermissionEnabled(role.id, perm.id);
                        const meta = CAPABILITY_METADATA[perm.key] || { label: perm.label, desc: '' };
                        return (
                          <div 
                            key={perm.id} 
                            onClick={() => handleToggleRolePermission(role.id, perm.id)}
                            className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
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

      {/* ==================================================== */}
      {/* TAB 3: ATTENDANCE (OWNER & STAFF)                     */}
      {/* ==================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-base font-black text-slate-900">
                {isOwner ? "Today's Store Attendance" : "My Attendance Status & History"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isOwner 
                  ? "Quickly clock-in employees or open the shop QR check-in terminal."
                  : "Clock in for today and review verified presence records for this month."}
              </p>
            </div>

            {isOwner && (
              <Button 
                variant="secondary" 
                onClick={() => setShowStoreQR(true)} 
                icon={<QrCode size={18} />} 
                className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 px-5 py-3 rounded-2xl font-black text-xs"
              >
                Shop Check-In QR Code
              </Button>
            )}
          </div>

          <Card noPadding className="overflow-hidden border-none shadow-xl rounded-[32px] bg-white">
            <Table>
              <Thead className="bg-slate-50/70 border-b border-slate-100">
                <tr>
                  <Th className="py-5 px-6">Employee</Th>
                  <Th>Worker PIN</Th>
                  <Th>Today's Status</Th>
                  <Th className="text-right px-6">Clock-In Action</Th>
                </tr>
              </Thead>
              <Tbody className="divide-y divide-slate-100">
                {staff.map(emp => {
                  const todayRecord = attendance.find(a => a.staff_id === emp.id);
                  const status = todayRecord?.status;

                  return (
                    <Tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <Td className="py-4 px-6">
                        <p className="font-black text-sm text-slate-900">{emp.name}</p>
                        <p className="text-[11px] text-slate-500">{emp.position}</p>
                      </Td>

                      <Td>
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
                          PIN: {emp.qr_token || '123456'}
                        </span>
                      </Td>

                      <Td>
                        {status === 'present' && (
                          <Badge variant="success" className="text-xs font-black uppercase tracking-wider py-1 px-3">
                            <Check size={13} className="inline mr-1" /> Present
                          </Badge>
                        )}
                        {status === 'half_day' && (
                          <Badge variant="warning" className="text-xs font-black uppercase tracking-wider py-1 px-3">
                            Half Day
                          </Badge>
                        )}
                        {status === 'absent' && (
                          <Badge variant="danger" className="text-xs font-black uppercase tracking-wider py-1 px-3">
                            Absent
                          </Badge>
                        )}
                        {!status && (
                          <Badge variant="gray" className="text-xs font-black uppercase tracking-wider py-1 px-3">
                            Not Marked
                          </Badge>
                        )}
                      </Td>

                      <Td className="text-right px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleMarkAttendance(emp.id, 'present')}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all"
                          >
                            ✓ Clock In (Present)
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(emp.id, 'half_day')}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl transition-all"
                          >
                            ½ Half Day
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Card>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: SALARY PAYOUTS & SLIPS                         */}
      {/* ==================================================== */}
      {activeTab === 'payroll' && (
        <div className="space-y-8">
          {isOwner && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
              <div>
                <h2 className="text-base font-black text-slate-900">Salary Calculation & Payouts</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review attendance days, deduct cash advances, and generate frozen salary slips.
                </p>
              </div>

              <Button 
                onClick={() => setShowAdvanceModal(true)} 
                icon={<Wallet size={18} />} 
                className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-md shadow-amber-500/20"
              >
                Give Advance Cash
              </Button>
            </div>
          )}

          {/* Pending Payouts Table (Owner Only) */}
          {isOwner && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Pending Monthly Payouts</h3>
              <Card noPadding className="overflow-hidden border-none shadow-xl rounded-[32px] bg-white">
                <Table>
                  <Thead className="bg-slate-50/70 border-b border-slate-100">
                    <tr>
                      <Th className="py-5 px-6">Employee</Th>
                      <Th>Salary Structure</Th>
                      <Th>Base Salary</Th>
                      <Th className="text-right px-6">Review & Payout</Th>
                    </tr>
                  </Thead>
                  <Tbody className="divide-y divide-slate-100">
                    {staff.map(emp => (
                      <Tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                        <Td className="py-4 px-6">
                          <p className="font-black text-sm text-slate-900">{emp.name}</p>
                          <p className="text-[11px] text-slate-500">{emp.position}</p>
                        </Td>

                        <Td>
                          <Badge variant="outline" className="text-xs font-bold capitalize">
                            {emp.salary_type || 'Fixed Monthly'}
                          </Badge>
                        </Td>

                        <Td>
                          <span className="text-sm font-black text-slate-900">₹{Number(emp.base_salary || 0).toLocaleString()}</span>
                        </Td>

                        <Td className="text-right px-6">
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayModal(emp)}
                            icon={<Calculator size={14} />}
                            className="bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm"
                          >
                            Review & Pay Salary
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Card>
            </div>
          )}

          {/* Payout History & Slips */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              {isOwner ? 'Completed Payout History & Salary Slips' : 'My Official Salary Slips'}
            </h3>
            <Card noPadding className="overflow-hidden border-none shadow-xl rounded-[32px] bg-white">
              <Table>
                <Thead className="bg-slate-50/70 border-b border-slate-100">
                  <tr>
                    <Th className="py-4 px-6">Payout Date</Th>
                    <Th>Employee</Th>
                    <Th>Period</Th>
                    <Th>Payable Days</Th>
                    <Th>Advance / Deductions</Th>
                    <Th>Net Paid</Th>
                    <Th className="text-right px-6">Salary Slip</Th>
                  </tr>
                </Thead>
                <Tbody className="divide-y divide-slate-100">
                  {payroll.map(p => (
                    <Tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <Td className="py-4 px-6 text-xs text-slate-600 font-bold">
                        {new Date(p.created_at || p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Td>
                      <Td className="text-sm font-black text-slate-900">
                        {p.staff?.name || 'Staff Member'}
                      </Td>
                      <Td className="text-xs text-slate-500 font-medium">
                        {p.period_start ? `${new Date(p.period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(p.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : `Month ${p.month}/${p.year}`}
                      </Td>
                      <Td>
                        {p.payable_days ? (
                          <span className="text-xs font-bold text-slate-700">{p.payable_days} Days</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </Td>
                      <Td className="text-xs text-rose-600 font-bold">
                        {p.deductions > 0 ? `-₹${Number(p.deductions).toLocaleString()}` : '₹0'}
                      </Td>
                      <Td className="text-sm font-black text-emerald-600">
                        ₹{Number(p.total_paid || 0).toLocaleString()}
                      </Td>
                      <Td className="text-right px-6">
                        {p.payment_type !== 'advance' && (
                          <button
                            onClick={() => handleOpenSalarySlip(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all"
                          >
                            <FileText size={14} /> View Slip
                          </button>
                        )}
                      </Td>
                    </Tr>
                  ))}

                  {payroll.length === 0 && (
                    <Tr>
                      <Td colSpan={7} className="text-center py-10 text-slate-400 font-bold">
                        No past salary payout records found.
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 🟢 PAY SALARY REVIEW MODAL (WITH ATTENDANCE DETAILS) */}
      {/* ==================================================== */}
      {showPayModal && selectedStaff && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-xl w-full space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Calculator size={22} className="text-brand-blue" /> Salary Payout Review
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Paying <strong>{selectedStaff.name}</strong> ({selectedStaff.position}) for <strong>{payForm.periodLabel}</strong>
                </p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-2 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProcessSalary} className="space-y-5">
              {/* Period Date Selectors */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Period Start</label>
                  <input
                    type="date"
                    value={payForm.startDate}
                    onChange={(e) => {
                      setPayForm(p => ({ ...p, startDate: e.target.value }));
                      calculateSalaryBreakdownForPeriod(selectedStaff, e.target.value, payForm.endDate);
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Period End</label>
                  <input
                    type="date"
                    value={payForm.endDate}
                    onChange={(e) => {
                      setPayForm(p => ({ ...p, endDate: e.target.value }));
                      calculateSalaryBreakdownForPeriod(selectedStaff, payForm.startDate, e.target.value);
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* 1. Attendance Summary Card */}
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">Attendance Breakdown</span>
                  <button
                    type="button"
                    onClick={() => setShowAttendanceDetailView(!showAttendanceDetailView)}
                    className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1"
                  >
                    {showAttendanceDetailView ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showAttendanceDetailView ? 'Hide Day-by-Day List' : 'View Attendance Details'}
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-white rounded-xl shadow-xs border border-indigo-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Present</p>
                    <p className="text-base font-black text-emerald-600">{payForm.presentDays} d</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl shadow-xs border border-indigo-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Half Day</p>
                    <p className="text-base font-black text-amber-600">{payForm.halfDays} d</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl shadow-xs border border-indigo-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Absent</p>
                    <p className="text-base font-black text-rose-600">{payForm.absentDays} d</p>
                  </div>
                  <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-sm">
                    <p className="text-[10px] font-bold text-indigo-200 uppercase">Payable</p>
                    <p className="text-base font-black">{payForm.payableDays} d</p>
                  </div>
                </div>

                {showAttendanceDetailView && (
                  <div className="mt-3 max-h-[160px] overflow-y-auto bg-white rounded-xl p-3 border border-indigo-100 space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Daily Log for Selected Period</p>
                    {payForm.attendanceRecords.length > 0 ? (
                      payForm.attendanceRecords.map(a => (
                        <div key={a.id || a.date} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-50">
                          <span className="font-bold text-slate-700">{new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          <span className={`font-black uppercase text-[10px] ${
                            a.status === 'present' ? 'text-emerald-600' : a.status === 'half_day' ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2 text-center">No daily records clocked in this period.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Salary Calculation Card */}
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5 border border-slate-200">
                <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Salary Calculation</p>
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Base Salary (30 days standard):</span>
                  <span>₹{Number(payForm.baseSalary).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Earned Pay ({payForm.payableDays} payable days @ ₹{payForm.dailyRate}/day):</span>
                  <span className="text-slate-900 font-black">₹{payForm.earnedBasePay.toLocaleString()}</span>
                </div>
                {payForm.leaveDeductions > 0 && (
                  <div className="flex justify-between text-xs font-bold text-rose-600">
                    <span>Absence Deductions:</span>
                    <span>-₹{payForm.leaveDeductions.toLocaleString()}</span>
                  </div>
                )}
                {payForm.advanceDeduction > 0 && (
                  <div className="flex justify-between text-xs font-bold text-amber-600">
                    <span>Cash Advance Recovery:</span>
                    <span>-₹{payForm.advanceDeduction.toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
                  <label className="text-xs font-bold text-slate-700">Add Bonus / Incentive (₹):</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={payForm.bonus || ''}
                    onChange={(e) => handleBonusChange(e.target.value)}
                    className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none text-right"
                  />
                </div>

                <div className="flex justify-between items-center text-base font-black text-emerald-600 pt-3 border-t border-slate-200">
                  <span>Final Net Payable:</span>
                  <span className="text-xl">₹{payForm.netPayable.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowPayModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20">
                  Confirm Payout & Generate Slip
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 🟢 VIEW SALARY SLIP MODAL                             */}
      {/* ==================================================== */}
      {showSalarySlipModal && selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-lg w-full space-y-6 shadow-2xl my-8 border border-slate-100">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Official Salary Slip
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{currentUser.business_name || 'Karobar Store'}</h3>
                <p className="text-xs text-slate-500">{currentUser.store_name || 'Main Branch'}</p>
              </div>
              <button onClick={() => setShowSalarySlipModal(false)} className="p-2 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            {/* Employee & Period Details */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Employee</p>
                <p className="font-black text-slate-900">{selectedSlip.staff?.name}</p>
                <p className="text-slate-500">{selectedSlip.staff?.position || 'Staff'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Salary Period</p>
                <p className="font-black text-slate-900">
                  {selectedSlip.period_start ? `${new Date(selectedSlip.period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(selectedSlip.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : `Month ${selectedSlip.month}/${selectedSlip.year}`}
                </p>
                <p className="text-slate-500">Paid on {new Date(selectedSlip.created_at || selectedSlip.payment_date).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Attendance Snapshot */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Attendance Breakdown</p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                <div>
                  <span className="text-slate-400 block text-[10px]">Present</span>
                  <span className="text-emerald-600 font-black">{selectedSlip.present_days || 0} d</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Half Day</span>
                  <span className="text-amber-600 font-black">{selectedSlip.half_days || 0} d</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Absent</span>
                  <span className="text-rose-600 font-black">{selectedSlip.absent_days || 0} d</span>
                </div>
                <div>
                  <span className="text-indigo-600 block text-[10px]">Payable</span>
                  <span className="text-indigo-900 font-black">{selectedSlip.payable_days || 0} d</span>
                </div>
              </div>
            </div>

            {/* Earnings & Deductions */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-bold">
                <span>Base Salary:</span>
                <span>₹{Number(selectedSlip.base_pay || 0).toLocaleString()}</span>
              </div>
              {selectedSlip.bonus > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Bonus / Incentive:</span>
                  <span>+₹{Number(selectedSlip.bonus).toLocaleString()}</span>
                </div>
              )}
              {selectedSlip.advance_deduction > 0 && (
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>Advance Cash Deducted:</span>
                  <span>-₹{Number(selectedSlip.advance_deduction).toLocaleString()}</span>
                </div>
              )}
              {selectedSlip.deductions > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Total Deductions:</span>
                  <span>-₹{Number(selectedSlip.deductions).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-emerald-600 pt-3 border-t border-slate-200">
                <span>Net Amount Paid:</span>
                <span className="text-xl">₹{Number(selectedSlip.total_paid || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Slip Footer Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setShowSalarySlipModal(false)}>Close</Button>
              <Button 
                onClick={() => window.print()}
                icon={<Printer size={16} />}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl"
              >
                Print Slip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 UNIFIED ADD STAFF MODAL (OWNER ONLY) */}
      {showAddModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-xl p-8 space-y-6 my-8 animate-fade-in-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Users size={22} className="text-brand-blue" /> Add Staff Member
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Create an employee profile, configure login credentials & assign branch role.
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
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Assigned Role *</label>
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

                {addForm.role_id && (
                  <p className="text-[11px] text-indigo-700 bg-indigo-50/70 p-2.5 rounded-xl font-medium">
                    💡 {ROLE_HELPERS[roles.find(r => r.id === addForm.role_id)?.name] || 'Custom operational access.'}
                  </p>
                )}
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

      {/* 🟢 EDIT STAFF MODAL */}
      {showEditModal && selectedStaff && isOwner && (
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
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Assigned Role</label>
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

      {/* 🟢 STORE CHECK-IN QR CODE MODAL */}
      {showStoreQR && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">Shop Check-In QR</h3>
              <button onClick={() => setShowStoreQR(false)} className="p-2 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl flex justify-center border border-slate-100">
              <QRCodeSVG value={storeQRValue} size={200} level="H" />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Staff scan this code at the shop counter with their phone to clock in/out with their Worker PIN.
            </p>
          </div>
        </div>
      )}

      {/* 🟢 CASH ADVANCE MODAL */}
      {showAdvanceModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">Give Advance Cash</h3>
              <button onClick={() => setShowAdvanceModal(false)} className="p-2 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleIssueAdvance} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Select Employee *</label>
                <select
                  required
                  onChange={(e) => setSelectedStaff(staff.find(s => s.id === e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                >
                  <option value="">-- Choose Employee --</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.position})</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Advance Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency advance"
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdvanceModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-black px-5 py-2.5 rounded-xl">
                  Issue Advance
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
