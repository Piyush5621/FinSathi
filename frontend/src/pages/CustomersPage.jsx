import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import API from '../services/apiClient';
import { useStore } from '../contexts/StoreContext';
import { Card, MetricCard, SectionCard } from '../components/ui';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Users, Search, Plus, MapPin, PhoneCall, MessageCircle, 
  DollarSign, ArrowRight, UserCheck, CreditCard, RefreshCw, 
  AlertTriangle, ShieldAlert, Sparkles, Filter, List, LayoutGrid, 
  Receipt, Trash2, Edit3, X, Check, Copy, Send, Download, Upload,
  Clock, ArrowUpDown, ChevronRight, Phone, Mail, Building, FileSpreadsheet
} from 'lucide-react';

// Deterministic avatar color helper
function getAvatarColor(name = '') {
  const colors = [
    'bg-indigo-600', 'bg-violet-600', 'bg-blue-600', 'bg-emerald-600',
    'bg-rose-600', 'bg-amber-600', 'bg-cyan-600', 'bg-pink-600',
    'bg-teal-600', 'bg-orange-600'
  ];
  const charCode = name ? name.charCodeAt(0) : 0;
  return colors[charCode % colors.length];
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeStore } = useStore();

  // Core Data State
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'dues' | 'overdue' | 'settled' | 'high_ltv'
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'dues_desc' | 'ltv_desc' | 'recent'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Selected Customer & Drawer
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [customerSales, setCustomerSales] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Forms
  const [customerForm, setCustomerForm] = useState({
    name: '', phone: '', email: '', city: '', address: '', gstin: '', credit_limit: ''
  });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '', payment_mode: 'cash', reference: '', notes: ''
  });
  const [reminderData, setReminderData] = useState({
    customer: null, message: ''
  });

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const shopName = user.business_name || activeStore?.name || "KaroBar Retail";

  // Fetch Customers & Global Sales
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, salesRes, payRes] = await Promise.all([
        API.get('/customers?limit=500').catch(() => ({ data: [] })),
        API.get('/sales?limit=500').catch(() => ({ data: [] })),
        API.get('/payments').catch(() => ({ data: [] }))
      ]);

      const custList = Array.isArray(custRes.data) ? custRes.data : (custRes.data?.data || []);
      const salesList = Array.isArray(salesRes.data) ? salesRes.data : (salesRes.data?.data || []);
      const payList = Array.isArray(payRes.data) ? payRes.data : (payRes.data?.data || []);

      setCustomers(custList);
      setSales(salesList);
      setPayments(payList);
    } catch (err) {
      console.error("Error loading customer data:", err);
      toast.error('Failed to load customer directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate Customer Financial Metrics & LTV
  const customerFinancials = useMemo(() => {
    const map = {};
    
    // Sum total purchases (LTV) and pending dues per customer
    sales.forEach(sale => {
      if (!sale.customer_id) return;
      if (!map[sale.customer_id]) {
        map[sale.customer_id] = { totalPurchases: 0, outstanding: 0, lastPurchaseDate: null };
      }
      const total = Number(sale.total || 0);
      const paid = Number(sale.amount_paid || 0);
      const due = Math.max(0, total - paid);

      map[sale.customer_id].totalPurchases += total;
      map[sale.customer_id].outstanding += due;

      if (!map[sale.customer_id].lastPurchaseDate || new Date(sale.date || sale.created_at) > new Date(map[sale.customer_id].lastPurchaseDate)) {
        map[sale.customer_id].lastPurchaseDate = sale.date || sale.created_at;
      }
    });

    return map;
  }, [sales]);

  // Snapshot KPI Metrics
  const stats = useMemo(() => {
    const totalCount = customers.length;
    let totalReceivables = 0;
    let overdueReceivables = 0;
    let customersWithDuesCount = 0;
    let cleanAccountsCount = 0;
    let totalCollections = 0;

    customers.forEach(c => {
      const liveDue = Number(c.outstanding_balance !== undefined ? c.outstanding_balance : (customerFinancials[c.id]?.outstanding || 0));
      if (liveDue > 0) {
        totalReceivables += liveDue;
        customersWithDuesCount++;
        // If overdue (e.g. > ₹5,000 or older purchase)
        if (liveDue > 3000) {
          overdueReceivables += liveDue;
        }
      } else {
        cleanAccountsCount++;
      }
    });

    payments.forEach(p => {
      totalCollections += Number(p.amount || 0);
    });

    const settledPercent = totalCount > 0 ? Math.round((cleanAccountsCount / totalCount) * 100) : 100;
    const duesPercent = totalCount > 0 ? Math.round((customersWithDuesCount / totalCount) * 100) : 0;

    return {
      totalCount,
      totalReceivables,
      overdueReceivables,
      customersWithDuesCount,
      cleanAccountsCount,
      totalCollections,
      settledPercent,
      duesPercent
    };
  }, [customers, customerFinancials, payments]);

  // Follow-Up Candidates (Top 3 clients with pending dues)
  const followUpCandidates = useMemo(() => {
    return customers
      .map(c => ({
        ...c,
        due: Number(c.outstanding_balance !== undefined ? c.outstanding_balance : (customerFinancials[c.id]?.outstanding || 0))
      }))
      .filter(c => c.due > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, 3);
  }, [customers, customerFinancials]);

  // Filtered & Sorted Customer List
  const filteredCustomers = useMemo(() => {
    let result = customers.map(c => {
      const fin = customerFinancials[c.id] || { totalPurchases: 0, outstanding: 0, lastPurchaseDate: null };
      const outstandingDue = Number(c.outstanding_balance !== undefined ? c.outstanding_balance : fin.outstanding);
      return {
        ...c,
        outstandingDue,
        totalLtv: fin.totalPurchases,
        lastPurchaseDate: fin.lastPurchaseDate
      };
    });

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }

    // Filter mode
    if (filterMode === 'dues') {
      result = result.filter(c => c.outstandingDue > 0);
    } else if (filterMode === 'overdue') {
      result = result.filter(c => c.outstandingDue > 3000);
    } else if (filterMode === 'settled') {
      result = result.filter(c => c.outstandingDue === 0);
    } else if (filterMode === 'high_ltv') {
      result = result.filter(c => c.totalLtv > 10000);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'dues_desc') return b.outstandingDue - a.outstandingDue;
      if (sortBy === 'ltv_desc') return b.totalLtv - a.totalLtv;
      if (sortBy === 'recent') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return 0;
    });

    return result;
  }, [customers, customerFinancials, searchQuery, filterMode, sortBy]);

  // Fetch Detailed Customer Ledger
  const openCustomerLedger = async (customer) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
    setLoadingLedger(true);
    try {
      const [salesRes, payRes] = await Promise.all([
        API.get(`/sales?customer_id=${customer.id}`).catch(() => ({ data: [] })),
        API.get(`/payments/${customer.id}`).catch(() => ({ data: [] }))
      ]);
      setCustomerSales(salesRes.data || []);
      setCustomerPayments(payRes.data || []);
    } catch {
      toast.error("Failed to load customer Khata history");
    } finally {
      setLoadingLedger(false);
    }
  };

  // Add Customer Handler
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return toast.error("Customer Name is required");

    try {
      await API.post('/customers', customerForm);
      toast.success("Customer account registered successfully! 🎉");
      setShowAddModal(false);
      setCustomerForm({ name: '', phone: '', email: '', city: '', address: '', gstin: '', credit_limit: '' });
      fetchData();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add customer");
    }
  };

  // Update Customer Handler
  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editingCustomer?.name.trim()) return toast.error("Customer Name is required");

    try {
      await API.put(`/customers/${editingCustomer.id}`, editingCustomer);
      toast.success("Customer profile updated!");
      setShowEditModal(false);
      setEditingCustomer(null);
      fetchData();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (selectedCustomer?.id === editingCustomer.id) {
        setSelectedCustomer(editingCustomer);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update customer");
    }
  };

  // Delete Customer Handler
  const handleDeleteCustomer = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this customer profile?")) return;

    try {
      await API.delete(`/customers/${id}`);
      toast.success("Customer removed");
      fetchData();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (selectedCustomer?.id === id) setIsDrawerOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete customer");
    }
  };

  // Record Repayment Handler (FIFO allocation & Ledger Sync)
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) return toast.error("Please enter a valid repayment amount");

    try {
      const res = await API.post(`/customers/${selectedCustomer.id}/payments`, {
        amount: amt,
        payment_method: paymentForm.payment_mode,
        reference: paymentForm.reference,
        notes: paymentForm.notes
      });

      if (res.data?.success || res.data) {
        toast.success(`Repayment of ₹${amt.toLocaleString('en-IN')} recorded successfully! 💰`);
        setShowPaymentModal(false);
        setPaymentForm({ amount: '', payment_mode: 'cash', reference: '', notes: '' });
        fetchData();
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        
        // Refresh open drawer if active
        if (isDrawerOpen) {
          openCustomerLedger(selectedCustomer);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to process customer repayment");
    }
  };

  // Open WhatsApp Reminder Generator
  const openWhatsAppReminder = (customer, e) => {
    e?.stopPropagation();
    const due = customer.outstandingDue || customer.outstanding_balance || 0;
    const msg = `Namaste ${customer.name} ji,\n\nThis is a friendly reminder from *${shopName}* regarding your pending bill balance of *₹${due.toLocaleString('en-IN')}*.\n\nPlease clear the due at your earliest convenience via UPI or Cash.\n\nThank you for your business! 🙏`;
    
    setReminderData({ customer, message: msg });
    setShowReminderModal(true);
  };

  // Send WhatsApp Message
  const executeSendWhatsApp = () => {
    if (!reminderData.customer?.phone) {
      return toast.error("Customer phone number is missing");
    }
    const cleanPhone = reminderData.customer.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const encoded = encodeURIComponent(reminderData.message);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
    setShowReminderModal(false);
    toast.success("Opening WhatsApp with pre-filled payment reminder! 📲");
  };

  // CSV Export
  const handleExportCSV = () => {
    if (customers.length === 0) return toast.error("No customers to export");
    const headers = ["Customer Name", "Phone", "Email", "City", "Address", "Outstanding Due (₹)", "Total LTV (₹)"];
    const rows = filteredCustomers.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.city || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.outstandingDue || 0,
      c.totalLtv || 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `karobar_customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Customer list exported to CSV!");
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 max-w-[1600px] mx-auto">
      
      {/* 1. OPERATIONAL CUSTOMER HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-app-surface border border-app-border rounded-panel shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center font-black shadow-md shadow-app-primary/20 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-app-text tracking-tight">Customer & Receivables Command Center</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-primary/10 text-app-primary">
                <MapPin size={10} /> {activeStore?.name || "Main Branch"}
              </span>
            </div>
            <p className="text-xs text-app-text-secondary mt-0.5">
              Manage client relationships, track Khata balances, send WhatsApp payment reminders, and record collections.
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
            onClick={() => navigate('/billing')}
            icon={<CreditCard size={14} />}
            className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            + POS Credit Sale
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            icon={<Plus size={15} />}
            className="text-xs shadow-md shadow-app-primary/20 font-bold"
          >
            + Add Customer
          </Button>
        </div>
      </div>

      {/* 2. SNAPSHOT KPI CARDS (KaroBar Card System) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          title="Total Customers"
          value={stats.totalCount.toLocaleString('en-IN')}
          subtitle="Registered customer accounts"
          icon={<Users size={18} />}
          iconBg="bg-app-surface-subtle text-app-text-secondary"
        />

        <MetricCard
          title="Total Receivables"
          value={`₹${stats.totalReceivables.toLocaleString('en-IN')}`}
          badge={stats.totalReceivables > 0 ? "Khata Pending" : "Zero Dues"}
          badgeVariant={stats.totalReceivables > 0 ? "warning" : "success"}
          subtitle="Outstanding customer debt"
          icon={<DollarSign size={18} />}
          iconBg="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
        />

        <MetricCard
          title="High Overdue (>₹3k)"
          value={`₹${stats.overdueReceivables.toLocaleString('en-IN')}`}
          badge={stats.overdueReceivables > 0 ? "Follow Up" : "Safe"}
          badgeVariant={stats.overdueReceivables > 0 ? "danger" : "success"}
          subtitle="Aged customer balances"
          icon={<AlertTriangle size={18} />}
          iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
        />

        <MetricCard
          title="Collections Collected"
          value={`₹${stats.totalCollections.toLocaleString('en-IN')}`}
          subtitle="Recorded repayments"
          icon={<UserCheck size={18} />}
          iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        />

        <MetricCard
          title="Settled Accounts"
          value={stats.cleanAccountsCount}
          badge={`${stats.settledPercent}%`}
          badgeVariant="success"
          subtitle="Accounts with ₹0 due"
          icon={<Receipt size={18} />}
          iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
        />
      </div>

      {/* 3. RECEIVABLES HEALTH & SMART FOLLOW-UP RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Receivables Composition Bar (5 cols) */}
        <div className="lg:col-span-5 p-4 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-xs text-app-text">Receivables Composition</h3>
              <p className="text-[10px] text-app-text-muted">Proportion of settled vs outstanding dues</p>
            </div>
            <span className="text-xs font-black text-emerald-600">{stats.settledPercent}% Cleared</span>
          </div>

          {/* Health Bar */}
          <div className="h-3 w-full bg-app-surface-subtle rounded-full overflow-hidden flex shadow-inner">
            <div style={{ width: `${stats.settledPercent}%` }} className="bg-emerald-500 transition-all duration-300" title={`Settled: ${stats.settledPercent}%`} />
            <div style={{ width: `${stats.duesPercent}%` }} className="bg-rose-500 transition-all duration-300" title={`With Dues: ${stats.duesPercent}%`} />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-app-text-secondary pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Settled Accounts ({stats.cleanAccountsCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              With Khata Dues ({stats.customersWithDuesCount})
            </span>
          </div>
        </div>

        {/* Smart Follow-Up Radar (7 cols) */}
        <div className="lg:col-span-7 p-4 bg-rose-500/5 border border-rose-500/20 rounded-panel shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="text-rose-600" size={16} />
              <h3 className="font-bold text-xs text-app-text">Priority Follow-Up Radar</h3>
            </div>
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">
              {followUpCandidates.length} Clients Overdue
            </span>
          </div>

          <p className="text-[11px] text-app-text-secondary mt-1">
            {followUpCandidates.length > 0 
              ? "Top customer accounts with highest outstanding balances requiring payment follow-up:" 
              : "All customer accounts are settled with zero pending balance."}
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            {followUpCandidates.map(customer => (
              <div
                key={customer.id}
                className="px-3 py-1.5 rounded-xl bg-app-surface border border-rose-300 dark:border-rose-900/60 text-app-text text-[11px] font-semibold flex items-center justify-between gap-3 shadow-2xs"
              >
                <div>
                  <span className="font-bold">{customer.name}</span>
                  <span className="text-rose-600 font-bold font-mono ml-1.5">₹{customer.due.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => openWhatsAppReminder(customer, e)}
                    className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    title="Send WhatsApp Reminder"
                  >
                    <MessageCircle size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setPaymentForm({ amount: customer.due, payment_mode: 'cash', reference: '', notes: '' });
                      setShowPaymentModal(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700"
                  >
                    Collect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. SEARCH, FILTER & VIEW CONTROLS */}
      <div className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Fast Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search by Customer Name, Phone, City, or Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort & View Mode */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-app-text-muted text-[11px] font-semibold hidden md:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-app-surface-subtle border border-app-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-app-text outline-none focus:border-app-primary"
              >
                <option value="name">Name (A-Z)</option>
                <option value="dues_desc">Highest Khata Due</option>
                <option value="ltv_desc">Highest Purchases (LTV)</option>
                <option value="recent">Recently Added</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-app-border bg-app-surface-subtle p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-app-surface text-app-primary shadow-xs' : 'text-app-text-muted hover:text-app-text'
                }`}
                title="Table View"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-app-surface text-app-primary shadow-xs' : 'text-app-text-muted hover:text-app-text'
                }`}
                title="Visual Cards View"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-app-border/60">
          {[
            { id: 'all', label: `All Accounts (${customers.length})` },
            { id: 'dues', label: `With Khata Dues (${stats.customersWithDuesCount})` },
            { id: 'overdue', label: 'Overdue Accounts' },
            { id: 'settled', label: `Settled (₹0 Due)` },
            { id: 'high_ltv', label: 'High Value Clients (>₹10k)' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterMode(f.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterMode === f.id
                  ? 'bg-app-primary text-white shadow-xs'
                  : 'bg-app-surface-subtle text-app-text-secondary hover:text-app-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. CUSTOMER WORKSPACE (TABLE OR GRID) */}
      {loading ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel space-y-3">
          <RefreshCw className="animate-spin text-app-primary mx-auto" size={28} />
          <p className="text-xs font-bold text-app-text">Loading customer accounts & balances...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel">
          <Users size={40} className="mx-auto text-app-text-muted mb-2" />
          <h3 className="font-bold text-sm text-app-text">No customers match your search</h3>
          <p className="text-xs text-app-text-muted mt-1">Try resetting your filters or add a new customer.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">City / Location</th>
                  <th className="py-3 px-4 text-right">Lifetime Purchases</th>
                  <th className="py-3 px-4 text-right">Khata Due (Receivable)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredCustomers.map(customer => {
                  const isSettled = customer.outstandingDue === 0;

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => openCustomerLedger(customer)}
                      className="hover:bg-app-surface-subtle/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full ${getAvatarColor(customer.name)} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                            {customer.name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-app-text">{customer.name}</div>
                            {customer.gstin && (
                              <span className="text-[10px] font-mono text-app-text-muted">GST: {customer.gstin}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-app-text-secondary">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone size={11} className="text-app-text-muted" /> {customer.phone || 'N/A'}
                        </div>
                        {customer.email && (
                          <div className="text-[10px] text-app-text-muted truncate max-w-[160px]">{customer.email}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-app-text-secondary capitalize">
                        {customer.city || customer.address || '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-black font-mono text-app-text">
                        ₹{customer.totalLtv.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4 text-right font-black font-mono">
                        <span className={isSettled ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}>
                          ₹{customer.outstandingDue.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isSettled 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900' 
                            : 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900'
                        }`}>
                          {isSettled ? 'Settled' : 'Due Balance'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {!isSettled && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setPaymentForm({ amount: customer.outstandingDue, payment_mode: 'cash', reference: '', notes: '' });
                                  setShowPaymentModal(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors shadow-2xs"
                                title="Record Repayment"
                              >
                                Pay
                              </button>

                              <button
                                type="button"
                                onClick={(e) => openWhatsAppReminder(customer, e)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                title="Send WhatsApp Reminder"
                              >
                                <MessageCircle size={15} />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => openCustomerLedger(customer)}
                            className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-primary hover:bg-app-surface-subtle transition-colors"
                            title="View Customer Khata"
                          >
                            <Receipt size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(customer);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text hover:bg-app-surface-subtle transition-colors"
                            title="Edit Customer"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomer(customer.id, e)}
                            className="p-1.5 rounded-lg text-app-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISUAL CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCustomers.map(customer => {
            const isSettled = customer.outstandingDue === 0;

            return (
              <div
                key={customer.id}
                onClick={() => openCustomerLedger(customer)}
                className="p-4 bg-app-surface border border-app-border hover:border-app-primary/50 rounded-panel shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${getAvatarColor(customer.name)} text-white flex items-center justify-center font-bold text-xs`}>
                        {customer.name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <span className="text-xs font-bold text-app-text group-hover:text-app-primary transition-colors truncate max-w-[140px]">
                        {customer.name}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      isSettled ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-rose-500/10 text-rose-600 border-rose-200'
                    }`}>
                      {isSettled ? 'Settled' : 'Due'}
                    </span>
                  </div>

                  <p className="text-[11px] text-app-text-muted font-mono">{customer.phone || 'No phone recorded'}</p>
                  <p className="text-[10px] text-app-text-secondary capitalize mt-0.5">{customer.city || 'Location N/A'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-app-border/60 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-app-text-secondary">Purchases (LTV):</span>
                    <span className="font-mono font-bold text-app-text">₹{customer.totalLtv.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-app-text-secondary">Khata Due:</span>
                    <span className={`font-mono font-black ${isSettled ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ₹{customer.outstandingDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. CUSTOMER KHATA & LEDGER DRAWER */}
      {isDrawerOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 animate-fadeIn">
          <div className="bg-app-surface border-l border-app-border w-full max-w-xl h-full shadow-2xl overflow-y-auto flex flex-col justify-between">
            
            {/* Header */}
            <div>
              <div className="flex justify-between items-center px-6 py-4 border-b border-app-border bg-app-surface-subtle">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(selectedCustomer.name)} text-white flex items-center justify-center font-black text-sm shadow-sm`}>
                    {selectedCustomer.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h2 className="font-black text-base text-app-text leading-tight">{selectedCustomer.name}</h2>
                    <span className="text-[11px] font-mono text-app-text-muted">{selectedCustomer.phone || 'No phone'} • {selectedCustomer.city || 'Location N/A'}</span>
                  </div>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 rounded-lg text-app-text-muted hover:text-app-text">
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6">
                
                {/* Balance & Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl text-center">
                    <span className="text-[10px] font-bold text-app-text-muted uppercase">Outstanding Khata Balance</span>
                    <p className="text-xl font-black font-mono text-rose-600 mt-0.5">
                      ₹{Number(selectedCustomer.outstanding_balance !== undefined ? selectedCustomer.outstanding_balance : (selectedCustomer.outstandingDue || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl text-center">
                    <span className="text-[10px] font-bold text-app-text-muted uppercase">Lifetime Purchases (LTV)</span>
                    <p className="text-xl font-black font-mono text-app-text mt-0.5">
                      ₹{Number(selectedCustomer.totalLtv || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Khata Ledger Timeline */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-app-text">Chronological Khata Ledger</h4>
                    <span className="text-[10px] text-app-text-muted font-mono">{customerSales.length} Sales • {customerPayments.length} Payments</span>
                  </div>

                  {loadingLedger ? (
                    <div className="p-6 text-center text-xs text-app-text-muted">Loading transaction timeline...</div>
                  ) : customerSales.length === 0 && customerPayments.length === 0 ? (
                    <p className="text-xs text-app-text-muted italic">No prior transaction history found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {/* Combine sales and repayments */}
                      {[
                        ...customerSales.map(s => ({
                          type: 'sale',
                          date: s.date || s.created_at,
                          title: `Invoice #${s.invoice_no || 'Sale'}`,
                          amount: Number(s.total || 0),
                          paid: Number(s.amount_paid || 0),
                          status: s.payment_status
                        })),
                        ...customerPayments.map(p => ({
                          type: 'payment',
                          date: p.date || p.created_at,
                          title: `Repayment (${p.payment_mode || 'Cash'})`,
                          amount: Number(p.amount || 0),
                          ref: p.reference
                        }))
                      ]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((tx, idx) => (
                          <div key={idx} className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-app-text">{tx.title}</p>
                              <span className="text-[10px] font-mono text-app-text-muted">
                                {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono font-black ${tx.type === 'sale' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {tx.type === 'sale' ? `+₹${tx.amount.toLocaleString('en-IN')}` : `-₹${tx.amount.toLocaleString('en-IN')}`}
                              </span>
                              <span className="text-[9px] text-app-text-muted block uppercase">{tx.type}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="p-6 border-t border-app-border bg-app-surface-subtle flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => openWhatsAppReminder(selectedCustomer, e)}
                icon={<MessageCircle size={14} />}
                className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
              >
                WhatsApp Reminder
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const due = selectedCustomer.outstanding_balance || selectedCustomer.outstandingDue || 0;
                  setPaymentForm({ amount: due, payment_mode: 'cash', reference: '', notes: '' });
                  setShowPaymentModal(true);
                }}
                className="text-xs font-bold"
              >
                💳 Record Repayment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. FAST REPAYMENT MODAL */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <DollarSign className="text-emerald-500" size={18} />
                <h3 className="font-bold text-sm text-app-text">Record Repayment ({selectedCustomer.name})</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-app-text-muted uppercase">Current Khata Due</span>
                  <p className="font-black text-rose-600 font-mono text-sm">
                    ₹{Number(selectedCustomer.outstanding_balance !== undefined ? selectedCustomer.outstanding_balance : selectedCustomer.outstandingDue).toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, amount: selectedCustomer.outstanding_balance || selectedCustomer.outstandingDue }))}
                  className="text-[10px] font-bold text-app-primary hover:underline"
                >
                  Pay Full
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Repayment Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedCustomer.outstanding_balance || selectedCustomer.outstandingDue}
                  required
                  placeholder="₹0"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Payment Method</label>
                <select
                  value={paymentForm.payment_mode}
                  onChange={e => setPaymentForm(p => ({ ...p, payment_mode: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Reference / UTR (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cash Memo"
                  value={paymentForm.reference}
                  onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold bg-emerald-600 hover:bg-emerald-700">
                  Confirm Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. WHATSAPP REMINDER MODAL */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <MessageCircle className="text-emerald-500" size={18} />
                <h3 className="font-bold text-sm text-app-text">WhatsApp Payment Reminder</h3>
              </div>
              <button onClick={() => setShowReminderModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl space-y-1">
                <p className="font-bold text-app-text">Recipient: {reminderData.customer?.name}</p>
                <p className="text-[11px] text-app-text-muted font-mono">Phone: {reminderData.customer?.phone || 'No number'}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Message Preview</label>
                <textarea
                  rows={6}
                  value={reminderData.message}
                  onChange={e => setReminderData(p => ({ ...p, message: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl p-2.5 text-xs text-app-text outline-none focus:border-app-primary resize-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowReminderModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={executeSendWhatsApp}
                  className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  icon={<Send size={13} />}
                >
                  Send via WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. ADD CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Plus className="text-app-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Add New Customer</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-5 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={customerForm.name}
                  onChange={e => setCustomerForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={customerForm.phone}
                    onChange={e => setCustomerForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">City / Town</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={customerForm.city}
                    onChange={e => setCustomerForm(p => ({ ...p, city: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="rahul@example.com"
                  value={customerForm.email}
                  onChange={e => setCustomerForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Full Address (Optional)</label>
                <input
                  type="text"
                  placeholder="Street / Shop Address"
                  value={customerForm.address}
                  onChange={e => setCustomerForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold">
                  Save Customer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. EDIT CUSTOMER MODAL */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Edit3 className="text-app-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Edit Customer Profile</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="p-5 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={e => setEditingCustomer(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingCustomer.phone || ''}
                    onChange={e => setEditingCustomer(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">City</label>
                  <input
                    type="text"
                    value={editingCustomer.city || ''}
                    onChange={e => setEditingCustomer(p => ({ ...p, city: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Email</label>
                <input
                  type="email"
                  value={editingCustomer.email || ''}
                  onChange={e => setEditingCustomer(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold">
                  Update Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
