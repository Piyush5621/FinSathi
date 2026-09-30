import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import API from '../services/apiClient';
import { useStore } from '../contexts/StoreContext';
import { Button } from '../components/ui/Button';
import AddPaymentModal from '../components/AddPaymentModal';
import CustomerEditModal from '../components/CustomerEditModal';
import { 
  Users, Search, Plus, MapPin, PhoneCall, MessageCircle, 
  DollarSign, ArrowRight, UserCheck, CreditCard, RefreshCw, 
  AlertTriangle, ShieldAlert, Sparkles, Filter, List, LayoutGrid, 
  Receipt, Trash2, Edit3, X, Check, Copy, Send, Download, Upload,
  Clock, ArrowUpDown, ChevronRight, Phone, Mail, Building, FileSpreadsheet,
  ArrowUpRight, CheckCircle2, User, Info, ExternalLink
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

  // Forms
  const [customerForm, setCustomerForm] = useState({
    name: '', phone: '', email: '', city: '', address: '', gstin: '', credit_limit: ''
  });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [reminderData, setReminderData] = useState({
    customer: null, message: ''
  });

  const searchInputRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const shopName = user.business_name || activeStore?.name || "KaroBar Retail";

  // Fetch Customers, Global Sales & Payments
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

  // Aggregate Customer Financial Metrics & LTV (Informational metrics only)
  const customerFinancials = useMemo(() => {
    const map = {};
    
    sales.forEach(sale => {
      if (!sale.customer_id) return;
      if (!map[sale.customer_id]) {
        map[sale.customer_id] = { totalPurchases: 0, lastPurchaseDate: null };
      }
      const total = Number(sale.total || 0);
      map[sale.customer_id].totalPurchases += total;

      if (!map[sale.customer_id].lastPurchaseDate || new Date(sale.date || sale.created_at) > new Date(map[sale.customer_id].lastPurchaseDate)) {
        map[sale.customer_id].lastPurchaseDate = sale.date || sale.created_at;
      }
    });

    return map;
  }, [sales]);

  // Snapshot KPI Metrics — strictly authoritative balances
  const stats = useMemo(() => {
    const totalCount = customers.length;
    let totalReceivables = 0;
    let overdueReceivables = 0;
    let customersWithDuesCount = 0;
    let cleanAccountsCount = 0;
    let totalCollections = 0;

    customers.forEach(c => {
      const liveDue = Number(c.outstanding_balance || 0);
      if (liveDue > 0) {
        totalReceivables += liveDue;
        customersWithDuesCount++;
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
  }, [customers, payments]);

  // Follow-Up Candidates (Top 4 clients with pending dues)
  const followUpCandidates = useMemo(() => {
    return customers
      .map(c => ({
        ...c,
        due: Number(c.outstanding_balance || 0)
      }))
      .filter(c => c.due > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, 4);
  }, [customers]);

  // Filtered & Sorted Customer List
  const filteredCustomers = useMemo(() => {
    let result = customers.map(c => {
      const fin = customerFinancials[c.id] || { totalPurchases: 0, lastPurchaseDate: null };
      const outstandingDue = Number(c.outstanding_balance || 0);
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
      const salesList = Array.isArray(salesRes.data)
        ? salesRes.data
        : (Array.isArray(salesRes.data?.sales) ? salesRes.data.sales : []);
      const payList = Array.isArray(payRes.data)
        ? payRes.data
        : (Array.isArray(payRes.data?.data) ? payRes.data.data : []);
      setCustomerSales(salesList);
      setCustomerPayments(payList);
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

  // Open WhatsApp Reminder Generator
  const openWhatsAppReminder = (customer, e) => {
    e?.stopPropagation();
    const due = Number(customer.outstanding_balance !== undefined ? customer.outstanding_balance : (customer.outstandingDue || 0));
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
    <div className="space-y-4 pb-20 max-w-[1680px] mx-auto animate-fadeIn">
      
      {/* 1. OPERATIONAL CUSTOMER & KHATA HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-app-surface border border-app-border rounded-panel shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center font-black shadow-sm shadow-app-primary/25 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-app-text tracking-tight">Customers & Khata Ledger</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-primary/10 text-app-primary">
                <MapPin size={10} /> {activeStore?.name || "Main Store"}
              </span>
            </div>
            <p className="text-xs text-app-text-secondary mt-0.5">
              Customer directory, outstanding credit ledger, automated reminders, and payment collections.
            </p>
          </div>
        </div>

        {/* Consolidated Action Cluster */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center border border-app-border rounded-xl bg-app-surface-subtle p-0.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-app-text-secondary hover:text-app-text hover:bg-app-surface transition-colors cursor-pointer"
              title="Export Customer Directory"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/billing')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-app-surface transition-colors cursor-pointer"
              title="New POS Credit Sale"
            >
              <CreditCard size={13} />
              <span>POS Credit Sale</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            icon={<Plus size={15} />}
            className="text-xs font-bold shadow-sm shadow-app-primary/20"
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Financial Concept Guide Banner: Customer Khata vs Supplier Hub */}
      <div className="p-4 bg-app-surface border border-app-border rounded-panel shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <Info size={18} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs font-bold text-app-text">Customer Khata (Receivables / ग्राहकों से लेना है)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Buyer Dues & Sales
              </span>
            </div>
            <p className="text-xs text-app-text-secondary leading-relaxed">
              Customers are buyers who purchase products from your shop. When you sell goods on credit at <button onClick={() => navigate('/billing')} className="font-semibold text-app-primary underline hover:text-app-primary/80 cursor-pointer">POS Billing</button>, the unpaid balance is automatically tracked here as <strong>Outstanding Khata Due</strong>. Every completed sale creates a permanent tax invoice in <button onClick={() => navigate('/invoices')} className="font-semibold text-app-primary underline hover:text-app-primary/80 cursor-pointer">Invoices History</button>.
            </p>
            <p className="text-[11px] text-app-text-muted">
              Looking for wholesale vendors whom you buy stock from? Manage vendor orders & payables in <button onClick={() => navigate('/suppliers')} className="font-semibold text-indigo-600 dark:text-indigo-400 underline hover:opacity-80 cursor-pointer">Supplier Hub (Payables / सप्लायर को देना है) →</button>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/invoices')}
            icon={<Receipt size={13} />}
            className="text-xs font-semibold"
          >
            Invoices History
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/billing')}
            icon={<CreditCard size={13} />}
            className="text-xs font-bold"
          >
            POS Billing
          </Button>
        </div>
      </div>

      {/* 2. 4-PILLAR CUSTOMER & KHATA SNAPSHOT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Pillar 1: Total Registered Clients */}
        <div className="p-3.5 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary">Registered Clients</span>
            <div className="w-7 h-7 rounded-lg bg-app-surface-subtle text-app-text-secondary flex items-center justify-center">
              <Users size={14} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-app-text font-mono tracking-tight leading-none">
              {stats.totalCount.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-app-text-muted mt-1.5 font-medium">
              <span className="text-emerald-600 font-bold">{stats.cleanAccountsCount} Settled</span>
              <span>•</span>
              <span className="text-rose-600 font-bold">{stats.customersWithDuesCount} With Dues</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Total Outstanding Khata Dues */}
        <div className="p-3.5 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary">Total Receivables</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <DollarSign size={14} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight leading-none">
              ₹{stats.totalReceivables.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-app-text-muted mt-1.5 font-medium">
              <span className="font-bold text-amber-600">₹{stats.overdueReceivables.toLocaleString('en-IN')} Aged Dues</span>
              <span>•</span>
              <span>{stats.customersWithDuesCount} Accounts</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Khata Health Composition */}
        <div className="p-3.5 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary">Khata Health</span>
            <span className="text-xs font-black text-emerald-600 font-mono">{stats.settledPercent}% Cleared</span>
          </div>
          <div>
            {/* Visual Progress Bar */}
            <div className="h-2.5 w-full bg-app-surface-subtle rounded-full overflow-hidden flex shadow-2xs mt-1">
              <div style={{ width: `${stats.settledPercent}%` }} className="bg-emerald-500 transition-all duration-300" title={`Settled: ${stats.settledPercent}%`} />
              <div style={{ width: `${stats.duesPercent}%` }} className="bg-rose-500 transition-all duration-300" title={`Pending Dues: ${stats.duesPercent}%`} />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-app-text-secondary mt-2">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats.cleanAccountsCount} Settled (₹0 Due)
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {stats.customersWithDuesCount} Pending
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 4: Collections & Follow-Up Radar */}
        <div className="p-3.5 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary">Total Collections</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600">
              Recovered
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-emerald-600 font-mono tracking-tight leading-none">
              ₹{stats.totalCollections.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setFilterMode(filterMode === 'dues' ? 'all' : 'dues')}
                className="flex-1 py-1 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-[10px] text-center transition-colors cursor-pointer"
              >
                Filter Clients with Dues
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRIORITY FOLLOW-UP RADAR (Active when clients have outstanding dues) */}
      {followUpCandidates.length > 0 && (
        <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-panel shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="text-rose-600 shrink-0" size={15} />
            <div className="text-xs">
              <span className="font-bold text-app-text">Priority Follow-Up Radar: </span>
              <span className="text-app-text-secondary">Top accounts with highest pending balances:</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {followUpCandidates.map(customer => (
              <div 
                key={customer.id}
                className="inline-flex items-center border border-rose-300 dark:border-rose-900 rounded-lg bg-app-surface text-[11px] font-semibold overflow-hidden shadow-2xs"
              >
                <span className="px-2 py-0.5 text-app-text max-w-[120px] truncate">{customer.name}</span>
                <span className="px-1 text-rose-600 font-bold font-mono">₹{customer.due.toLocaleString('en-IN')}</span>
                <button
                  type="button"
                  onClick={(e) => openWhatsAppReminder(customer, e)}
                  className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold transition-colors cursor-pointer border-l border-rose-200 dark:border-rose-900"
                  title="WhatsApp Reminder"
                >
                  <MessageCircle size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setPaymentForm({ amount: customer.due, payment_mode: 'cash', reference: '', notes: '' });
                    setShowPaymentModal(true);
                  }}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer text-[10px]"
                  title="Collect Repayment"
                >
                  Collect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SEARCH, FILTER & COMMAND BAR */}
      <div className="p-3 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          
          {/* Fast Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={15} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Customer Name, Phone, City, or Email (/ or F2)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Dropdown & Mode Toggles */}
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
                  viewMode === 'table' ? 'bg-app-surface text-app-primary shadow-2xs font-bold' : 'text-app-text-muted hover:text-app-text'
                }`}
                title="Operational Table View"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-app-surface text-app-primary shadow-2xs font-bold' : 'text-app-text-muted hover:text-app-text'
                }`}
                title="Visual Cards Grid"
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
            { id: 'overdue', label: 'Overdue Accounts (>₹3k)' },
            { id: 'settled', label: `Settled (${stats.cleanAccountsCount})` },
            { id: 'high_ltv', label: 'High Value Clients (>₹10k)' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterMode(f.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterMode === f.id
                  ? 'bg-app-primary text-white shadow-2xs'
                  : 'bg-app-surface-subtle text-app-text-secondary hover:text-app-text hover:bg-app-border/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. CUSTOMER DIRECTORY WORKSPACE (TABLE OR GRID) */}
      {loading ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel space-y-3">
          <RefreshCw className="animate-spin text-app-primary mx-auto" size={26} />
          <p className="text-xs font-bold text-app-text">Loading customer accounts & balances...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel">
          <Users size={38} className="mx-auto text-app-text-muted mb-2" />
          <h3 className="font-bold text-sm text-app-text">No customers match your search</h3>
          <p className="text-xs text-app-text-muted mt-1">Try resetting your search query or add a new customer.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                  <th className="py-2.5 px-3.5">Customer Name</th>
                  <th className="py-2.5 px-3.5">Contact Info</th>
                  <th className="py-2.5 px-3.5">Location</th>
                  <th className="py-2.5 px-3.5 text-right">Lifetime Purchases</th>
                  <th className="py-2.5 px-3.5 text-right">Khata Due (Receivable)</th>
                  <th className="py-2.5 px-3.5 text-center">Status</th>
                  <th className="py-2.5 px-3.5 text-center w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredCustomers.map(customer => {
                  const isSettled = customer.outstandingDue === 0;

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => openCustomerLedger(customer)}
                      className="hover:bg-app-surface-subtle/70 transition-colors cursor-pointer select-none"
                    >
                      <td className="py-2.5 px-3.5">
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

                      <td className="py-2.5 px-3.5 text-app-text-secondary">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone size={11} className="text-app-text-muted" /> {customer.phone || 'N/A'}
                        </div>
                        {customer.email && (
                          <div className="text-[10px] text-app-text-muted truncate max-w-[150px]">{customer.email}</div>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-app-text-secondary capitalize text-xs">
                        {customer.city || customer.address || '—'}
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-black font-mono text-app-text">
                        ₹{customer.totalLtv.toLocaleString('en-IN')}
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-black font-mono">
                        <span className={isSettled ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}>
                          ₹{customer.outstandingDue.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isSettled 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900' 
                            : 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900'
                        }`}>
                          {isSettled ? 'Settled' : 'Due Balance'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {!isSettled && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setShowPaymentModal(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors shadow-2xs cursor-pointer"
                                title="Record Repayment"
                              >
                                Pay
                              </button>

                              <button
                                type="button"
                                onClick={(e) => openWhatsAppReminder(customer, e)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                title="Send WhatsApp Reminder"
                              >
                                <MessageCircle size={14} />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => openCustomerLedger(customer)}
                            className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-primary hover:bg-app-surface-subtle transition-colors cursor-pointer"
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
                            className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text hover:bg-app-surface-subtle transition-colors cursor-pointer"
                            title="Edit Profile"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomer(customer.id, e)}
                            className="p-1.5 rounded-lg text-app-text-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredCustomers.map(customer => {
            const isSettled = customer.outstandingDue === 0;

            return (
              <div
                key={customer.id}
                onClick={() => openCustomerLedger(customer)}
                className="p-3.5 bg-app-surface border border-app-border hover:border-app-primary/50 rounded-panel shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group select-none"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${getAvatarColor(customer.name)} text-white flex items-center justify-center font-bold text-xs`}>
                        {customer.name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <span className="text-xs font-bold text-app-text group-hover:text-app-primary transition-colors truncate max-w-[130px]">
                        {customer.name}
                      </span>
                    </div>

                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${
                      isSettled ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-rose-500/10 text-rose-600 border-rose-200'
                    }`}>
                      {isSettled ? 'Settled' : 'Due'}
                    </span>
                  </div>

                  <p className="text-[11px] text-app-text-muted font-mono">{customer.phone || 'No phone recorded'}</p>
                  <p className="text-[10px] text-app-text-secondary capitalize mt-0.5">{customer.city || 'Location N/A'}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-app-border/60 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-app-text-secondary font-medium">Purchases (LTV):</span>
                    <span className="font-mono font-bold text-app-text">₹{customer.totalLtv.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-app-text-secondary font-medium">Khata Due:</span>
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
          <div className="bg-app-surface border-l border-app-border w-full max-w-lg h-full shadow-2xl overflow-y-auto flex flex-col justify-between">
            
            {/* Header */}
            <div>
              <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border bg-app-surface-subtle">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(selectedCustomer.name)} text-white flex items-center justify-center font-black text-sm shadow-2xs`}>
                    {selectedCustomer.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-app-text leading-tight">{selectedCustomer.name}</h2>
                    <span className="text-[11px] font-mono text-app-text-muted">{selectedCustomer.phone || 'No phone'} • {selectedCustomer.city || 'Location N/A'}</span>
                  </div>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1 text-app-text-muted hover:text-app-text cursor-pointer">
                  <X size={17} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 space-y-5">
                
                {/* Balance & Stats Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center shadow-2xs">
                    <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase block">Pending Due</span>
                    <p className="text-base font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                      ₹{Number(selectedCustomer.outstanding_balance || 0).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[9px] text-rose-500/80">लेना है</span>
                  </div>

                  <div className="p-2.5 bg-app-surface-subtle border border-app-border rounded-xl text-center shadow-2xs">
                    <span className="text-[9px] font-bold text-app-text-muted uppercase block">Total Billed</span>
                    <p className="text-base font-black font-mono text-app-text mt-0.5">
                      ₹{Number(selectedCustomer.totalLtv || 0).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[9px] text-app-text-muted">Lifetime Orders</span>
                  </div>

                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center shadow-2xs">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Total Paid</span>
                    <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₹{Math.max(0, (Number(selectedCustomer.totalLtv) || 0) - (Number(selectedCustomer.outstanding_balance) || 0)).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[9px] text-emerald-600/80">Received</span>
                  </div>
                </div>

                {/* Khata Ledger Timeline */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-app-text">Chronological Khata Ledger</h4>
                    <span className="text-[10px] text-app-text-muted font-mono">{customerSales.length} Invoices • {customerPayments.length} Payments</span>
                  </div>

                  {loadingLedger ? (
                    <div className="p-6 text-center text-xs text-app-text-muted">Loading transaction timeline...</div>
                  ) : customerSales.length === 0 && customerPayments.length === 0 ? (
                    <p className="text-xs text-app-text-muted italic">No prior transaction history found.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                      {[
                        ...customerSales.map(s => {
                          const billed = Number(s.total || 0);
                          const paidAtCounter = Number(s.amount_paid || 0);
                          const creditDue = Math.max(0, billed - paidAtCounter);
                          return {
                            type: 'sale',
                            date: s.date || s.created_at,
                            title: `Invoice #${s.invoice_no || (s.id ? String(s.id).slice(0, 8).toUpperCase() : 'Sale')}`,
                            amount: billed,
                            paid: paidAtCounter,
                            creditDue,
                            status: s.payment_status
                          };
                        }),
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
                          <div key={idx} className="p-2.5 bg-app-surface border border-app-border rounded-xl flex justify-between items-center text-xs shadow-2xs">
                            <div>
                              <p className="font-bold text-app-text">{tx.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono text-app-text-muted">
                                  {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                {tx.type === 'sale' && tx.paid > 0 && (
                                  <span className="text-[10px] text-emerald-600 font-medium font-mono">
                                    • Paid: ₹{tx.paid.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {tx.type === 'sale' ? (
                                tx.creditDue > 0 ? (
                                  <div>
                                    <span className="font-mono font-black text-rose-600 block">
                                      +₹{tx.creditDue.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[9px] text-rose-500 font-medium uppercase block">Credit Due</span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                                      ₹{tx.amount.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[9px] text-emerald-600/80 font-medium uppercase block">Paid at Counter (₹0 Due)</span>
                                  </div>
                                )
                              ) : (
                                <div>
                                  <span className="font-mono font-black text-emerald-600 block">
                                    -₹{tx.amount.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[9px] text-emerald-600/80 font-medium uppercase block">Repayment Settled</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="p-4 border-t border-app-border bg-app-surface-subtle flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/customer-invoices/${selectedCustomer.id}`)}
                icon={<Receipt size={14} />}
                className="w-full text-xs font-semibold text-app-primary border-app-primary/30 hover:bg-app-primary-subtle/40 justify-center py-2"
              >
                View Full Invoices Ledger
              </Button>
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => openWhatsAppReminder(selectedCustomer, e)}
                  icon={<MessageCircle size={14} />}
                  className="flex-1 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-500/10 justify-center"
                >
                  WhatsApp
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowPaymentModal(true)}
                  className="flex-1 text-xs font-bold justify-center"
                >
                  💳 Record Repayment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. STANDARDIZED CANONICAL REPAYMENT MODAL */}
      {showPaymentModal && selectedCustomer && (
        <AddPaymentModal
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          customerPhone={selectedCustomer.phone}
          outstandingDue={Number(selectedCustomer.outstanding_balance || 0)}
          onClose={() => setShowPaymentModal(false)}
          onPaymentAdded={async () => {
            await fetchData();
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            if (isDrawerOpen && selectedCustomer) {
              try {
                const refreshed = await API.get(`/customers/${selectedCustomer.id}`);
                if (refreshed.data) setSelectedCustomer(refreshed.data);
              } catch (_) {}
              openCustomerLedger(selectedCustomer);
            }
          }}
        />
      )}

      {/* 8. WHATSAPP REMINDER MODAL */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <MessageCircle className="text-emerald-500" size={17} />
                <h3 className="font-bold text-sm text-app-text">WhatsApp Payment Reminder</h3>
              </div>
              <button onClick={() => setShowReminderModal(false)} className="p-1 text-app-text-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="p-2.5 bg-app-surface-subtle border border-app-border rounded-xl space-y-0.5">
                <p className="font-bold text-app-text">Recipient: {reminderData.customer?.name}</p>
                <p className="text-[11px] text-app-text-muted font-mono">Phone: {reminderData.customer?.phone || 'No number'}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Message Preview</label>
                <textarea
                  rows={5}
                  value={reminderData.message}
                  onChange={e => setReminderData(p => ({ ...p, message: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl p-2 text-xs text-app-text outline-none focus:border-app-primary resize-none font-sans"
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
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Plus className="text-app-primary" size={17} />
                <h3 className="font-bold text-sm text-app-text">Add New Customer</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-app-text-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-4 space-y-3 text-xs">
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

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={customerForm.phone}
                    onChange={e => setCustomerForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary font-mono"
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
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Address (Optional)</label>
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

      {/* 10. STANDARDIZED CANONICAL EDIT CUSTOMER MODAL */}
      {showEditModal && editingCustomer && (
        <CustomerEditModal
          customer={editingCustomer}
          onClose={() => {
            setShowEditModal(false);
            setEditingCustomer(null);
          }}
          onSaved={async (updated) => {
            await fetchData();
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            if (selectedCustomer?.id === editingCustomer.id) {
              setSelectedCustomer(prev => ({ ...prev, ...(updated || {}) }));
            }
            setShowEditModal(false);
            setEditingCustomer(null);
          }}
        />
      )}
    </div>
  );
}
