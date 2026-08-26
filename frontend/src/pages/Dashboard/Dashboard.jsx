import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "../../hooks/useDashboard";
import { 
  MetricCard, 
  InsightCard, 
  AnalyticsCard, 
  ActionCard, 
  AlertCard, 
  ActivityCard, 
  SectionCard 
} from "../../components/ui/CardSystem";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { 
  ShoppingCart, PackagePlus, UserPlus, TrendingDown,
  TrendingUp, Users, ArrowRight, DollarSign, Wallet, 
  FileText, HeartPulse, Sparkles, Activity, AlertCircle, 
  RefreshCw, Clock, Check, ShieldCheck, Store, Calendar,
  Truck, Receipt, BarChart2, Package, ArrowUpRight, ArrowDownRight,
  ChevronRight, AlertTriangle, CheckCircle2, Search, Zap, Building2, Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import toast from "react-hot-toast";
import API from '../../services/apiClient';

import { useStore } from "../../contexts/StoreContext";

// 🕒 Isolated Live Clock Widget — prevents re-rendering parent Dashboard tree every second
const LiveClockWidget = React.memo(() => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = time.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-btn px-4 py-2.5 flex flex-col justify-center shrink-0 shadow-xs">
      <div className="flex items-center gap-2">
        <Clock size={15} className="text-indigo-300 animate-pulse" />
        <span className="font-mono text-base font-black text-white tabular-nums tracking-tight">
          {formattedTime}
        </span>
      </div>
      <span className="text-[10px] font-semibold text-slate-300 mt-0.5">
        {formattedDate}
      </span>
    </div>
  );
});

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeStoreId } = useStore();
  const { data, isLoading, error, refetch } = useDashboardData(activeStoreId);
  
  // Current user context
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser.role || 'Owner';
  const isStaff = Boolean(currentUser.staff_id) || (userRole !== 'Owner' && userRole !== 'Admin');
  const isOwnerOrManager = userRole === 'Owner' || userRole === 'Manager' || userRole === 'Admin';

  // Staff clock-in state
  const [clockedIn, setClockedIn] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);

  // Sales Analytics period state ('Today', '7 Days', '30 Days', '12 Months')
  const [selectedPeriod, setSelectedPeriod] = useState('7 Days');

  // Top performers active tab ('products' | 'customers')
  const [performersTab, setPerformersTab] = useState('products');

  useEffect(() => {
    if (isStaff) {
      fetchMyAttendance();
    }
  }, [isStaff]);

  const fetchMyAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: attList } = await API.get(`/staff/attendance?date=${today}`);
      if (attList && attList.length > 0) {
        setClockedIn(attList[0].status === 'present');
      }
    } catch (err) {
      console.warn("Could not fetch personal attendance:", err.message);
    }
  };

  const handleToggleClock = async () => {
    setClockLoading(true);
    try {
      const nextStatus = clockedIn ? 'half_day' : 'present';
      await API.post('/staff/attendance', {
        status: nextStatus,
        date: new Date().toISOString().split('T')[0],
        clock_in: new Date().toISOString()
      });
      setClockedIn(!clockedIn);
      toast.success(clockedIn ? 'Clocked out for the day' : 'Clocked in successfully!');
      fetchMyAttendance();
    } catch (err) {
      toast.error('Failed to update attendance');
    } finally {
      setClockLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Good Night";
  };

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error("Error refreshing dashboard");
    }
  }, [error]);

  // Extract master payload data safely (with full defaults)
  const snapshot = useMemo(() => {
    if (!data) {
      return {
        todaySales: 0,
        todaySalesGrowth: 0,
        yesterdaySales: 0,
        todayOrders: 0,
        todayOrdersGrowth: 0,
        todayAov: 0,
        aovGrowth: 0,
        grossProfit: 0,
        profitMarginPercent: 25,
        todayExpenses: 0,
        expenseGrowth: 0,
        netCashFlow: 0,
        isCashFlowPositive: true,
        outstandingReceivables: 0,
        pendingCustomersCount: 0,
        inventoryValueFormatted: '₹0',
        totalProductsCount: 0
      };
    }
    return data.snapshot || {
      todaySales: Number(data.metrics?.todayRevenue || 0),
      todaySalesGrowth: Number(data.metrics?.revenueGrowth || 0),
      yesterdaySales: 0,
      todayOrders: Number(data.metrics?.invoicesCount || data.metrics?.orders || 0),
      todayOrdersGrowth: Number(data.metrics?.orderGrowth || 0),
      todayAov: Number(data.metrics?.aov || 0),
      aovGrowth: Number(data.metrics?.aovGrowth || 0),
      grossProfit: Math.round(Number(data.metrics?.todayRevenue || 0) * 0.25),
      profitMarginPercent: 25,
      todayExpenses: 0,
      expenseGrowth: 0,
      netCashFlow: Number(data.metrics?.todayRevenue || 0),
      isCashFlowPositive: true,
      outstandingReceivables: Number(data.metrics?.outstanding || 0),
      pendingCustomersCount: 0,
      inventoryValueFormatted: '₹0',
      totalProductsCount: Number(data.inventory?.totalItems || 0)
    };
  }, [data]);

  const health = useMemo(() => {
    return data?.health || {
      score: 82,
      riskLevel: 'Healthy',
      components: {
        sales: { score: 85, status: 'Strong' },
        cashFlow: { score: 80, status: 'Good' },
        inventory: { score: 75, status: 'Healthy' },
        collection: { score: 70, status: 'Needs Attention' },
        profile: { score: 90, status: 'Complete' }
      }
    };
  }, [data]);

  const salesPerformance = useMemo(() => {
    return data?.salesPerformance || {
      todayRevenue: snapshot.todaySales,
      todayOrders: snapshot.todayOrders,
      todayAov: snapshot.todayAov,
      todayProfit: snapshot.grossProfit,
      trendToday: [],
      trend7Days: data?.charts?.trend || [],
      trend30Days: [],
      trend12Months: []
    };
  }, [data, snapshot]);

  const moneyFlow = useMemo(() => {
    return data?.moneyFlow || {
      moneyIn: snapshot.todaySales,
      moneyOut: snapshot.todayExpenses,
      net: snapshot.netCashFlow,
      breakdown: {
        salesCollections: snapshot.todaySales,
        customerPayments: 0,
        expenses: snapshot.todayExpenses,
        supplierPurchases: 0
      }
    };
  }, [data, snapshot]);

  const inventoryHealth = useMemo(() => {
    return data?.inventoryHealth || {
      totalProducts: snapshot.totalProductsCount,
      stockValue: snapshot.inventoryValue || 0,
      lowStockCount: Number(data?.inventory?.lowStockCount || 0),
      outOfStockCount: 0,
      fastMoving: [],
      deadStock: data?.inventory?.deadStock || [],
      lowStockItems: []
    };
  }, [data, snapshot]);

  const customerActivity = useMemo(() => {
    return data?.customerActivity || {
      totalCustomers: 0,
      newThisWeek: 0,
      returningCustomers: 0,
      loyaltyRatio: Number(data?.metrics?.loyaltyRatio || 0),
      outstanding: snapshot.outstandingReceivables,
      topCustomers: []
    };
  }, [data, snapshot]);

  const needsAttention = useMemo(() => data?.needsAttention || [], [data]);
  const recentActivity = useMemo(() => data?.recentActivity || [], [data]);
  const businessInsight = useMemo(() => {
    return data?.businessInsight || {
      title: "Business Performance Insight",
      summary: "Sales and operational metrics are updated in real time. Maintain consistent billing and customer khata follow-ups.",
      actionText: "New Sale (POS)",
      actionLink: "/billing"
    };
  }, [data]);

  // Active chart data based on selected period
  const activeChartData = useMemo(() => {
    if (selectedPeriod === 'Today') {
      return (salesPerformance.trendToday || []).map(h => ({
        name: h.hour,
        revenue: h.revenue,
        orders: h.orders
      }));
    }
    if (selectedPeriod === '7 Days') {
      return (salesPerformance.trend7Days || []).map(d => ({
        name: d.name,
        revenue: d.revenue ?? d.sales ?? 0,
        orders: d.orders || 0
      }));
    }
    if (selectedPeriod === '30 Days') {
      return (salesPerformance.trend30Days || []).map(d => ({
        name: d.name,
        revenue: d.revenue ?? d.sales ?? 0,
        orders: d.orders || 0
      }));
    }
    if (selectedPeriod === '12 Months') {
      return (salesPerformance.trend12Months || []).map(m => ({
        name: m.name,
        revenue: m.revenue ?? m.sales ?? 0,
        orders: m.orders || 0
      }));
    }
    return salesPerformance.trend7Days || [];
  }, [selectedPeriod, salesPerformance]);

  const activePeriodRevenue = useMemo(() => {
    return activeChartData.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  }, [activeChartData]);

  const activePeriodOrders = useMemo(() => {
    return activeChartData.reduce((sum, item) => sum + Number(item.orders || 0), 0);
  }, [activeChartData]);

  const activePeriodAov = activePeriodOrders > 0 ? Math.round(activePeriodRevenue / activePeriodOrders) : 0;

  if (isLoading || !data) {
    return (
      <div className="space-y-6 pb-16 max-w-[1400px] mx-auto">
        {/* Skeleton Header */}
        <div className="bg-app-surface border border-app-border rounded-panel p-6 shadow-card flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2">
            <Skeleton height="24px" width="160px" />
            <Skeleton height="32px" width="300px" />
            <Skeleton height="16px" width="220px" />
          </div>
          <div className="flex gap-3 items-center">
            <Skeleton height="40px" width="150px" rounded="rounded-btn" />
            <Skeleton height="40px" width="120px" rounded="rounded-btn" />
          </div>
        </div>

        {/* Skeleton KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} height="130px" rounded="rounded-panel" />
          ))}
        </div>

        {/* Skeleton Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton height="350px" rounded="rounded-panel" />
            <Skeleton height="280px" rounded="rounded-panel" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton height="280px" rounded="rounded-panel" />
            <Skeleton height="350px" rounded="rounded-panel" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto">
      
      {/* ========================================================================= */}
      {/* 🟢 1. BUSINESS HEADER & LIVE CLOCK COMMAND BAR                           */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 rounded-panel p-5 sm:p-6 text-white shadow-elevated relative overflow-hidden">
        {/* Subtle decorative mesh background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Business Title & Welcome */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-control text-[11px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/15 backdrop-blur-sm">
                <ShieldCheck size={13} className="text-emerald-400" /> {userRole}
              </span>
              {currentUser.store_name && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-control text-[11px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/15 backdrop-blur-sm">
                  <Store size={13} className="text-amber-300" /> {currentUser.store_name}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              {getGreeting()}, {currentUser.business_name || currentUser.name || 'Merchant'} 👋
            </h1>

            <p className="text-xs sm:text-small text-slate-300 font-medium">
              Here's what's happening in your business today.
            </p>
          </div>

          {/* Right Header Section: Live Clock & Action Triggers */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Business Clock Widget */}
            <LiveClockWidget />

            {/* Staff Attendance Clock-In Trigger */}
            {isStaff && (
              <button
                type="button"
                onClick={handleToggleClock}
                disabled={clockLoading}
                className={`px-4 py-2.5 rounded-btn font-bold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                  clockedIn 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                    : 'bg-white text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock size={14} />
                {clockLoading ? 'Updating...' : clockedIn ? 'Clocked In (Active)' : 'Clock In Now'}
              </button>
            )}

            {/* Quick Action Button */}
            {isOwnerOrManager && (
              <button 
                type="button"
                onClick={() => navigate('/billing')} 
                className="px-4 py-2.5 bg-app-primary hover:bg-app-primary-hover text-white font-bold text-xs rounded-btn transition-all flex items-center gap-2 shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
              >
                <ShoppingCart size={15} /> + Quick Sale (POS)
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                refetch();
                toast.success("Dashboard data refreshed");
              }}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-btn transition-colors cursor-pointer"
              title="Refresh Dashboard"
              aria-label="Refresh Dashboard"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🟢 CASHIER SPECIALIZED WORKSPACE VIEW                                     */}
      {/* ========================================================================= */}
      {userRole === 'Cashier' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionCard label="New POS Bill" description="Create instant invoice" icon={<ShoppingCart size={20} />} onClick={() => navigate('/billing')} />
            <ActionCard label="Invoice History" description="Recent customer bills" icon={<Receipt size={20} />} onClick={() => navigate('/invoice-history')} />
            <ActionCard label="Customer Khata" description="Search & record payments" icon={<Users size={20} />} onClick={() => navigate('/customers')} />
            <ActionCard label="My Payslips" description="View salary slips" icon={<DollarSign size={20} />} onClick={() => navigate('/staff?tab=payroll')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard title="Today's Counter Bills" value={snapshot.todayOrders} subtitle={`Processed in ${currentUser.store_name || 'Active Branch'}`} icon={<Receipt size={20} />} />
            <MetricCard title="On Duty Status" value={clockedIn ? 'Present' : 'Not Clocked'} subtitle="Today's attendance log" badge={clockedIn ? 'Active' : 'Pending'} badgeVariant={clockedIn ? 'success' : 'warning'} icon={<Clock size={20} />} />
            <MetricCard title="Terminal Branch" value={currentUser.store_name || 'Main Counter'} subtitle="Ready for fast barcode billing" icon={<Store size={20} />} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🟢 WAREHOUSE SPECIALIZED WORKSPACE VIEW                                   */}
      {/* ========================================================================= */}
      {userRole === 'Warehouse Staff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionCard label="Inventory Stock" description="Browse all SKUs" icon={<Package size={20} />} onClick={() => navigate('/inventory')} />
            <ActionCard label="Receive Supplier PO" description="Stock intake & batches" icon={<Truck size={20} />} onClick={() => navigate('/suppliers')} />
            <ActionCard label="Low Stock Items" description={`${inventoryHealth.lowStockCount} items below threshold`} icon={<AlertTriangle size={20} />} onClick={() => navigate('/inventory')} />
            <ActionCard label="My Attendance" description="Log daily shift" icon={<Calendar size={20} />} onClick={() => navigate('/staff?tab=attendance')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard title="Catalog Products" value={inventoryHealth.totalProducts} subtitle="Active tracked inventory items" icon={<Package size={20} />} />
            <MetricCard title="Low Stock Alerts" value={inventoryHealth.lowStockCount} subtitle="Items requiring replenishment" badge={inventoryHealth.lowStockCount > 0 ? 'Action Needed' : 'Healthy'} badgeVariant={inventoryHealth.lowStockCount > 0 ? 'danger' : 'success'} icon={<AlertTriangle size={20} />} />
            <MetricCard title="Fulfillment Branch" value={currentUser.store_name || 'Main Warehouse'} subtitle="Active store location" icon={<Store size={20} />} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🟢 ACCOUNTANT SPECIALIZED WORKSPACE VIEW                                  */}
      {/* ========================================================================= */}
      {userRole === 'Accountant' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionCard label="Sales Ledger" description="Audit customer invoices" icon={<Receipt size={20} />} onClick={() => navigate('/invoice-history')} />
            <ActionCard label="Record Expense" description="Add voucher or receipt" icon={<TrendingDown size={20} />} onClick={() => navigate('/expenses')} />
            <ActionCard label="GST Reports" description="GSTR-1 & GSTR-3B audit" icon={<BarChart2 size={20} />} onClick={() => navigate('/reports/gst')} />
            <ActionCard label="Customer Khata" description="Receivables reconciliation" icon={<Users size={20} />} onClick={() => navigate('/customers')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard title="Total Billed Today" value={`₹${Number(snapshot.todaySales).toLocaleString('en-IN')}`} subtitle="Gross invoice revenue logged" icon={<Receipt size={20} />} />
            <MetricCard title="Pending Collections" value={`₹${Number(snapshot.outstandingReceivables).toLocaleString('en-IN')}`} subtitle={`Across ${snapshot.pendingCustomersCount || 0} customer khatas`} badge="Overdue Dues" badgeVariant="danger" icon={<Users size={20} />} />
            <MetricCard title="P&L Summary" value={`₹${Number(snapshot.grossProfit).toLocaleString('en-IN')}`} subtitle={`Estimated Gross Margin: ${snapshot.profitMarginPercent}%`} icon={<DollarSign size={20} />} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🟢 2. BUSINESS SNAPSHOT (8 PRIMARY KPI CARDS) — OWNER & MANAGER           */}
      {/* ========================================================================= */}
      {isOwnerOrManager && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
                <Activity size={14} className="text-app-primary" /> Business Snapshot
              </h2>
              <span className="text-micro text-app-text-muted">
                Live updates • INR (₹)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Today's Sales */}
              <MetricCard
                title="Today's Sales"
                value={`₹${Number(snapshot.todaySales || 0).toLocaleString('en-IN')}`}
                change={`${snapshot.todaySalesGrowth >= 0 ? '+' : ''}${snapshot.todaySalesGrowth}%`}
                changeType={snapshot.todaySalesGrowth >= 0 ? 'increase' : 'decrease'}
                changePeriod="vs yesterday"
                icon={<ShoppingCart size={20} />}
                iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                onClick={() => navigate('/billing')}
              />

              {/* Card 2: Orders */}
              <MetricCard
                title="Orders"
                value={snapshot.todayOrders || 0}
                change={`${snapshot.todayOrdersGrowth >= 0 ? '+' : ''}${snapshot.todayOrdersGrowth}%`}
                changeType={snapshot.todayOrdersGrowth >= 0 ? 'increase' : 'decrease'}
                changePeriod="vs yesterday"
                icon={<Receipt size={20} />}
                iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                onClick={() => navigate('/invoice-history')}
              />

              {/* Card 3: Average Order Value */}
              <MetricCard
                title="Average Order Value"
                value={`₹${Number(snapshot.todayAov || 0).toLocaleString('en-IN')}`}
                change={`${snapshot.aovGrowth >= 0 ? '+' : ''}${snapshot.aovGrowth}%`}
                changeType={snapshot.aovGrowth >= 0 ? 'increase' : 'decrease'}
                changePeriod="trend"
                icon={<BarChart2 size={20} />}
                iconBg="bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
                onClick={() => navigate('/invoice-history')}
              />

              {/* Card 4: Gross Profit */}
              <MetricCard
                title="Gross Profit"
                value={`₹${Number(snapshot.grossProfit || 0).toLocaleString('en-IN')}`}
                badge={`${snapshot.profitMarginPercent || 0}% Margin`}
                badgeVariant="success"
                subtitle="Today's estimated gross"
                icon={<DollarSign size={20} />}
                iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                onClick={() => navigate('/pnl')}
              />

              {/* Card 5: Expenses */}
              <MetricCard
                title="Expenses"
                value={`₹${Number(snapshot.todayExpenses || 0).toLocaleString('en-IN')}`}
                change={`${snapshot.expenseGrowth >= 0 ? '+' : ''}${snapshot.expenseGrowth}%`}
                changeType={snapshot.expenseGrowth > 0 ? 'decrease' : 'increase'}
                changePeriod="vs yesterday"
                icon={<TrendingDown size={20} />}
                iconBg="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                onClick={() => navigate('/expenses')}
              />

              {/* Card 6: Net Cash Flow */}
              <MetricCard
                title="Net Cash Flow"
                value={`${snapshot.netCashFlow >= 0 ? '+' : ''}₹${Number(Math.abs(snapshot.netCashFlow || 0)).toLocaleString('en-IN')}`}
                badge={snapshot.isCashFlowPositive ? 'Positive' : 'Deficit'}
                badgeVariant={snapshot.isCashFlowPositive ? 'success' : 'danger'}
                subtitle="Inflows minus Outflows"
                icon={<Wallet size={20} />}
                iconBg={snapshot.isCashFlowPositive ? "bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400" : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"}
                onClick={() => navigate('/pnl')}
              />

              {/* Card 7: Outstanding Receivables */}
              <MetricCard
                title="Outstanding Receivables"
                value={`₹${Number(snapshot.outstandingReceivables || 0).toLocaleString('en-IN')}`}
                badge={snapshot.pendingCustomersCount ? `${snapshot.pendingCustomersCount} Customers` : undefined}
                badgeVariant="warning"
                subtitle="Pending khata collections"
                icon={<Users size={20} />}
                iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                onClick={() => navigate('/customers')}
              />

              {/* Card 8: Inventory Value */}
              <MetricCard
                title="Inventory Value"
                value={snapshot.inventoryValueFormatted || `₹${Number(inventoryHealth.stockValue || 0).toLocaleString('en-IN')}`}
                subtitle={`Across ${inventoryHealth.totalProducts || 0} catalog products`}
                icon={<Package size={20} />}
                iconBg="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400"
                onClick={() => navigate('/inventory')}
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 🟢 3. BUSINESS HEALTH & AI INSIGHT DUAL COLUMN                           */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Business Health Card (5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              <Card className="p-5 sm:p-6 rounded-panel border border-app-border bg-app-surface shadow-card flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-app-border/60">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-control">
                        <HeartPulse size={16} />
                      </div>
                      <h3 className="text-card-heading font-bold text-app-text tracking-tight">
                        Business Health
                      </h3>
                    </div>
                    <span className={`text-micro font-bold px-2 py-0.5 rounded-control uppercase tracking-wider border ${
                      health.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' :
                      health.score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {health.riskLevel || 'Healthy'}
                    </span>
                  </div>

                  {/* Score Radial Visual */}
                  <div className="flex items-center gap-5 my-5">
                    <div className="relative w-24 h-24 shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path 
                          className="text-app-surface-secondary" 
                          strokeDasharray="100, 100" 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                          stroke="currentColor" 
                          strokeWidth="3.5" 
                          fill="none" 
                        />
                        <path 
                          className={`${
                            health.score >= 80 ? 'text-emerald-500' : 
                            health.score >= 60 ? 'text-amber-500' : 'text-rose-500'
                          }`} 
                          strokeDasharray={`${health.score || 82}, 100`} 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                          stroke="currentColor" 
                          strokeWidth="3.5" 
                          fill="none" 
                          strokeLinecap="round" 
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-app-text tracking-tight tabular-nums">
                          {health.score || 82}
                        </span>
                        <span className="text-[9px] font-bold text-app-text-muted uppercase">/ 100</span>
                      </div>
                    </div>

                    {/* Breakdown Indicators */}
                    <div className="flex-1 space-y-2 text-micro font-medium">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-app-text-secondary">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          Sales Performance
                        </span>
                        <span className="font-bold text-app-text">Strong</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-app-text-secondary">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          Cash Flow Health
                        </span>
                        <span className="font-bold text-app-text">Good</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-app-text-secondary">
                          <span className={`w-2 h-2 rounded-full ${inventoryHealth.lowStockCount > 5 ? 'bg-amber-500' : 'bg-emerald-500'} shrink-0`} />
                          Inventory Turnover
                        </span>
                        <span className="font-bold text-app-text">
                          {inventoryHealth.lowStockCount > 5 ? 'Needs Attention' : 'Healthy'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-app-text-secondary">
                          <span className={`w-2 h-2 rounded-full ${snapshot.outstandingReceivables > 10000 ? 'bg-amber-500' : 'bg-emerald-500'} shrink-0`} />
                          Customer Receivables
                        </span>
                        <span className="font-bold text-app-text">
                          {snapshot.outstandingReceivables > 10000 ? 'Needs Attention' : 'Healthy'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <button
                  type="button"
                  onClick={() => navigate('/health-score')}
                  className="w-full mt-2 py-2 px-3 bg-app-surface-secondary hover:bg-app-primary-subtle text-app-text hover:text-app-primary text-xs font-bold rounded-btn transition-colors flex items-center justify-center gap-2 cursor-pointer border border-app-border"
                >
                  <span>View Full Business Health Audit</span>
                  <ChevronRight size={14} />
                </button>
              </Card>
            </div>

            {/* AI Advisor / Insight Card (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <InsightCard
                title={businessInsight.title}
                description={businessInsight.summary}
                badge="AI Business Advisor"
                actionText={businessInsight.actionText || "Take Action →"}
                onAction={() => navigate(businessInsight.actionLink || '/billing')}
                variant="indigo"
                className="h-full justify-between"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 🟢 4. SALES PERFORMANCE (ANALYTICS CARD WITH FILTERS & CHART)             */}
          {/* ========================================================================= */}
          <AnalyticsCard
            title="Sales Performance"
            subtitle="Gross sales, customer orders, and average ticket value"
            icon={<TrendingUp size={18} />}
            periods={['Today', '7 Days', '30 Days', '12 Months']}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            metrics={[
              {
                label: `${selectedPeriod} Revenue`,
                value: `₹${Number(activePeriodRevenue).toLocaleString('en-IN')}`,
                isPositive: true
              },
              {
                label: `${selectedPeriod} Orders`,
                value: activePeriodOrders,
                isPositive: true
              },
              {
                label: 'Period AOV',
                value: `₹${Number(activePeriodAov).toLocaleString('en-IN')}`,
                isPositive: true
              },
              {
                label: 'Gross Profit Est.',
                value: `₹${Number(Math.round(activePeriodRevenue * 0.25)).toLocaleString('en-IN')}`,
                isPositive: true
              }
            ]}
          >
            <div className="h-64 w-full">
              {activeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3157D5" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3157D5" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(152, 162, 179, 0.2)" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} 
                      tickLine={false} 
                      axisLine={{ stroke: 'rgba(152, 162, 179, 0.3)' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--surface-app)',
                        borderColor: 'var(--border-app)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3157D5" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#salesGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-small text-app-text-muted font-medium">
                  No sales recorded for this period.
                </div>
              )}
            </div>
          </AnalyticsCard>

          {/* ========================================================================= */}
          {/* 🟢 5. MONEY FLOW & INVENTORY HEALTH DUAL SECTION                          */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Money Flow (6 cols) */}
            <div className="lg:col-span-6 flex flex-col">
              <SectionCard
                title="Money Flow"
                subtitle="Inflow collections vs. Outflow expenses this month"
                icon={<Wallet size={18} />}
                headerAction={
                  <button
                    type="button"
                    onClick={() => navigate('/pnl')}
                    className="text-micro font-bold text-app-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full P&L</span>
                    <ArrowRight size={12} />
                  </button>
                }
              >
                <div className="space-y-4">
                  {/* Top Level Summary Row */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 bg-app-surface-secondary/50 rounded-panel border border-app-border/60">
                    <div>
                      <span className="text-[10px] font-bold text-app-success uppercase tracking-wider block">Money In</span>
                      <span className="text-base sm:text-lg font-black text-app-text tabular-nums mt-0.5 block">
                        ₹{Number(moneyFlow.moneyIn || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-app-danger uppercase tracking-wider block">Money Out</span>
                      <span className="text-base sm:text-lg font-black text-app-text tabular-nums mt-0.5 block">
                        ₹{Number(moneyFlow.moneyOut || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-app-primary uppercase tracking-wider block">Net Balance</span>
                      <span className={`text-base sm:text-lg font-black tabular-nums mt-0.5 block ${
                        moneyFlow.net >= 0 ? 'text-app-success' : 'text-app-danger'
                      }`}>
                        {moneyFlow.net >= 0 ? '+' : ''}₹{Number(moneyFlow.net || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Breakdown Details */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex justify-between items-center text-small">
                      <span className="text-app-text-secondary flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Sales Collections
                      </span>
                      <span className="font-bold text-app-text tabular-nums">
                        ₹{Number(moneyFlow.breakdown?.salesCollections || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-small">
                      <span className="text-app-text-secondary flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500" /> Customer Khata Payments
                      </span>
                      <span className="font-bold text-app-text tabular-nums">
                        ₹{Number(moneyFlow.breakdown?.customerPayments || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-small">
                      <span className="text-app-text-secondary flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Operational Expenses
                      </span>
                      <span className="font-bold text-app-danger tabular-nums">
                        -₹{Number(moneyFlow.breakdown?.expenses || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-small">
                      <span className="text-app-text-secondary flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Supplier Purchase Orders
                      </span>
                      <span className="font-bold text-app-danger tabular-nums">
                        -₹{Number(moneyFlow.breakdown?.supplierPurchases || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Inventory Health (6 cols) */}
            <div className="lg:col-span-6 flex flex-col">
              <SectionCard
                title="Inventory Health"
                subtitle="Stock valuation, low-stock items, and inventory movement"
                icon={<Package size={18} />}
                headerAction={
                  <button
                    type="button"
                    onClick={() => navigate('/inventory')}
                    className="text-micro font-bold text-app-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Review Inventory</span>
                    <ArrowRight size={12} />
                  </button>
                }
              >
                <div className="space-y-4">
                  {/* Inventory Numbers */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-2.5 bg-app-surface-secondary/50 rounded-panel border border-app-border/60">
                      <span className="text-[10px] font-bold text-app-text-muted uppercase block">Total Items</span>
                      <span className="text-base font-black text-app-text tabular-nums mt-0.5 block">
                        {inventoryHealth.totalProducts || 0}
                      </span>
                    </div>
                    <div className="p-2.5 bg-app-surface-secondary/50 rounded-panel border border-app-border/60">
                      <span className="text-[10px] font-bold text-app-text-muted uppercase block">Stock Value</span>
                      <span className="text-base font-black text-app-text tabular-nums mt-0.5 block">
                        {snapshot.inventoryValueFormatted || '₹0'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-panel border border-amber-200/60 dark:border-amber-900/40">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase block">Low Stock</span>
                      <span className="text-base font-black text-amber-700 dark:text-amber-400 tabular-nums mt-0.5 block">
                        {inventoryHealth.lowStockCount || 0}
                      </span>
                    </div>
                    <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-panel border border-rose-200/60 dark:border-rose-900/40">
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase block">Out of Stock</span>
                      <span className="text-base font-black text-rose-700 dark:text-rose-400 tabular-nums mt-0.5 block">
                        {inventoryHealth.outOfStockCount || 0}
                      </span>
                    </div>
                  </div>

                  {/* Low Stock Items Snapshot */}
                  <div>
                    <span className="text-micro font-bold uppercase tracking-wider text-app-text-muted block mb-2">
                      Needs Restocking:
                    </span>
                    {inventoryHealth.lowStockItems && inventoryHealth.lowStockItems.length > 0 ? (
                      <div className="space-y-1.5">
                        {inventoryHealth.lowStockItems.slice(0, 3).map((item) => (
                          <div 
                            key={item.id}
                            onClick={() => navigate('/inventory')}
                            className="p-2 rounded-control bg-app-surface border border-app-border flex items-center justify-between text-caption hover:border-app-primary/30 transition-colors cursor-pointer"
                          >
                            <span className="font-semibold text-app-text truncate">{item.name}</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                              {item.stock} left (Reorder: {item.threshold})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-app-surface-secondary/30 rounded-panel text-center text-micro text-app-text-secondary">
                        🎉 All catalog items are adequately stocked!
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 🟢 6. NEEDS YOUR ATTENTION (ACTIONABLE ALERTS)                            */}
          {/* ========================================================================= */}
          {needsAttention && needsAttention.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-rose-500" /> Needs Your Attention
                </h2>
                <span className="text-micro text-app-text-muted">
                  {needsAttention.length} Actionable {needsAttention.length === 1 ? 'Alert' : 'Alerts'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {needsAttention.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    title={alert.title}
                    description={alert.description}
                    priority={alert.priority}
                    actionLabel={alert.actionLabel}
                    onAction={() => navigate(alert.actionLink)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 🟢 7. QUICK ACTIONS (COMMAND SHORTCUTS)                                   */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" /> Quick Actions
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <ActionCard label="New Sale" description="POS Billing" icon={<ShoppingCart size={18} />} onClick={() => navigate('/billing')} />
              <ActionCard label="Add Product" description="New catalog SKU" icon={<PackagePlus size={18} />} onClick={() => navigate('/inventory')} />
              <ActionCard label="Add Customer" description="New khata ledger" icon={<UserPlus size={18} />} onClick={() => navigate('/customers')} />
              <ActionCard label="Record Expense" description="Add voucher" icon={<TrendingDown size={18} />} onClick={() => navigate('/expenses')} />
              <ActionCard label="Create PO" description="Order from supplier" icon={<Truck size={18} />} onClick={() => navigate('/suppliers')} />
              <ActionCard label="Receive Payment" description="Customer credit" icon={<DollarSign size={18} />} onClick={() => navigate('/payments')} />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 🟢 8. RECENT ACTIVITY STREAM & TOP PERFORMERS DUAL SECTION                */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Recent Activity (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <SectionCard
                title="Recent Business Activity"
                subtitle="Live chronological stream of sales, payments, expenses, and POs"
                icon={<Activity size={18} />}
                headerAction={
                  <button
                    type="button"
                    onClick={() => navigate('/invoice-history')}
                    className="text-micro font-bold text-app-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Ledger</span>
                    <ArrowRight size={12} />
                  </button>
                }
              >
                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-2.5">
                    {recentActivity.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        title={activity.title}
                        subtitle={activity.subtitle}
                        timestamp={activity.timeAgo}
                        amount={activity.amount}
                        amountType={activity.amountType}
                        status={activity.status}
                        badge={activity.type.toUpperCase()}
                        icon={
                          activity.type === 'sale' ? <Receipt size={16} /> :
                          activity.type === 'payment' ? <CheckCircle2 size={16} className="text-emerald-500" /> :
                          activity.type === 'purchase' ? <Truck size={16} className="text-indigo-500" /> :
                          <TrendingDown size={16} className="text-rose-500" />
                        }
                        onClick={() => navigate(activity.link)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-small text-app-text-muted">
                    No recent business activity logged today.
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Top Performers (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <SectionCard
                title="Top Performers"
                subtitle="Highest revenue contributors & active customer accounts"
                icon={<BarChart2 size={18} />}
                headerAction={
                  <div className="inline-flex p-0.5 bg-app-surface-secondary border border-app-border rounded-btn text-micro font-semibold">
                    <button
                      type="button"
                      onClick={() => setPerformersTab('products')}
                      className={`px-2.5 py-1 rounded-control transition-all cursor-pointer ${
                        performersTab === 'products' ? 'bg-app-surface text-app-text font-bold shadow-xs' : 'text-app-text-secondary'
                      }`}
                    >
                      Products
                    </button>
                    <button
                      type="button"
                      onClick={() => setPerformersTab('customers')}
                      className={`px-2.5 py-1 rounded-control transition-all cursor-pointer ${
                        performersTab === 'customers' ? 'bg-app-surface text-app-text font-bold shadow-xs' : 'text-app-text-secondary'
                      }`}
                    >
                      Customers
                    </button>
                  </div>
                }
              >
                {performersTab === 'products' ? (
                  <div>
                    {inventoryHealth.fastMoving && inventoryHealth.fastMoving.length > 0 ? (
                      <div className="space-y-2.5">
                        {inventoryHealth.fastMoving.map((p, idx) => (
                          <div 
                            key={p.id || idx}
                            onClick={() => navigate('/inventory')}
                            className="p-3 rounded-panel border border-app-border bg-app-surface hover:bg-app-surface-secondary/50 transition-all flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-app-surface-secondary text-app-text-secondary font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-small font-semibold text-app-text truncate">{p.name}</p>
                                <p className="text-micro text-app-text-muted">{p.unitsSold} units sold</p>
                              </div>
                            </div>
                            <span className="text-small font-bold text-app-text tabular-nums">
                              ₹{Number(p.revenue || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-small text-app-text-muted">
                        No product sales recorded yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {customerActivity.topCustomers && customerActivity.topCustomers.length > 0 ? (
                      <div className="space-y-2.5">
                        {customerActivity.topCustomers.map((c, idx) => (
                          <div 
                            key={c.id || idx}
                            onClick={() => navigate('/customers')}
                            className="p-3 rounded-panel border border-app-border bg-app-surface hover:bg-app-surface-secondary/50 transition-all flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-app-surface-secondary text-app-text-secondary font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-small font-semibold text-app-text truncate">{c.name}</p>
                                <p className="text-micro text-app-text-muted">{c.totalOrders} purchases</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-small font-bold text-app-text tabular-nums">
                                ₹{Number(c.totalSpent || 0).toLocaleString('en-IN')}
                              </p>
                              {c.outstanding > 0 && (
                                <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                  ₹{Number(c.outstanding).toLocaleString('en-IN')} due
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-small text-app-text-muted">
                        No customer transactions recorded yet.
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
