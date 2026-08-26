import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import { useStore } from "../../contexts/StoreContext";
import { Card, MetricCard, SectionCard } from "../../components/ui";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { 
  TrendingUp, TrendingDown, BarChart2, DollarSign, Package, 
  Users, Download, FileSpreadsheet, RefreshCw, ArrowUpRight, 
  ArrowDownRight, Award, Calendar, Filter, Store, Clock, 
  Receipt, Percent, ShieldCheck, Layers, SlidersHorizontal, 
  Printer, PieChart as PieIcon, Repeat, CheckCircle2, 
  AlertTriangle, Truck, ArrowRight, X, Sparkles, Landmark
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Cell, 
  PieChart, Pie, Legend, LineChart, Line 
} from "recharts";

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

export default function ExecutiveAnalytics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeStore } = useStore();

  // Navigation & Filter State
  const initialTab = searchParams.get('tab') || 'sales';
  const [activeTab, setActiveTab] = useState(initialTab); // 'sales' | 'inventory' | 'customers' | 'suppliers' | 'expenses' | 'pnl' | 'gst'
  const [selectedPeriod, setSelectedPeriod] = useState('30d'); // 'today' | 'yesterday' | '7d' | '30d' | '3m' | '6m' | '12m' | 'fy'
  const [loading, setLoading] = useState(true);

  // Authoritative Datasets (Single Source of Truth)
  const [dashboardData, setDashboardData] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [pnlData, setPnlData] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [gstSummary, setGstSummary] = useState(null);

  const printRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onBeforeGetContent: () => toast.success("Preparing executive report statement..."),
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const shopName = user.business_name || activeStore?.name || "KaroBar MSME Enterprise";

  // Fetch Authoritative Report Data
  const fetchAllReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        dashRes,
        summaryRes,
        trendRes,
        prodRes,
        custRes,
        pnlRes,
        invRes,
        suppRes,
        expRes,
        gstRes
      ] = await Promise.all([
        API.get("/dashboard").catch(() => ({ data: null })),
        API.get("/analytics/sales-summary").catch(() => ({ data: { data: null } })),
        API.get("/analytics/sales-trend").catch(() => ({ data: { data: [] } })),
        API.get("/analytics/top-products?limit=15").catch(() => ({ data: { data: [] } })),
        API.get("/analytics/top-customers?limit=15").catch(() => ({ data: { data: [] } })),
        API.get("/analytics/pnl").catch(() => ({ data: { data: null } })),
        API.get("/catalog/products?limit=500").catch(() => ({ data: { data: [] } })),
        API.get("/suppliers?limit=200").catch(() => ({ data: { data: [] } })),
        API.get("/expenses?limit=500").catch(() => ({ data: [] })),
        API.get("/reports/gst/gstr1?from=2026-04-01&to=2027-03-31").catch(() => ({ data: { data: null } }))
      ]);

      if (dashRes.data) setDashboardData(dashRes.data);
      setSalesSummary(summaryRes.data?.data || summaryRes.data || null);
      setSalesTrend(trendRes.data?.data || (Array.isArray(trendRes.data) ? trendRes.data : []));
      setTopProducts(prodRes.data?.data || []);
      setTopCustomers(custRes.data?.data || []);
      setPnlData(pnlRes.data?.data || null);
      
      const invList = invRes.data?.data || (Array.isArray(invRes.data) ? invRes.data : []);
      setInventoryItems(invList);
      setSuppliers(suppRes.data?.data || []);
      setExpenses(Array.isArray(expRes.data) ? expRes.data : []);
      setGstSummary(gstRes.data?.data || null);
    } catch (err) {
      console.error("Report fetch error:", err);
      toast.error("Failed to load business report datasets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllReportData();
  }, [fetchAllReportData]);

  // Unified Snapshot Metrics (One Source of Truth)
  const stats = useMemo(() => {
    const revenue = Number(pnlData?.revenue || dashboardData?.stats?.todaySales?.total || 0);
    const expensesTotal = Number(pnlData?.expenses || dashboardData?.stats?.monthlyExpenses || 0);
    const cogs = Number(pnlData?.cogs || (revenue * 0.65)); // 65% standard MSME cost base if raw COGS not isolated
    const grossProfit = Math.max(0, revenue - cogs);
    const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : "0.0";
    const netProfit = Number(pnlData?.profit || (revenue - expensesTotal));
    const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : "0.0";

    const totalReceivables = Number(dashboardData?.stats?.pendingKhata || 0);
    const totalPayables = suppliers.reduce((sum, s) => sum + Number(s.outstanding_balance || 0), 0);
    
    // Inventory Valuation
    let inventoryValuation = 0;
    inventoryItems.forEach(item => {
      const stock = (item.inventory_batches || []).reduce((sum, b) => sum + (b.stock || 0), item.stock || 0);
      inventoryValuation += Number(item.sellingPrice || item.price || 0) * stock;
    });

    return {
      revenue,
      expensesTotal,
      cogs,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      totalReceivables,
      totalPayables,
      inventoryValuation
    };
  }, [pnlData, dashboardData, suppliers, inventoryItems]);

  // Inventory Health Breakdown
  const inventoryHealth = useMemo(() => {
    let healthyCount = 0;
    let lowCount = 0;
    let outCount = 0;
    let totalStockUnits = 0;

    inventoryItems.forEach(item => {
      const stock = (item.inventory_batches || []).reduce((sum, b) => sum + (b.stock || 0), item.stock || 0);
      totalStockUnits += stock;
      if (stock === 0) outCount++;
      else if (stock <= 10) lowCount++;
      else healthyCount++;
    });

    return { healthyCount, lowCount, outCount, totalStockUnits, totalItems: inventoryItems.length };
  }, [inventoryItems]);

  // Expense Category Breakdown
  const expenseCategories = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const cat = e.category || "Misc";
      map[cat] = (map[cat] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).map(([name, value], idx) => ({
      name,
      value,
      color: COLORS[idx % COLORS.length]
    }));
  }, [expenses]);

  // Universal CSV Export
  const exportCurrentReportCSV = () => {
    let filename = `karobar_${activeTab}_report_${selectedPeriod}`;
    let headers = [];
    let rows = [];

    if (activeTab === 'sales') {
      headers = ["Product / Item", "Revenue (₹)", "Units Sold"];
      rows = topProducts.map(p => [`"${p.name}"`, p.amount || 0, p.quantity || 0]);
    } else if (activeTab === 'inventory') {
      headers = ["Product Name", "SKU", "Category", "Stock Balance", "Selling Price (₹)", "Valuation (₹)"];
      rows = inventoryItems.map(i => [
        `"${i.name}"`,
        `"${i.sku || ''}"`,
        `"${i.category || 'General'}"`,
        i.stock || 0,
        i.sellingPrice || i.price || 0,
        ((i.sellingPrice || i.price || 0) * (i.stock || 0)).toFixed(2)
      ]);
    } else if (activeTab === 'customers') {
      headers = ["Customer Name", "MTD Total Spend (₹)"];
      rows = topCustomers.map(c => [`"${c.name}"`, c.amount || 0]);
    } else if (activeTab === 'suppliers') {
      headers = ["Supplier Name", "Phone", "GSTIN", "Credit Limit (₹)", "Outstanding Due (₹)"];
      rows = suppliers.map(s => [`"${s.name}"`, `"${s.phone || ''}"`, `"${s.gstin || ''}"`, s.credit_limit || 0, s.outstanding_balance || 0]);
    } else if (activeTab === 'expenses') {
      headers = ["Expense Category", "Total Spend (₹)"];
      rows = expenseCategories.map(e => [`"${e.name}"`, e.value]);
    } else if (activeTab === 'pnl') {
      headers = ["P&L Metric", "Amount (₹)"];
      rows = [
        ["Total Revenue", stats.revenue],
        ["Cost of Goods Sold (COGS)", stats.cogs],
        ["Gross Profit", stats.grossProfit],
        ["Operating Expenses", stats.expensesTotal],
        ["Net Operating Profit", stats.netProfit]
      ];
    } else if (activeTab === 'gst') {
      headers = ["GST Tax Type", "Taxable Value (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "Total Tax (₹)"];
      if (gstSummary?.summary) {
        rows = [
          ["Outward Supplies (GSTR-1)", gstSummary.summary.totalTaxableValue, gstSummary.summary.totalCgst, gstSummary.summary.totalSgst, gstSummary.summary.totalIgst, gstSummary.summary.totalGst]
        ];
      }
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${activeTab.toUpperCase()} report exported to CSV! 📊`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 max-w-[1600px] mx-auto">
      
      {/* 1. OPERATIONAL REPORTS HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-app-surface border border-app-border rounded-panel shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center font-black shadow-md shadow-app-primary/20 shrink-0">
            <BarChart2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-app-text tracking-tight">Reports & Business Analytics Command Center</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-primary/10 text-app-primary">
                <Store size={10} /> {activeStore?.name || "Main Branch"}
              </span>
            </div>
            <p className="text-xs text-app-text-secondary mt-0.5">
              Authoritative single-source-of-truth business intelligence, financial P&L, inventory valuation, and GST audit.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllReportData}
            icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
            className="text-xs"
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrint()}
            icon={<Printer size={14} />}
            className="text-xs"
          >
            Print Statement
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={exportCurrentReportCSV}
            icon={<Download size={14} />}
            className="text-xs font-bold shadow-md shadow-app-primary/20"
          >
            Export Active Report CSV
          </Button>
        </div>
      </div>

      {/* 2. EXECUTIVE REPORT SNAPSHOT (KaroBar Global Card System) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Net Revenue"
          value={`₹${(stats.revenue >= 100000 ? `${(stats.revenue / 100000).toFixed(2)}L` : stats.revenue.toLocaleString('en-IN'))}`}
          subtitle="Topline sales revenue"
          icon={<DollarSign size={18} />}
          iconBg="bg-app-surface-subtle text-app-text-secondary"
        />

        <MetricCard
          title="Gross Profit"
          value={`₹${(stats.grossProfit >= 100000 ? `${(stats.grossProfit / 100000).toFixed(2)}L` : stats.grossProfit.toLocaleString('en-IN'))}`}
          badge={`${stats.grossMargin}%`}
          badgeVariant="success"
          subtitle="Revenue − COGS"
          icon={<Award size={18} />}
          iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        />

        <MetricCard
          title="Operating Expenses"
          value={`₹${(stats.expensesTotal >= 100000 ? `${(stats.expensesTotal / 100000).toFixed(2)}L` : stats.expensesTotal.toLocaleString('en-IN'))}`}
          subtitle="Total operational outflow"
          icon={<TrendingDown size={18} />}
          iconBg="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
        />

        <MetricCard
          title="Net Business Result"
          value={`₹${Math.abs(stats.netProfit).toLocaleString('en-IN')}`}
          badge={stats.netProfit >= 0 ? `${stats.netMargin}% Profit` : "Loss"}
          badgeVariant={stats.netProfit >= 0 ? "success" : "danger"}
          subtitle="Bottom line operating result"
          icon={<TrendingUp size={18} />}
          iconBg={stats.netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}
        />

        <MetricCard
          title="Khata Receivables"
          value={`₹${(stats.totalReceivables >= 100000 ? `${(stats.totalReceivables / 100000).toFixed(2)}L` : stats.totalReceivables.toLocaleString('en-IN'))}`}
          badge={stats.totalReceivables > 0 ? "Due" : "Cleared"}
          badgeVariant={stats.totalReceivables > 0 ? "warning" : "success"}
          subtitle="Unpaid customer debt"
          icon={<Users size={18} />}
          iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
        />

        <MetricCard
          title="Inventory Assets"
          value={`₹${(stats.inventoryValuation >= 100000 ? `${(stats.inventoryValuation / 100000).toFixed(2)}L` : stats.inventoryValuation.toLocaleString('en-IN'))}`}
          subtitle="Physical stock valuation"
          icon={<Package size={18} />}
          iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
        />
      </div>

      {/* 3. SEVEN REPORT PILLARS (NAVIGATION BAR) */}
      <div className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border/60 pb-3">
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'sales', label: 'Sales & Revenue', icon: <TrendingUp size={14} /> },
              { id: 'inventory', label: 'Inventory Valuation', icon: <Package size={14} /> },
              { id: 'customers', label: 'Customers & Receivables', icon: <Users size={14} /> },
              { id: 'suppliers', label: 'Suppliers & Purchases', icon: <Truck size={14} /> },
              { id: 'expenses', label: 'Expenses & Cashflow', icon: <DollarSign size={14} /> },
              { id: 'pnl', label: 'P&L Statement', icon: <Receipt size={14} /> },
              { id: 'gst', label: 'GST Compliance', icon: <FileSpreadsheet size={14} /> }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-app-primary text-white shadow-xs'
                    : 'bg-app-surface-subtle text-app-text-secondary hover:text-app-text'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1 text-xs shrink-0">
            <span className="text-app-text-muted text-[11px] font-semibold hidden md:inline">Period:</span>
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
              <option value="6m">Last 6 Months</option>
              <option value="12m">Last 12 Months</option>
              <option value="fy">Financial Year 2026-27</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE REPORT TAB VIEW */}
      {loading ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel space-y-3">
          <RefreshCw className="animate-spin text-app-primary mx-auto" size={28} />
          <p className="text-xs font-bold text-app-text">Compiling business intelligence report...</p>
        </div>
      ) : activeTab === 'sales' ? (
        /* TAB 1: SALES & REVENUE REPORT */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sales Trend Chart (7 cols) */}
            <div className="lg:col-span-7 p-6 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-app-text">Sales Revenue Trend</h3>
                  <p className="text-xs text-app-text-muted">Chronological performance trajectory</p>
                </div>
                <span className="text-xs font-bold text-emerald-600">Authoritative Ledger</span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend.length > 0 ? salesTrend : (dashboardData?.charts?.trend || [])}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                    <Area type="monotone" dataKey="sales" stroke="#6366F1" strokeWidth={2.5} fill="url(#salesGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sales KPIs (5 cols) */}
            <div className="lg:col-span-5 p-6 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-app-text">Sales Order Breakdown</h3>
                <p className="text-xs text-app-text-muted">Transaction composition</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex justify-between items-center">
                  <span className="text-app-text-secondary font-medium">Gross Revenue:</span>
                  <span className="font-mono font-black text-sm text-app-text">₹{stats.revenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex justify-between items-center">
                  <span className="text-app-text-secondary font-medium">Average Order Value (AOV):</span>
                  <span className="font-mono font-black text-sm text-indigo-600">₹{Math.round(stats.revenue / (topProducts.length || 1)).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex justify-between items-center">
                  <span className="text-app-text-secondary font-medium">Gross Margin %:</span>
                  <span className="font-mono font-black text-sm text-emerald-600">{stats.grossMargin}%</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => navigate('/billing')}
                icon={<ArrowRight size={14} />}
                className="text-xs font-bold"
              >
                Open POS Billing Command Center
              </Button>
            </div>
          </div>

          {/* Top Selling Products Table */}
          <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
            <div className="p-4 bg-app-surface-subtle border-b border-app-border flex justify-between items-center">
              <h3 className="font-bold text-xs text-app-text">Top Selling Products by Revenue</h3>
              <span className="text-[11px] font-mono text-app-text-muted">{topProducts.length} Ranked Items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-center">Units Sold</th>
                    <th className="py-3 px-4 text-right">Revenue Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {topProducts.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-app-surface-subtle/50 transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-bold text-app-text-muted">#{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-app-text">{prod.name}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-app-text">{prod.quantity || 1} pcs</td>
                      <td className="py-3 px-4 text-right font-black font-mono text-emerald-600">₹{Number(prod.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'inventory' ? (
        /* TAB 2: INVENTORY VALUATION & STOCK HEALTH */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-panel text-center">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Healthy Stock Items</span>
              <p className="text-2xl font-black font-mono text-emerald-600 mt-1">{inventoryHealth.healthyCount}</p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-panel text-center">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">Low Stock Threshold</span>
              <p className="text-2xl font-black font-mono text-amber-600 mt-1">{inventoryHealth.lowCount}</p>
            </div>

            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-panel text-center">
              <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">Out of Stock SKU</span>
              <p className="text-2xl font-black font-mono text-rose-600 mt-1">{inventoryHealth.outCount}</p>
            </div>
          </div>

          <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
            <div className="p-4 bg-app-surface-subtle border-b border-app-border flex justify-between items-center">
              <h3 className="font-bold text-xs text-app-text">Catalog Inventory Valuation Breakdown</h3>
              <span className="text-xs font-mono font-bold text-app-primary">
                Total Valuation: ₹{stats.inventoryValuation.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Stock Balance</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Asset Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {inventoryItems.map((item, idx) => {
                    const stock = (item.inventory_batches || []).reduce((sum, b) => sum + (b.stock || 0), item.stock || 0);
                    const val = (item.sellingPrice || item.price || 0) * stock;
                    return (
                      <tr key={idx} className="hover:bg-app-surface-subtle/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-app-text">{item.name}</td>
                        <td className="py-3 px-4 font-mono text-app-text-secondary">{item.sku || '—'}</td>
                        <td className="py-3 px-4 capitalize text-app-text-secondary">{item.category || 'General'}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-app-text">{stock} {item.units || 'pcs'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-app-text">₹{item.sellingPrice || item.price || 0}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">₹{val.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'customers' ? (
        /* TAB 3: CUSTOMERS & RECEIVABLES AGING */
        <div className="space-y-6">
          <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
            <div className="p-4 bg-app-surface-subtle border-b border-app-border flex justify-between items-center">
              <h3 className="font-bold text-xs text-app-text">Top Valuable Clients & Lifetime Value (LTV)</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/customers')}
                icon={<ArrowRight size={13} />}
                className="text-xs"
              >
                Customer Khata Command Center
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4 text-right">Period Purchases</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {topCustomers.map((cust, idx) => (
                    <tr key={idx} className="hover:bg-app-surface-subtle/50 transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-bold text-app-text-muted">#{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-app-text">{cust.name}</td>
                      <td className="py-3 px-4 text-right font-black font-mono text-indigo-600">₹{Number(cust.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'suppliers' ? (
        /* TAB 4: SUPPLIERS & PROCUREMENT */
        <div className="space-y-6">
          <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
            <div className="p-4 bg-app-surface-subtle border-b border-app-border flex justify-between items-center">
              <h3 className="font-bold text-xs text-app-text">Wholesale Vendor Directory & Payables Ledger</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/suppliers')}
                icon={<ArrowRight size={13} />}
                className="text-xs"
              >
                Supplier Hub
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4">Credit Limit</th>
                    <th className="py-3 px-4 text-right">Outstanding Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {suppliers.map((supp, idx) => (
                    <tr key={idx} className="hover:bg-app-surface-subtle/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-app-text">{supp.name}</td>
                      <td className="py-3 px-4 font-mono text-app-text-secondary">{supp.phone || 'N/A'}</td>
                      <td className="py-3 px-4 font-mono text-app-text-secondary">{supp.gstin || '—'}</td>
                      <td className="py-3 px-4 font-mono text-app-text">₹{Number(supp.credit_limit || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-black font-mono text-rose-600">₹{Number(supp.outstanding_balance || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'expenses' ? (
        /* TAB 5: EXPENSES & CASHFLOW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-6 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-app-text">Cost Center Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseCategories} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-app-text">Category Summary</h3>
            <div className="divide-y divide-app-border">
              {expenseCategories.map(c => (
                <div key={c.name} className="py-2.5 flex justify-between text-xs">
                  <span className="font-bold text-app-text flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                  <span className="font-mono font-black text-rose-600">₹{c.value.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'pnl' ? (
        /* TAB 6: P&L STATEMENT */
        <div className="p-8 bg-app-surface border border-app-border rounded-panel shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="border-b border-app-border pb-4 text-center">
            <h2 className="text-lg font-black text-app-text uppercase tracking-wide">Profit & Loss Statement (MSME Model)</h2>
            <p className="text-xs text-app-text-muted mt-0.5">{shopName} • Period: {selectedPeriod.toUpperCase()}</p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Revenue */}
            <div className="p-3 bg-app-surface-subtle rounded-xl flex justify-between items-center font-bold">
              <span className="text-app-text text-sm">1. Gross Sales Revenue</span>
              <span className="font-mono text-sm text-app-text font-black">₹{stats.revenue.toLocaleString('en-IN')}</span>
            </div>

            {/* COGS */}
            <div className="p-3 bg-app-surface-subtle rounded-xl flex justify-between items-center text-app-text-secondary">
              <span>Less: Cost of Goods Sold (COGS)</span>
              <span className="font-mono font-bold text-rose-600">-₹{stats.cogs.toLocaleString('en-IN')}</span>
            </div>

            {/* Gross Profit */}
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex justify-between items-center font-bold">
              <span className="text-emerald-800 dark:text-emerald-300">2. Gross Operating Profit ({stats.grossMargin}%)</span>
              <span className="font-mono text-emerald-600 font-black text-sm">₹{stats.grossProfit.toLocaleString('en-IN')}</span>
            </div>

            {/* Operating Expenses */}
            <div className="p-3 bg-app-surface-subtle rounded-xl flex justify-between items-center text-app-text-secondary">
              <span>Less: Operating Expenses (OpEx)</span>
              <span className="font-mono font-bold text-rose-600">-₹{stats.expensesTotal.toLocaleString('en-IN')}</span>
            </div>

            {/* Net Profit */}
            <div className={`p-4 rounded-xl flex justify-between items-center font-black text-base border ${
              stats.netProfit >= 0 ? "bg-emerald-500/15 border-emerald-500 text-emerald-600" : "bg-rose-500/15 border-rose-500 text-rose-600"
            }`}>
              <span>3. Net Operating Result ({stats.netMargin}%)</span>
              <span className="font-mono">₹{stats.netProfit.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 7: GST COMPLIANCE REPORT */
        <div className="space-y-6">
          {gstSummary?.summary ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-app-surface border border-app-border rounded-panel text-center">
                <span className="text-[10px] font-bold text-app-text-muted uppercase">Taxable Sales Value</span>
                <p className="text-xl font-black font-mono text-app-text mt-1">₹{Number(gstSummary.summary.totalTaxableValue || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="p-4 bg-app-surface border border-app-border rounded-panel text-center">
                <span className="text-[10px] font-bold text-app-text-muted uppercase">CGST (Central Tax)</span>
                <p className="text-xl font-black font-mono text-indigo-600 mt-1">₹{Number(gstSummary.summary.totalCgst || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="p-4 bg-app-surface border border-app-border rounded-panel text-center">
                <span className="text-[10px] font-bold text-app-text-muted uppercase">SGST (State Tax)</span>
                <p className="text-xl font-black font-mono text-indigo-600 mt-1">₹{Number(gstSummary.summary.totalSgst || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="p-4 bg-app-surface border border-app-border rounded-panel text-center">
                <span className="text-[10px] font-bold text-app-text-muted uppercase">Total GST Output Liability</span>
                <p className="text-xl font-black font-mono text-emerald-600 mt-1">₹{Number(gstSummary.summary.totalGst || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel">
              <FileSpreadsheet size={40} className="mx-auto text-app-text-muted mb-2" />
              <h3 className="font-bold text-sm text-app-text">GSTR Audit Engine Ready</h3>
              <p className="text-xs text-app-text-muted mt-1">Export GSTR-1 and GSTR-3B filings directly from the General Hub.</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/general?tab=gst')}
                className="mt-3 text-xs font-bold"
              >
                Open Full GST Compliance Hub
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 5. HIDDEN PRINTABLE FINANCIAL STATEMENT */}
      <div className="hidden">
        <div ref={printRef} className="p-8 font-sans text-slate-900 bg-white min-h-[900px] space-y-6">
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h1 className="text-2xl font-black">{shopName}</h1>
              <p className="text-xs text-slate-500">Business Statement & Executive Audit Report</p>
            </div>
            <div className="text-right">
              <h2 className="text-base font-black text-indigo-600 uppercase">EXECUTIVE SUMMARY</h2>
              <p className="text-xs text-slate-500">Generated: {new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="p-3 border rounded">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Net Sales Revenue</span>
              <p className="text-lg font-black mt-0.5">₹{stats.revenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 border rounded">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Operating Expenses</span>
              <p className="text-lg font-black mt-0.5">₹{stats.expensesTotal.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 border rounded">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Net Operating Profit</span>
              <p className="text-lg font-black text-emerald-600 mt-0.5">₹{stats.netProfit.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <h3 className="font-bold border-b pb-1">Top Selling Items</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-slate-50 text-[10px] font-bold uppercase">
                  <th className="py-1 px-2">#</th>
                  <th className="py-1 px-2">Product Name</th>
                  <th className="py-1 px-2 text-right">Revenue (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topProducts.slice(0, 10).map((p, i) => (
                  <tr key={i}>
                    <td className="py-1.5 px-2 text-slate-400">{i + 1}</td>
                    <td className="py-1.5 px-2 font-bold">{p.name}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-12 flex justify-between text-xs text-slate-400 border-t">
            <div>KaroBar AI Enterprise Financial Engine</div>
            <div>Authorized Signatory: ___________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}
