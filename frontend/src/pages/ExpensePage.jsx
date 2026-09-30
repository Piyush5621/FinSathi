import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import API from '../services/apiClient';
import { useStore } from '../contexts/StoreContext';
import { 
  useExpenses, 
  useCashbook, 
  useSuppliers, 
  useAddExpense, 
  useUpdateExpense, 
  useDeleteExpense, 
  useAddCashAdjustment, 
  useAddSupplier 
} from "../hooks/useExpenses";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { 
  TrendingDown, TrendingUp, Plus, FileText, PieChart as PieIcon, 
  Users, DollarSign, AlertCircle, Edit2, 
  Search, Trash2, Download, Calendar, Store, 
  Landmark, Wallet, ArrowDownRight, ArrowUpRight, 
  X, ChevronLeft, ChevronRight, Lock, CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const CATEGORY_COLORS = {
  "Inventory": "#6366F1",
  "Purchases": "#4F46E5",
  "Rent": "#EC4899",
  "Salary": "#10B981",
  "Electricity": "#F59E0B",
  "Utilities": "#F59E0B",
  "Marketing": "#8B5CF6",
  "Transport": "#06B6D4",
  "Maintenance": "#3B82F6",
  "Office": "#64748B",
  "Misc": "#94A3B8"
};

const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash Drawer" },
  { value: "UPI", label: "UPI / QR" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Card", label: "Card" },
  { value: "Cheque", label: "Cheque" }
];

const CATEGORIES = [
  "Rent", "Salary", "Inventory", "Electricity", "Utilities", 
  "Transport", "Marketing", "Office", "Maintenance", "Misc"
];

export default function ExpensePage() {
  const queryClient = useQueryClient();
  const { activeStore } = useStore();

  // Navigation & Period
  const [activeTab, setActiveTab] = useState('cashbook'); // 'cashbook' | 'expenses' | 'analytics'
  const [selectedPeriod, setSelectedPeriod] = useState('30d'); // 'today' | 'yesterday' | '7d' | '30d' | '3m' | '12m' | 'all'

  // Server Pagination & Filter States
  const [expensePage, setExpensePage] = useState(1);
  const [expenseLimit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedExpenseMethod, setSelectedExpenseMethod] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc'); // Client sorting on current page

  // Cashbook Filters & Pagination
  const [cashbookPage, setCashbookPage] = useState(1);
  const [cashbookLimit] = useState(25);
  const [cashbookType, setCashbookType] = useState('all');
  const [cashbookMethod, setCashbookMethod] = useState('all');
  const [cashbookDirection, setCashbookDirection] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCashAdjustModal, setShowCashAdjustModal] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  // Forms
  const [form, setForm] = useState({ 
    amount: "", 
    category: "Misc", 
    payment_method: "Cash", 
    supplier_id: "", 
    description: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [editForm, setEditForm] = useState({ 
    id: "", 
    amount: "", 
    category: "Misc", 
    payment_method: "Cash", 
    description: "",
    date: "",
    is_system_generated: false
  });
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "" });
  const [cashAdjustForm, setCashAdjustForm] = useState({
    type: "deposit", // 'deposit' | 'withdrawal'
    amount: "",
    reason: "Owner Capital Injection",
    notes: ""
  });

  // Calculate Date Range Strings (YYYY-MM-DD) for Canonical Backend
  const dateRange = useMemo(() => {
    if (selectedPeriod === 'all') return { startDate: null, endDate: null };
    const now = new Date();
    const endStr = now.toISOString().split('T')[0];

    if (selectedPeriod === 'today') {
      return { startDate: endStr, endDate: endStr };
    }
    if (selectedPeriod === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      return { startDate: yStr, endDate: yStr };
    }
    if (selectedPeriod === '7d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { startDate: d.toISOString().split('T')[0], endDate: endStr };
    }
    if (selectedPeriod === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { startDate: d.toISOString().split('T')[0], endDate: endStr };
    }
    if (selectedPeriod === '3m') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return { startDate: d.toISOString().split('T')[0], endDate: endStr };
    }
    if (selectedPeriod === '12m') {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return { startDate: d.toISOString().split('T')[0], endDate: endStr };
    }
    return { startDate: null, endDate: null };
  }, [selectedPeriod]);

  // Query 1: Canonical Cashbook Stream & Summaries
  const cashbookParams = useMemo(() => ({
    page: cashbookPage,
    limit: cashbookLimit,
    storeId: activeStore?.id || undefined,
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
    paymentMethod: cashbookMethod !== 'all' ? cashbookMethod : undefined,
    transactionType: cashbookType !== 'all' ? cashbookType : undefined,
    direction: cashbookDirection !== 'all' ? cashbookDirection : undefined
  }), [cashbookPage, cashbookLimit, activeStore?.id, dateRange, cashbookMethod, cashbookType, cashbookDirection]);

  const { 
    data: cashbookData, 
    isLoading: loadingCashbook, 
    isError: errorCashbook, 
    error: cashbookErrorObj 
  } = useCashbook(cashbookParams);

  // Query 2: Canonical Expenses List (Paginated)
  const expenseParams = useMemo(() => ({
    page: expensePage,
    limit: expenseLimit,
    search: searchQuery.trim() || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    paymentMethod: selectedExpenseMethod !== 'all' ? selectedExpenseMethod : undefined,
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
    storeId: activeStore?.id || undefined,
    paginate: true
  }), [expensePage, expenseLimit, searchQuery, selectedCategory, selectedExpenseMethod, dateRange, activeStore?.id]);

  const { 
    data: expenseResult, 
    isLoading: loadingExpenses, 
    isError: errorExpenses, 
    error: expenseErrorObj 
  } = useExpenses(expenseParams);

  const expenses = expenseResult?.items || [];
  const totalExpensesCount = expenseResult?.total || 0;
  const totalExpensePages = expenseResult?.totalPages || 1;

  // Query 3: Suppliers for Dropdown
  const { data: suppliers = [] } = useSuppliers();

  // Mutations
  const { mutateAsync: addExpense, isPending: addingExpense } = useAddExpense();
  const { mutateAsync: updateExpense, isPending: updatingExpense } = useUpdateExpense();
  const { mutateAsync: deleteExpense, isPending: deletingExpense } = useDeleteExpense();
  const { mutateAsync: addCashAdjustment, isPending: addingAdjustment } = useAddCashAdjustment();
  const { mutateAsync: addSupplier, isPending: addingSupplier } = useAddSupplier();

  // Authoritative Financial Summary from Backend
  const summary = cashbookData?.summary || {
    totalInflow: 0,
    totalOutflow: 0,
    netMovement: 0,
    accounts: { cashDrawer: 0, upiDigital: 0, bankCard: 0 },
    entryCounts: { sales: 0, customerPayments: 0, expenses: 0, supplierPayments: 0, adjustments: 0 }
  };

  const cashbookMovements = cashbookData?.movements || [];
  const cashbookPagination = cashbookData?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 };

  // Sort Current Expenses Page
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0);
      if (sortBy === 'date_asc') return new Date(a.date || a.created_at || 0) - new Date(b.date || b.created_at || 0);
      if (sortBy === 'amount_desc') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortBy === 'amount_asc') return Number(a.amount || 0) - Number(b.amount || 0);
      return 0;
    });
  }, [expenses, sortBy]);

  // Actual Expense Category Distribution for Analytics
  const categoryData = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const cat = e.category || "Misc";
      map[cat] = (map[cat] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || "#94A3B8"
    }));
  }, [expenses]);

  const totalPageExpenseSum = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  // Handlers
  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return toast.error("Please enter a valid expense amount greater than 0");
    }

    try {
      await addExpense({
        amount: amt,
        category: form.category || "Misc",
        payment_method: form.payment_method || "Cash",
        supplier_id: form.supplier_id || null,
        description: form.description ? form.description.trim() : form.category,
        date: form.date || new Date().toISOString().split('T')[0],
        store_id: activeStore?.id || null
      });

      toast.success("Expense recorded successfully! 💸");
      setShowAddModal(false);
      setForm({ 
        amount: "", 
        category: "Misc", 
        payment_method: "Cash", 
        supplier_id: "", 
        description: "", 
        date: new Date().toISOString().split('T')[0] 
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to record expense";
      toast.error(msg);
    }
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    const amt = Number(editForm.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return toast.error("Please enter a valid expense amount greater than 0");
    }

    try {
      await updateExpense({
        id: editForm.id,
        amount: amt,
        category: editForm.category,
        payment_method: editForm.payment_method,
        description: editForm.description ? editForm.description.trim() : "",
        date: editForm.date || undefined
      });
      toast.success("Expense updated successfully!");
      setShowEditModal(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to update expense";
      toast.error(msg);
    }
  };

  const handleDeleteExpense = async (exp) => {
    if (exp.is_system_generated || exp.category === 'Purchases') {
      return toast.error("System-generated purchase expenses cannot be deleted directly.");
    }
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;

    try {
      await deleteExpense(exp.id);
      toast.success("Expense deleted successfully");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to delete expense";
      toast.error(msg);
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return toast.error("Supplier name is required");
    try {
      const newSupplier = await addSupplier({
        name: supplierForm.name.trim(),
        phone: supplierForm.phone ? supplierForm.phone.trim() : null,
        store_id: activeStore?.id || null
      });
      toast.success("Supplier added successfully!");
      setSupplierForm({ name: "", phone: "" });
      setShowSupplierModal(false);
      if (newSupplier?.id) {
        setForm(p => ({ ...p, supplier_id: newSupplier.id }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to add supplier";
      toast.error(msg);
    }
  };

  const handleCashAdjustment = async (e) => {
    e.preventDefault();
    const amt = Number(cashAdjustForm.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return toast.error("Please enter a valid adjustment amount greater than zero");
    }

    try {
      await addCashAdjustment({
        type: cashAdjustForm.type, // 'deposit' | 'withdrawal'
        amount: amt,
        reason: cashAdjustForm.reason,
        notes: cashAdjustForm.notes ? cashAdjustForm.notes.trim() : null,
        store_id: activeStore?.id || null,
        payment_method: 'Cash'
      });

      toast.success(`Cash drawer ${cashAdjustForm.type === 'deposit' ? 'deposit' : 'withdrawal'} of ₹${amt.toLocaleString('en-IN')} recorded! 💵`);
      setShowCashAdjustModal(false);
      setCashAdjustForm({ type: "deposit", amount: "", reason: "Owner Capital Injection", notes: "" });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to log cash adjustment";
      toast.error(msg);
    }
  };

  // Full Canonical CSV Export (fetches all filtered rows without pagination ceiling)
  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const exportParams = {
        search: searchQuery.trim() || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        paymentMethod: selectedExpenseMethod !== 'all' ? selectedExpenseMethod : undefined,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        storeId: activeStore?.id || undefined,
        paginate: false
      };

      const res = await API.get('/expenses', { params: exportParams });
      const records = Array.isArray(res.data) ? res.data : (res.data?.items || []);

      if (records.length === 0) {
        toast.error("No expenses found matching current filter for export");
        return;
      }

      const headers = ["Date", "Description", "Category", "Payment Method", "Amount (₹)", "Vendor / Payee", "Type"];
      const rows = records.map(e => [
        `"${new Date(e.date || e.created_at).toLocaleDateString('en-IN')}"`,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        `"${e.category || 'Misc'}"`,
        `"${e.payment_method || 'Cash'}"`,
        Number(e.amount || 0),
        `"${e.suppliers?.name || 'N/A'}"`,
        `"${e.is_system_generated ? 'System-Generated (PO)' : 'Manual'}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `karobar_expenses_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${records.length} canonical expense vouchers to CSV!`);
    } catch (err) {
      toast.error("Failed to generate CSV export");
    } finally {
      setExportingCSV(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-24 max-w-[1600px] mx-auto px-2 sm:px-4">
      
      {/* 1. OPERATIONAL FINANCIAL HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black border border-primary/20 shrink-0">
            <TrendingDown size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-app-text tracking-tight">Expenses & Cashbook</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                <Store size={10} /> {activeStore?.name || "All Stores"}
              </span>
            </div>
            <p className="text-xs text-app-muted mt-0.5">
              Authoritative operating expenditure, cash drawer positions, and live cashflow movement ledger.
            </p>
          </div>
        </div>

        {/* Header Action Cluster & Period Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-app-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs">
            <Calendar size={13} className="text-app-muted" />
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setExpensePage(1);
                setCashbookPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-app-text outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="3m">Last 3 Months</option>
              <option value="12m">Last 12 Months</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exportingCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border bg-app-surface hover:bg-app-hover text-app-text text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Export Canonical Expense Register to CSV"
          >
            <Download size={13} />
            <span>{exportingCSV ? "Exporting..." : "Export"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCashAdjustModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border bg-app-surface hover:bg-app-hover text-app-text text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Adjust Cash Drawer Float"
          >
            <Wallet size={13} />
            <span>Cash Float</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSupplierModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border bg-app-surface hover:bg-app-hover text-app-text text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Quick Add Vendor"
          >
            <Users size={13} />
            <span>Add Vendor</span>
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            icon={<Plus size={15} />}
            className="text-xs font-bold shadow-2xs"
          >
            Record Expense
          </Button>
        </div>
      </div>

      {/* 2. UNIFIED 3-PILLAR FINANCIAL SNAPSHOT (Authoritative from Backend Cashbook) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Pillar 1: Total Money Inflow */}
        <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">Total Money Inflow</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              ₹{Number(summary.totalInflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-app-muted mt-1 font-medium">
              Sales receipts ({summary.entryCounts?.sales || 0}) + Khata repayments ({summary.entryCounts?.customerPayments || 0})
            </div>
          </div>
        </div>

        {/* Pillar 2: Total Money Outflow */}
        <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">Total Money Outflow</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown size={15} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">
              ₹{Number(summary.totalOutflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-app-muted mt-1 font-medium">
              Operating expenses ({summary.entryCounts?.expenses || 0}) + Supplier payouts ({summary.entryCounts?.supplierPayments || 0})
            </div>
          </div>
        </div>

        {/* Pillar 3: Net Cash Movement */}
        <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">Net Cash Movement</span>
            <Badge variant={summary.netMovement >= 0 ? "success" : "danger"} className="text-[10px] font-bold">
              {summary.netMovement >= 0 ? "Positive Flow" : "Negative Outflow"}
            </Badge>
          </div>
          <div>
            <div className={`text-2xl font-black font-mono tracking-tight ${summary.netMovement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {summary.netMovement >= 0 
                ? `+₹${Number(summary.netMovement || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : `-₹${Math.abs(Number(summary.netMovement || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
            </div>
            <div className="text-[11px] text-app-muted mt-1 font-medium">
              Inflow − Outflow net balance
            </div>
          </div>
        </div>
      </div>

      {/* 3. LIQUID MONEY POSITION (Cash vs UPI vs Bank Accounts) */}
      <div className="px-4 py-3 bg-app-surface border border-app-border rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark size={15} className="text-primary" />
          <span className="text-xs font-bold text-app-text">Liquid Drawer Positions:</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">💵</span>
            <span className="text-app-muted text-[11px]">Cash Drawer:</span>
            <span className={`font-mono font-bold ${summary.accounts?.cashDrawer < 0 ? 'text-rose-600' : 'text-app-text'}`}>
              ₹{Number(summary.accounts?.cashDrawer || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <span className="text-app-border hidden sm:inline">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">⚡</span>
            <span className="text-app-muted text-[11px]">UPI / QR:</span>
            <span className="font-mono font-bold text-app-text">
              ₹{Number(summary.accounts?.upiDigital || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <span className="text-app-border hidden sm:inline">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">🏦</span>
            <span className="text-app-muted text-[11px]">Bank / Card:</span>
            <span className="font-mono font-bold text-app-text">
              ₹{Number(summary.accounts?.bankCard || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 4. WORKSPACE TABS */}
      <div className="flex gap-4 border-b border-app-border pb-px overflow-x-auto no-scrollbar">
        {[
          { id: 'cashbook', label: 'All Cash Movements (Cashbook)', icon: <DollarSign size={14} />, count: cashbookPagination.total },
          { id: 'expenses', label: 'Expense Vouchers Log', icon: <FileText size={14} />, count: totalExpensesCount },
          { id: 'analytics', label: 'Category Analytics', icon: <PieIcon size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-app-muted hover:text-app-text'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-app-subtle text-app-muted'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 5. TAB CONTENT WORKSPACE */}
      {activeTab === 'cashbook' ? (
        /* TAB 1: UNIFIED CASHBOOK LEDGER (SERVER-SIDE) */
        <div className="space-y-3">
          {/* Cashbook Filters Bar */}
          <div className="p-3 bg-app-surface border border-app-border rounded-2xl shadow-2xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Transaction Type Filter */}
                <div className="flex items-center gap-1">
                  <span className="text-app-muted text-[11px] font-semibold">Type:</span>
                  <select
                    value={cashbookType}
                    onChange={(e) => {
                      setCashbookType(e.target.value);
                      setCashbookPage(1);
                    }}
                    className="bg-app-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs font-semibold text-app-text outline-none cursor-pointer"
                  >
                    <option value="all">All Movements</option>
                    <option value="sale">Sales Receipts</option>
                    <option value="payment">Khata Repayments</option>
                    <option value="expense">Operating Expenses</option>
                    <option value="supplier_payment">Supplier Payouts</option>
                    <option value="adjustment">Cash Adjustments</option>
                  </select>
                </div>

                {/* Direction Filter */}
                <div className="flex items-center gap-1">
                  <span className="text-app-muted text-[11px] font-semibold">Flow:</span>
                  <select
                    value={cashbookDirection}
                    onChange={(e) => {
                      setCashbookDirection(e.target.value);
                      setCashbookPage(1);
                    }}
                    className="bg-app-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs font-semibold text-app-text outline-none cursor-pointer"
                  >
                    <option value="all">All In/Out</option>
                    <option value="inflow">Inflow (+)</option>
                    <option value="outflow">Outflow (-)</option>
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div className="flex items-center gap-1">
                  <span className="text-app-muted text-[11px] font-semibold">Method:</span>
                  <select
                    value={cashbookMethod}
                    onChange={(e) => {
                      setCashbookMethod(e.target.value);
                      setCashbookPage(1);
                    }}
                    className="bg-app-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs font-semibold text-app-text outline-none cursor-pointer"
                  >
                    <option value="all">All Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-app-muted font-mono font-medium">
                Page {cashbookPagination.page} of {cashbookPagination.totalPages} ({cashbookPagination.total} total)
              </div>
            </div>
          </div>

          {/* Cashbook Movements Table / List */}
          <div className="border border-app-border rounded-2xl bg-app-surface overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-subtle/30">
              <div>
                <h3 className="font-bold text-xs text-app-text">Chronological Inflow & Outflow Stream</h3>
                <p className="text-[11px] text-app-muted">Authoritative ledger combining sales, repayments, expenses, supplier payouts, and cash floats</p>
              </div>
              <span className="text-xs font-mono font-bold text-app-muted">
                Showing {cashbookMovements.length} on this page
              </span>
            </div>

            {loadingCashbook ? (
              <div className="p-12 text-center space-y-3">
                <div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-xs font-medium text-app-muted">Loading canonical cashbook movements...</p>
              </div>
            ) : errorCashbook ? (
              <div className="p-12 text-center text-xs text-rose-500 space-y-2">
                <AlertCircle className="mx-auto" size={24} />
                <p className="font-bold">Failed to load Cashbook</p>
                <p className="text-app-muted text-[11px]">
                  {cashbookErrorObj?.response?.data?.message || cashbookErrorObj?.message || "Please check your network and authorization."}
                </p>
              </div>
            ) : cashbookMovements.length === 0 ? (
              <div className="p-12 text-center text-app-muted text-xs">
                No cash transactions found for the selected period and filters.
              </div>
            ) : (
              <div className="divide-y divide-app-border/40">
                {cashbookMovements.map((tx) => (
                  <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-app-hover/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                        tx.direction === 'inflow' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {tx.direction === 'inflow' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-app-text text-xs">{tx.description || tx.source}</p>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider bg-app-subtle text-app-muted">
                            {tx.source}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-app-muted">
                          {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {tx.payment_method} • {tx.category || tx.source}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono font-black shrink-0">
                      <span className={tx.direction === 'inflow' ? 'text-emerald-600 dark:text-emerald-400 text-sm' : 'text-rose-600 dark:text-rose-400 text-sm'}>
                        {tx.direction === 'inflow' ? `+₹${Number(tx.amount || 0).toLocaleString('en-IN')}` : `-₹${Number(tx.amount || 0).toLocaleString('en-IN')}`}
                      </span>
                      <span className="text-[9px] text-app-muted block uppercase tracking-wider font-sans font-bold">
                        {tx.direction === 'inflow' ? 'Inflow' : 'Outflow'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cashbook Pagination Footer */}
            {cashbookPagination.totalPages > 1 && (
              <div className="p-3 bg-app-subtle/30 border-t border-app-border flex items-center justify-between text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cashbookPage <= 1 || loadingCashbook}
                  onClick={() => setCashbookPage(p => Math.max(1, p - 1))}
                  icon={<ChevronLeft size={14} />}
                >
                  Previous
                </Button>
                <span className="text-app-muted font-medium font-mono text-[11px]">
                  Page {cashbookPagination.page} of {cashbookPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cashbookPage >= cashbookPagination.totalPages || loadingCashbook}
                  onClick={() => setCashbookPage(p => p + 1)}
                  icon={<ChevronRight size={14} />}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'expenses' ? (
        /* TAB 2: EXPENSES LOG TABLE WITH SERVER SEARCH & CATEGORIES */
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="p-3 bg-app-surface border border-app-border rounded-2xl shadow-2xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-app-muted" size={14} />
                <input
                  type="text"
                  placeholder="Search description, category, or vendor..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setExpensePage(1);
                  }}
                  className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-app-subtle border border-app-border text-xs text-app-text placeholder:text-app-muted outline-none focus:border-primary/50"
                />
              </div>

              {/* Payment Method & Sort Selector */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-app-muted text-[11px] font-semibold">Payment:</span>
                  <select
                    value={selectedExpenseMethod}
                    onChange={(e) => {
                      setSelectedExpenseMethod(e.target.value);
                      setExpensePage(1);
                    }}
                    className="bg-app-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs font-semibold text-app-text outline-none cursor-pointer"
                  >
                    <option value="all">All Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-app-muted text-[11px] font-semibold">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-app-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs font-semibold text-app-text outline-none cursor-pointer"
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="amount_desc">Highest Amount</option>
                    <option value="amount_asc">Lowest Amount</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-app-border">
              {['all', ...CATEGORIES, 'Purchases'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setExpensePage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-app-subtle text-app-muted hover:text-app-text'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="border border-app-border rounded-2xl bg-app-surface overflow-hidden shadow-2xs">
            {loadingExpenses ? (
              <div className="p-12 text-center space-y-3">
                <div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-xs font-medium text-app-muted">Loading expense vouchers...</p>
              </div>
            ) : errorExpenses ? (
              <div className="p-12 text-center text-xs text-rose-500 space-y-2">
                <AlertCircle className="mx-auto" size={24} />
                <p className="font-bold">Failed to load expenses</p>
                <p className="text-app-muted text-[11px]">
                  {expenseErrorObj?.response?.data?.message || expenseErrorObj?.message || "Please check your network and authorization."}
                </p>
              </div>
            ) : sortedExpenses.length === 0 ? (
              <div className="p-12 text-center text-app-muted text-xs">
                No expense vouchers match your search or filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-app-subtle/50 border-b border-app-border text-[10px] font-bold uppercase text-app-muted">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Vendor / Payee</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border/40">
                    {sortedExpenses.map(exp => {
                      const isProtected = exp.is_system_generated || exp.category === 'Purchases';
                      return (
                        <tr key={exp.id} className="hover:bg-app-hover/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-app-muted whitespace-nowrap">
                            {new Date(exp.date || exp.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 font-bold text-app-text text-xs">
                            <div className="flex items-center gap-1.5">
                              <span>{exp.description || exp.category}</span>
                              {isProtected && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20" title="Automated purchase order intake voucher (read-only)">
                                  <Lock size={9} /> PO Intake
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span 
                              className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs whitespace-nowrap"
                              style={{ backgroundColor: CATEGORY_COLORS[exp.category] || "#94A3B8" }}
                            >
                              {exp.category || 'Misc'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-app-muted whitespace-nowrap">
                            {exp.payment_method || 'Cash'}
                          </td>
                          <td className="py-3 px-4 text-app-muted">
                            {exp.suppliers?.name || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-black font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            ₹{Number(exp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isProtected ? (
                              <span className="text-[10px] text-app-muted italic font-medium" title="System-generated PO expense cannot be edited or deleted">
                                Locked
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditForm({
                                      id: exp.id,
                                      amount: exp.amount,
                                      category: exp.category,
                                      payment_method: exp.payment_method || "Cash",
                                      description: exp.description || "",
                                      date: exp.date ? exp.date.split('T')[0] : "",
                                      is_system_generated: false
                                    });
                                    setShowEditModal(true);
                                  }}
                                  className="p-1 rounded-lg text-app-muted hover:text-primary transition-colors cursor-pointer"
                                  title="Edit Expense"
                                >
                                  <Edit2 size={13} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(exp)}
                                  disabled={deletingExpense}
                                  className="p-1 rounded-lg text-app-muted hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Delete Expense"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalExpensePages > 1 && (
              <div className="p-3 bg-app-subtle/30 border-t border-app-border flex items-center justify-between text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={expensePage <= 1 || loadingExpenses}
                  onClick={() => setExpensePage(p => Math.max(1, p - 1))}
                  icon={<ChevronLeft size={14} />}
                >
                  Previous
                </Button>
                <span className="text-app-muted font-medium font-mono text-[11px]">
                  Page {expensePage} of {totalExpensePages} ({totalExpensesCount} total)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={expensePage >= totalExpensePages || loadingExpenses}
                  onClick={() => setExpensePage(p => p + 1)}
                  icon={<ChevronRight size={14} />}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 3: CATEGORY ANALYTICS (ACTUAL EXPENSES DISTRIBUTION) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Donut Chart (5 cols) */}
          <div className="lg:col-span-5 p-5 bg-app-surface border border-app-border rounded-2xl shadow-2xs space-y-4">
            <h3 className="font-bold text-xs text-app-text">Actual Spending Distribution by Category</h3>
            
            {categoryData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-app-muted italic py-12 text-center">No category spending recorded for this period.</p>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-app-border">
              {categoryData.map(c => (
                <span key={c.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-app-text">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}: ₹{Number(c.value).toLocaleString('en-IN')}
                </span>
              ))}
            </div>
          </div>

          {/* Actual Expense Breakdown Table (7 cols) */}
          <div className="lg:col-span-7 p-5 bg-app-surface border border-app-border rounded-2xl shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xs text-app-text">Category Expense Breakdown</h3>
                <p className="text-[11px] text-app-muted">Real spending aggregates calculated directly from canonical records</p>
              </div>
              <span className="text-xs font-bold text-app-text font-mono">
                Total: ₹{totalPageExpenseSum.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="space-y-3">
              {categoryData.length === 0 ? (
                <p className="text-xs text-app-muted italic py-6 text-center">No expense categories to display.</p>
              ) : (
                categoryData.map(c => {
                  const percent = totalPageExpenseSum > 0 ? Math.round((c.value / totalPageExpenseSum) * 100) : 0;
                  return (
                    <div key={c.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="font-bold text-app-text">{c.name}</span>
                        </div>
                        <span className="font-mono text-app-muted">
                          <strong className="text-app-text">₹{Number(c.value).toLocaleString('en-IN')}</strong> ({percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-app-subtle rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${percent}%`, backgroundColor: c.color }} 
                          className="h-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. RECORD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="bg-app-surface border border-app-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Plus className="text-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Record Operating Expense</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-app-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Expense Amount (₹) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="₹0.00"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold font-mono text-app-text outline-none focus:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Payment Method</label>
                  <select
                    value={form.payment_method}
                    onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                    className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Description / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Electricity Bill / Shop Supplies"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Vendor / Payee (Optional)</label>
                  <select
                    value={form.supplier_id}
                    onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}
                    className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                  >
                    <option value="">Select Vendor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={addingExpense} className="font-bold">
                  {addingExpense ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. EDIT EXPENSE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="bg-app-surface border border-app-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Edit2 className="text-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Edit Expense Voucher</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-app-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={editForm.amount}
                  onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold font-mono text-app-text outline-none focus:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Payment Method</label>
                  <select
                    value={editForm.payment_method}
                    onChange={e => setEditForm(p => ({ ...p, payment_method: e.target.value }))}
                    className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={updatingExpense} className="font-bold">
                  {updatingExpense ? "Updating..." : "Update Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. PERSISTENT CASH FLOAT ADJUSTMENT MODAL */}
      {showCashAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="bg-app-surface border border-app-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Wallet className="text-emerald-500" size={18} />
                <h3 className="font-bold text-sm text-app-text">Cash Drawer Float Adjustment</h3>
              </div>
              <button onClick={() => setShowCashAdjustModal(false)} className="p-1 text-app-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCashAdjustment} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCashAdjustForm(p => ({ ...p, type: 'deposit' }))}
                  className={`py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
                    cashAdjustForm.type === 'deposit' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'border-app-border bg-app-subtle text-app-muted'
                  }`}
                >
                  + Cash In (Deposit)
                </button>
                <button
                  type="button"
                  onClick={() => setCashAdjustForm(p => ({ ...p, type: 'withdrawal' }))}
                  className={`py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
                    cashAdjustForm.type === 'withdrawal' ? 'bg-rose-500/10 border-rose-500 text-rose-600' : 'border-app-border bg-app-subtle text-app-muted'
                  }`}
                >
                  - Cash Out (Withdrawal)
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Adjustment Amount (₹) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="₹0.00"
                  value={cashAdjustForm.amount}
                  onChange={e => setCashAdjustForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold font-mono text-app-text outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Reason *</label>
                <select
                  value={cashAdjustForm.reason}
                  onChange={e => setCashAdjustForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                >
                  <option value="Owner Capital Injection">Owner Capital Injection</option>
                  <option value="Drawer Float Opening">Drawer Float Opening</option>
                  <option value="Petty Cash Withdrawal">Petty Cash Withdrawal</option>
                  <option value="Bank Cash Deposit">Bank Cash Deposit</option>
                  <option value="Audit Reconciliation Discrepancy">Audit Discrepancy Correction</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Optional Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Added ₹1,000 for morning change drawer"
                  value={cashAdjustForm.notes}
                  onChange={e => setCashAdjustForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCashAdjustModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={addingAdjustment} className="font-bold">
                  {addingAdjustment ? "Recording..." : "Record Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. QUICK ADD VENDOR MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="bg-app-surface border border-app-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Users className="text-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Add Vendor Partner</h3>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="p-1 text-app-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Vendor / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Utilities / Property Owner"
                  value={supplierForm.name}
                  onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={supplierForm.phone}
                  onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-app-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold font-mono text-app-text outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowSupplierModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={addingSupplier} className="font-bold">
                  {addingSupplier ? "Saving..." : "Save Vendor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
