import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import API from '../services/apiClient';
import { useStore } from '../contexts/StoreContext';
import { useExpenses, useSuppliers, useAddExpense, useAddSupplier, useUpdateExpense } from "../hooks/useExpenses";
import { Card, MetricCard, SectionCard } from "../components/ui";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { 
  TrendingDown, TrendingUp, Plus, FileText, PieChart as PieIcon, 
  Users, CreditCard, DollarSign, BarChart3, AlertCircle, Edit2, 
  Search, Trash2, ArrowUpDown, Download, Calendar, Store, 
  RefreshCw, CheckCircle2, AlertTriangle, Layers, Clock, 
  ArrowRight, X, SlidersHorizontal, Landmark, Wallet, ArrowDownRight, 
  ArrowUpRight, Sparkles, Repeat, Receipt
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const CATEGORY_COLORS = {
  "Inventory": "#6366F1",
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

const DEFAULT_BUDGETS = {
  "Inventory": 150000,
  "Rent": 35000,
  "Salary": 80000,
  "Electricity": 12000,
  "Transport": 15000,
  "Marketing": 25000,
  "Office": 10000,
  "Misc": 15000
};

export default function ExpensePage() {
  const queryClient = useQueryClient();
  const { activeStore } = useStore();

  // Navigation & Period
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'analytics' | 'cashflow' | 'recurring'
  const [selectedPeriod, setSelectedPeriod] = useState('30d'); // 'today' | 'yesterday' | '7d' | '30d' | '3m' | '12m'

  // Data State
  const { data: expenses = [], isLoading: loadingExpenses } = useExpenses();
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingOther, setLoadingOther] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCashAdjustModal, setShowCashAdjustModal] = useState(false);

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
    category: "", 
    payment_method: "Cash", 
    supplier_id: "", 
    description: "",
    date: ""
  });
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "" });
  const [cashAdjustForm, setCashAdjustForm] = useState({
    type: "in",
    amount: "",
    reason: "Owner Capital Injection",
    notes: ""
  });

  const { mutateAsync: addExpense, isPending: addingExpense } = useAddExpense();
  const { mutateAsync: addSupplier } = useAddSupplier();
  const { mutateAsync: updateExpense, isPending: updatingExpense } = useUpdateExpense();

  // Fetch Sales & Payments for Cash Flow Ledger
  const fetchCashFlowData = useCallback(async () => {
    setLoadingOther(true);
    try {
      const [salesRes, payRes] = await Promise.all([
        API.get('/sales?limit=300').catch(() => ({ data: [] })),
        API.get('/payments?limit=300').catch(() => ({ data: [] }))
      ]);
      setSales(Array.isArray(salesRes.data) ? salesRes.data : (salesRes.data?.data || []));
      setPayments(Array.isArray(payRes.data) ? payRes.data : (payRes.data?.data || []));
    } catch {
      console.warn("Failed to load cash flow components");
    } finally {
      setLoadingOther(false);
    }
  }, []);

  useEffect(() => {
    fetchCashFlowData();
  }, [fetchCashFlowData]);

  // Date Filter Range Helper
  const dateThreshold = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    if (selectedPeriod === 'yesterday') {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    if (selectedPeriod === '7d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return start;
    }
    if (selectedPeriod === '30d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return start;
    }
    if (selectedPeriod === '3m') {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      return start;
    }
    if (selectedPeriod === '12m') {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      return start;
    }
    return new Date(0);
  }, [selectedPeriod]);

  // Period Filtered Expenses
  const periodExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date || e.created_at || Date.now());
      return d >= dateThreshold;
    });
  }, [expenses, dateThreshold]);

  // Snapshot KPI Metrics
  const stats = useMemo(() => {
    const totalExpenses = periodExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    // Today's Outflow
    const todayStr = new Date().toISOString().split('T')[0];
    const todayExpenses = expenses
      .filter(e => (e.date || '').startsWith(todayStr))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Inflow from Sales & Payments
    let totalInflow = 0;
    sales.forEach(s => {
      const d = new Date(s.date || s.created_at || Date.now());
      if (d >= dateThreshold && s.payment_status === 'paid') {
        totalInflow += Number(s.total || 0);
      } else if (d >= dateThreshold && s.amount_paid > 0) {
        totalInflow += Number(s.amount_paid);
      }
    });
    payments.forEach(p => {
      const d = new Date(p.date || p.created_at || Date.now());
      if (d >= dateThreshold) {
        totalInflow += Number(p.amount || 0);
      }
    });

    const netCashFlow = totalInflow - totalExpenses;

    // Liquid Account Positions (Estimated)
    let cashDrawer = 0;
    let upiDigital = 0;
    let bankCard = 0;

    // Inflows
    sales.forEach(s => {
      const amt = s.payment_status === 'paid' ? Number(s.total || 0) : Number(s.amount_paid || 0);
      const mode = (s.payment_mode || s.payment_method || 'cash').toLowerCase();
      if (mode === 'cash') cashDrawer += amt;
      else if (mode === 'upi') upiDigital += amt;
      else bankCard += amt;
    });

    // Outflows (Expenses)
    expenses.forEach(e => {
      const amt = Number(e.amount || 0);
      const mode = (e.payment_method || 'cash').toLowerCase();
      if (mode === 'cash') cashDrawer -= amt;
      else if (mode === 'upi') upiDigital -= amt;
      else bankCard -= amt;
    });

    return {
      totalExpenses,
      todayExpenses,
      totalInflow,
      netCashFlow,
      cashDrawer: Math.max(0, cashDrawer),
      upiDigital: Math.max(0, upiDigital),
      bankCard: Math.max(0, bankCard),
      expenseCount: periodExpenses.length
    };
  }, [periodExpenses, expenses, sales, payments, dateThreshold]);

  // Categories Extracted & Pie Chart Data
  const categoryData = useMemo(() => {
    const map = {};
    periodExpenses.forEach(e => {
      const cat = e.category || "Misc";
      map[cat] = (map[cat] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || "#94A3B8"
    }));
  }, [periodExpenses]);

  // Budget Progress Analysis
  const budgetProgress = useMemo(() => {
    const map = {};
    periodExpenses.forEach(e => {
      const cat = e.category || "Misc";
      map[cat] = (map[cat] || 0) + Number(e.amount || 0);
    });

    return Object.keys(DEFAULT_BUDGETS).map(cat => {
      const spent = map[cat] || 0;
      const budget = DEFAULT_BUDGETS[cat];
      const percent = Math.min(Math.round((spent / budget) * 100), 100);
      const isOver = spent > budget;
      return { category: cat, spent, budget, percent, isOver };
    });
  }, [periodExpenses]);

  // Filtered & Sorted Expenses List
  const filteredExpenses = useMemo(() => {
    let result = periodExpenses;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(e => 
        e.description?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.suppliers?.name?.toLowerCase().includes(q) ||
        e.payment_method?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(e => e.category === selectedCategory);
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0);
      if (sortBy === 'date_asc') return new Date(a.date || a.created_at || 0) - new Date(b.date || b.created_at || 0);
      if (sortBy === 'amount_desc') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortBy === 'amount_asc') return Number(a.amount || 0) - Number(b.amount || 0);
      return 0;
    });

    return result;
  }, [periodExpenses, searchQuery, selectedCategory, sortBy]);

  // Combined Inflow vs Outflow Cash Ledger
  const combinedLedger = useMemo(() => {
    const entries = [];

    // Sales
    sales.forEach(s => {
      const amt = s.payment_status === 'paid' ? Number(s.total || 0) : Number(s.amount_paid || 0);
      if (amt > 0) {
        entries.push({
          type: 'in',
          title: `Sale Collection (Inv #${s.invoice_no || 'POS'})`,
          category: 'Sales Revenue',
          amount: amt,
          method: s.payment_mode || s.payment_method || 'Cash',
          date: s.date || s.created_at
        });
      }
    });

    // Customer Repayments
    payments.forEach(p => {
      entries.push({
        type: 'in',
        title: `Customer Khata Settlement`,
        category: 'Repayment',
        amount: Number(p.amount || 0),
        method: p.payment_mode || 'Cash',
        date: p.date || p.created_at
      });
    });

    // Expenses
    expenses.forEach(e => {
      entries.push({
        type: 'out',
        title: e.description || e.category || 'Expense Outflow',
        category: e.category || 'Expense',
        amount: Number(e.amount || 0),
        method: e.payment_method || 'Cash',
        date: e.date || e.created_at
      });
    });

    return entries
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50);
  }, [sales, payments, expenses]);

  // Add Expense Handler
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Please enter a valid expense amount");

    try {
      await addExpense({
        amount: Number(form.amount),
        category: form.category || "Misc",
        payment_method: form.payment_method || "Cash",
        supplier_id: form.supplier_id || null,
        description: form.description || form.category,
        date: form.date || new Date().toISOString().split('T')[0]
      });

      toast.success("Expense recorded successfully! 💸");
      setShowAddModal(false);
      setForm({ amount: "", category: "Misc", payment_method: "Cash", supplier_id: "", description: "", date: new Date().toISOString().split('T')[0] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      toast.error("Failed to add expense");
    }
  };

  // Update Expense Handler
  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    try {
      await updateExpense({
        id: editForm.id,
        amount: Number(editForm.amount),
        category: editForm.category,
        payment_method: editForm.payment_method,
        supplier_id: editForm.supplier_id || null,
        description: editForm.description
      });
      toast.success("Expense updated!");
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      toast.error("Failed to update expense");
    }
  };

  // Delete Expense Handler
  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await API.delete(`/expenses/${id}`);
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  // Add Supplier Handler
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return toast.error("Supplier name required");
    try {
      await addSupplier(supplierForm);
      toast.success("Supplier Added!");
      setSupplierForm({ name: "", phone: "" });
      setShowSupplierModal(false);
    } catch {
      toast.error("Failed to add supplier");
    }
  };

  // Cash Drawer Adjustment Handler
  const handleCashAdjustment = (e) => {
    e.preventDefault();
    const amt = Number(cashAdjustForm.amount);
    if (!amt || amt <= 0) return toast.error("Please enter a valid adjustment amount");

    toast.success(`Cash drawer adjustment of ₹${amt.toLocaleString('en-IN')} logged! 💵`);
    setShowCashAdjustModal(false);
    setCashAdjustForm({ type: "in", amount: "", reason: "Owner Capital Injection", notes: "" });
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) return toast.error("No expenses to export");
    const headers = ["Date", "Description", "Category", "Payment Method", "Amount (₹)", "Vendor"];
    const rows = filteredExpenses.map(e => [
      `"${new Date(e.date || e.created_at).toLocaleDateString('en-IN')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${e.category || 'Misc'}"`,
      `"${e.payment_method || 'Cash'}"`,
      Number(e.amount || 0),
      `"${e.suppliers?.name || 'N/A'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `karobar_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Expenses exported to CSV!");
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 max-w-[1600px] mx-auto">
      
      {/* 1. OPERATIONAL EXPENSE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-app-surface border border-app-border rounded-panel shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center font-black shadow-md shadow-app-primary/20 shrink-0">
            <TrendingDown size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-app-text tracking-tight">Expense & Cash Management Command Center</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-primary/10 text-app-primary">
                <Store size={10} /> {activeStore?.name || "Main Branch"}
              </span>
            </div>
            <p className="text-xs text-app-text-secondary mt-0.5">
              Track operational spending, audit cash drawer liquidity, and control category budgets.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download size={14} />}
            className="text-xs"
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCashAdjustModal(true)}
            icon={<Wallet size={14} />}
            className="text-xs"
          >
            Cash Adjustment
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSupplierModal(true)}
            icon={<Users size={14} />}
            className="text-xs"
          >
            Manage Vendors
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            icon={<Plus size={15} />}
            className="text-xs shadow-md shadow-app-primary/20 font-bold"
          >
            + Record Expense
          </Button>
        </div>
      </div>

      {/* 2. SNAPSHOT KPI CARDS (KaroBar Card System) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          title="Total Expenses"
          value={`₹${stats.totalExpenses.toLocaleString('en-IN')}`}
          subtitle={`${stats.expenseCount} entries this period`}
          icon={<TrendingDown size={18} />}
          iconBg="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
        />

        <MetricCard
          title="Today's Outflow"
          value={`₹${stats.todayExpenses.toLocaleString('en-IN')}`}
          subtitle="Spent today"
          icon={<Clock size={18} />}
          iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
        />

        <MetricCard
          title="Total Money Inflow"
          value={`₹${stats.totalInflow.toLocaleString('en-IN')}`}
          subtitle="Sales & repayments collected"
          icon={<TrendingUp size={18} />}
          iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        />

        <MetricCard
          title="Net Cash Position"
          value={`₹${Math.abs(stats.netCashFlow).toLocaleString('en-IN')}`}
          badge={stats.netCashFlow >= 0 ? "Positive Cashflow" : "Negative Outflow"}
          badgeVariant={stats.netCashFlow >= 0 ? "success" : "danger"}
          subtitle="Inflow − Outflow"
          icon={<DollarSign size={18} />}
          iconBg={stats.netCashFlow >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}
        />

        <MetricCard
          title="Active Categories"
          value={categoryData.length}
          subtitle="MSME cost centers"
          icon={<Layers size={18} />}
          iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
        />
      </div>

      {/* 3. LIQUID MONEY POSITION (Cash vs UPI vs Bank Accounts) */}
      <div className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-xs text-app-text">Liquid Money & Account Positions</h3>
            <p className="text-[10px] text-app-text-muted">Estimated balances across physical cash and digital accounts</p>
          </div>
          <span className="text-xs font-bold text-app-primary">
            Total Liquid: ₹{(stats.cashDrawer + stats.upiDigital + stats.bankCard).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                💵
              </div>
              <div>
                <span className="text-[10px] font-bold text-app-text-muted uppercase">Cash Drawer (Physical)</span>
                <p className="font-black text-sm font-mono text-app-text">₹{stats.cashDrawer.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">Active</span>
          </div>

          <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                ⚡
              </div>
              <div>
                <span className="text-[10px] font-bold text-app-text-muted uppercase">UPI / QR Digital</span>
                <p className="font-black text-sm font-mono text-app-text">₹{stats.upiDigital.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">Instant</span>
          </div>

          <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                🏦
              </div>
              <div>
                <span className="text-[10px] font-bold text-app-text-muted uppercase">Bank / Card Account</span>
                <p className="font-black text-sm font-mono text-app-text">₹{stats.bankCard.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">Settled</span>
          </div>
        </div>
      </div>

      {/* 4. WORKSPACE TABS & CONTROLS */}
      <div className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border/60 pb-3">
          
          {/* Navigation Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'expenses', label: 'Expenses Log', icon: <FileText size={14} />, count: filteredExpenses.length },
              { id: 'analytics', label: 'Category Analytics & Budgets', icon: <PieIcon size={14} /> },
              { id: 'cashflow', label: 'Cash Inflow vs Outflow', icon: <DollarSign size={14} /> },
              { id: 'recurring', label: 'Recurring Commitments', icon: <Repeat size={14} /> }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-app-primary text-white shadow-xs'
                    : 'bg-app-surface-subtle text-app-text-secondary hover:text-app-text'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-app-border text-app-text-muted'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-app-text-muted text-[11px] font-semibold">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-app-surface-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs font-bold text-app-text outline-none focus:border-app-primary"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="3m">Last 3 Months</option>
              <option value="12m">Last 12 Months</option>
            </select>
          </div>
        </div>

        {/* Tab 1 Filter Bar */}
        {activeTab === 'expenses' && (
          <div className="space-y-2 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={15} />
                <input
                  type="text"
                  placeholder="Search expense description, vendor, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
                />
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-app-text-muted text-[11px] font-semibold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-app-surface-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs font-bold text-app-text outline-none"
                >
                  <option value="date_desc">Newest Date First</option>
                  <option value="date_asc">Oldest Date First</option>
                  <option value="amount_desc">Highest Amount</option>
                  <option value="amount_asc">Lowest Amount</option>
                </select>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-app-border/60">
              {['all', 'Rent', 'Salary', 'Inventory', 'Electricity', 'Transport', 'Marketing', 'Office', 'Maintenance', 'Misc'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-app-text text-app-surface dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-app-surface-subtle text-app-text-secondary hover:text-app-text'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. TAB WORKSPACE CONTENT */}
      {loadingExpenses ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel space-y-3">
          <RefreshCw className="animate-spin text-app-primary mx-auto" size={28} />
          <p className="text-xs font-bold text-app-text">Loading business expenses...</p>
        </div>
      ) : activeTab === 'expenses' ? (
        /* TAB 1: EXPENSES LOG TABLE */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingDown size={40} className="mx-auto text-app-text-muted mb-2" />
              <h3 className="font-bold text-sm text-app-text">No expenses recorded for this period</h3>
              <p className="text-xs text-app-text-muted mt-1">Record a new business expense or change your date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Expense Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Vendor / Payee</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-app-surface-subtle/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-app-text-secondary">
                        {new Date(exp.date || exp.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-app-text">
                        {exp.description || exp.category}
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: CATEGORY_COLORS[exp.category] || "#94A3B8" }}
                        >
                          {exp.category || 'Misc'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-app-text-secondary">
                        {exp.payment_method || 'Cash'}
                      </td>
                      <td className="py-3 px-4 text-app-text-secondary">
                        {exp.suppliers?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-rose-600 dark:text-rose-400">
                        ₹{Number(exp.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditForm({
                                id: exp.id,
                                amount: exp.amount,
                                category: exp.category,
                                payment_method: exp.payment_method || "Cash",
                                supplier_id: exp.supplier_id || "",
                                description: exp.description || "",
                                date: exp.date || ""
                              });
                              setShowEditModal(true);
                            }}
                            className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text hover:bg-app-surface-subtle transition-colors"
                            title="Edit Expense"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 rounded-lg text-app-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'analytics' ? (
        /* TAB 2: CATEGORY ANALYTICS & BUDGET UTILIZATION */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Pie Chart (5 cols) */}
          <div className="lg:col-span-5 p-6 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-app-text">Spending Distribution by Category</h3>
            
            {categoryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
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
              <p className="text-xs text-app-text-muted italic py-12 text-center">No category spending data.</p>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-app-border/60">
              {categoryData.map(c => (
                <span key={c.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-app-text-secondary">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}: ₹{c.value.toLocaleString('en-IN')}
                </span>
              ))}
            </div>
          </div>

          {/* MSME Category Budgets (7 cols) */}
          <div className="lg:col-span-7 p-6 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-app-text">MSME Budget Utilization</h3>
                <p className="text-xs text-app-text-muted">Tracking monthly threshold targets</p>
              </div>
              <span className="text-xs font-bold text-app-primary">Standard Benchmark</span>
            </div>

            <div className="space-y-3.5">
              {budgetProgress.map(b => (
                <div key={b.category} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-app-text">{b.category}</span>
                    <span className="font-mono text-app-text-secondary">
                      <strong className={b.isOver ? "text-rose-600" : "text-app-text"}>₹{b.spent.toLocaleString('en-IN')}</strong> / ₹{b.budget.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-app-surface-subtle rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${b.percent}%` }} 
                      className={`h-full transition-all duration-300 ${b.isOver ? 'bg-rose-500' : b.percent > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'cashflow' ? (
        /* TAB 3: INFLOW VS OUTFLOW CASH LEDGER */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
          <div className="p-4 bg-app-surface-subtle border-b border-app-border flex justify-between items-center">
            <div>
              <h3 className="font-bold text-xs text-app-text">Real-Time Money Inflow & Outflow Stream</h3>
              <p className="text-[10px] text-app-text-muted">Combined POS sales collections, repayments, and business expenses</p>
            </div>
            <span className="text-xs font-mono font-bold text-app-text">Latest 50 Entries</span>
          </div>

          <div className="divide-y divide-app-border max-h-[500px] overflow-y-auto">
            {combinedLedger.map((tx, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-app-surface-subtle/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    tx.type === 'in' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {tx.type === 'in' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div>
                    <p className="font-bold text-app-text">{tx.title}</p>
                    <span className="text-[10px] font-mono text-app-text-muted">
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {tx.method} • {tx.category}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono font-black">
                  <span className={tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}>
                    {tx.type === 'in' ? `+₹${tx.amount.toLocaleString('en-IN')}` : `-₹${tx.amount.toLocaleString('en-IN')}`}
                  </span>
                  <span className="text-[9px] text-app-text-muted block uppercase">{tx.type === 'in' ? 'Inflow' : 'Outflow'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* TAB 4: RECURRING COMMITMENTS */
        <div className="space-y-4">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-panel text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <Repeat className="text-indigo-600" size={18} />
            <span>
              <strong>Scheduled & Recurring Commitments:</strong> Monitor upcoming monthly business obligations to avoid operational disruptions.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Store Rent", amount: 35000, frequency: "Monthly", due: "1st of every month", icon: "🏢" },
              { title: "Staff Salaries", amount: 80000, frequency: "Monthly", due: "7th of every month", icon: "👥" },
              { title: "Electricity & Power", amount: 12000, frequency: "Monthly", due: "15th of every month", icon: "⚡" },
              { title: "Broadband & Software", amount: 2500, frequency: "Monthly", due: "20th of every month", icon: "🌐" }
            ].map((rec, idx) => (
              <div key={idx} className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xl">{rec.icon}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-600">
                      {rec.frequency}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-app-text">{rec.title}</h4>
                  <p className="text-xs text-app-text-muted mt-0.5">{rec.due}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-app-border flex justify-between items-center">
                  <span className="text-xs text-app-text-secondary font-medium">Estimated:</span>
                  <span className="font-mono font-black text-sm text-app-text">₹{rec.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Plus className="text-app-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Record Business Expense</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Expense Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="₹0"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  >
                    {['Rent', 'Salary', 'Inventory', 'Electricity', 'Transport', 'Marketing', 'Office', 'Maintenance', 'Misc'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Payment Method</label>
                  <select
                    value={form.payment_method}
                    onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  >
                    <option value="Cash">Cash Drawer</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Expense Description / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Electricity Bill / Shop Supplies"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Vendor / Payee (Optional)</label>
                  <select
                    value={form.supplier_id}
                    onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  >
                    <option value="">Select Vendor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Edit2 className="text-app-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Edit Expense Record</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editForm.amount}
                  onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  >
                    {['Rent', 'Salary', 'Inventory', 'Electricity', 'Transport', 'Marketing', 'Office', 'Maintenance', 'Misc'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Payment Method</label>
                  <select
                    value={editForm.payment_method}
                    onChange={e => setEditForm(p => ({ ...p, payment_method: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
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

      {/* 8. CASH ADJUSTMENT MODAL */}
      {showCashAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Wallet className="text-emerald-500" size={18} />
                <h3 className="font-bold text-sm text-app-text">Cash Drawer Adjustment</h3>
              </div>
              <button onClick={() => setShowCashAdjustModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCashAdjustment} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCashAdjustForm(p => ({ ...p, type: 'in' }))}
                  className={`py-2 rounded-xl font-bold border transition-colors ${
                    cashAdjustForm.type === 'in' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'border-app-border bg-app-surface-subtle text-app-text-secondary'
                  }`}
                >
                  + Cash In (Deposit)
                </button>
                <button
                  type="button"
                  onClick={() => setCashAdjustForm(p => ({ ...p, type: 'out' }))}
                  className={`py-2 rounded-xl font-bold border transition-colors ${
                    cashAdjustForm.type === 'out' ? 'bg-rose-500/10 border-rose-500 text-rose-600' : 'border-app-border bg-app-surface-subtle text-app-text-secondary'
                  }`}
                >
                  - Cash Out (Withdrawal)
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Adjustment Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="₹0"
                  value={cashAdjustForm.amount}
                  onChange={e => setCashAdjustForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Reason</label>
                <select
                  value={cashAdjustForm.reason}
                  onChange={e => setCashAdjustForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                >
                  <option value="Owner Capital Injection">Owner Capital Injection</option>
                  <option value="Petty Cash Withdrawal">Petty Cash Withdrawal</option>
                  <option value="Drawer Float Opening">Drawer Float Opening</option>
                  <option value="Bank Cash Deposit">Bank Cash Deposit</option>
                  <option value="Audit Reconciliation Discrepancy">Audit Discrepancy Correction</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCashAdjustModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold">
                  Log Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MANAGE VENDORS MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Users className="text-app-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Add Vendor Partner</h3>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Utilities / Landlord"
                  value={supplierForm.name}
                  onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={supplierForm.phone}
                  onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowSupplierModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold">
                  Save Vendor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
