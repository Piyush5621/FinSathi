import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "../../hooks/useDashboard";
import { 
  MetricCard, 
  ActionCard, 
  AlertCard, 
  ActivityCard, 
  SectionCard 
} from "../../components/ui/CardSystem";
import { Card } from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import { 
  ShoppingCart, PackagePlus, UserPlus, TrendingDown,
  TrendingUp, Users, ArrowRight, DollarSign, Wallet, 
  HeartPulse, Activity, AlertCircle, 
  RefreshCw, Clock, ShieldCheck, Store, Calendar,
  Truck, Receipt, BarChart2, Package, Sparkles,
  ChevronRight, AlertTriangle, CheckCircle2, Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, 
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
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-btn px-3.5 py-2 flex items-center gap-3 shrink-0 shadow-xs">
      <div className="flex items-center gap-2">
        <Clock size={15} className="text-indigo-300 animate-pulse shrink-0" />
        <span className="font-mono text-sm sm:text-base font-black text-white tabular-nums tracking-tight">
          {formattedTime}
        </span>
      </div>
      <div className="h-4 w-px bg-white/20 hidden sm:block" />
      <span className="text-[11px] font-semibold text-slate-300 hidden sm:inline-block">
        {formattedDate}
      </span>
    </div>
  );
});

LiveClockWidget.displayName = 'LiveClockWidget';

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeStoreId } = useStore();
  const { data, isLoading, error, refetch } = useDashboardData(activeStoreId);
  
  // Current user context
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const userRole = currentUser.role || 'Owner';
  const isStaff = !!(currentUser.staff_id);
  const isOwnerOrManager = !isStaff || userRole === 'Manager';

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
      toast.error("Error refreshing dashboard data");
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
        revenue: Number(h.revenue || 0),
        orders: Number(h.orders || 0)
      }));
    }
    if (selectedPeriod === '7 Days') {
      return (salesPerformance.trend7Days || []).map(d => ({
        name: d.name,
        revenue: Number(d.revenue ?? d.sales ?? 0),
        orders: Number(d.orders || 0)
      }));
    }
    if (selectedPeriod === '30 Days') {
      return (salesPerformance.trend30Days || []).map(d => ({
        name: d.name,
        revenue: Number(d.revenue ?? d.sales ?? 0),
        orders: Number(d.orders || 0)
      }));
    }
    if (selectedPeriod === '12 Months') {
      return (salesPerformance.trend12Months || []).map(m => ({
        name: m.name,
        revenue: Number(m.revenue ?? m.sales ?? 0),
        orders: Number(m.orders || 0)
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

  // Error state with non-destructive retry
  if (error && !data) {
    return (
      <div className="space-y-6 pb-20 max-w-[1400px] mx-auto">
        <div className="p-8 rounded-panel border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-4 shadow-card">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-app-text">Unable to load dashboard data</h2>
            <p className="text-small text-app-text-secondary mt-1">
              There was an issue communicating with the server. Your data is safe. Click below to retry.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 bg-app-primary hover:bg-app-primary-hover text-white font-bold text-small rounded-btn transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw size={15} /> Retry Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Loading Skeleton matching the streamlined layout
  if (isLoading || !data) {
    return (
      <div className="space-y-6 pb-20 max-w-[1400px] mx-auto animate-fade-in">
        {/* Skeleton Top Header */}
        <div className="bg-app-surface border border-app-border rounded-panel p-5 sm:p-6 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <Skeleton height="22px" width="80px" rounded="rounded-control" />
              <Skeleton height="22px" width="140px" rounded="rounded-control" />
            </div>
            <Skeleton height="32px" width="280px" />
            <Skeleton height="16px" width="240px" />
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <Skeleton height="40px" width="160px" rounded="rounded-btn" />
            <Skeleton height="40px" width="140px" rounded="rounded-btn" />
            <Skeleton height="40px" width="40px" rounded="rounded-btn" />
          </div>
        </div>

        {/* Skeleton Unified 4-Pillar Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height="130px" rounded="rounded-panel" />
          ))}
        </div>

        {/* Skeleton Sales Trend & Health Pairing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <Skeleton height="370px" rounded="rounded-panel" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton height="370px" rounded="rounded-panel" />
          </div>
        </div>

        {/* Skeleton Alerts & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <Skeleton height="220px" rounded="rounded-panel" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton height="220px" rounded="rounded-panel" />
          </div>
        </div>

        {/* Skeleton Activity & Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <Skeleton height="340px" rounded="rounded-panel" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton height="340px" rounded="rounded-panel" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto animate-fade-in">
      
      {/* ========================================================================= */}
      {/* 🟢 1. STORE CONTEXT & COMMAND HEADER                                      */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 rounded-panel p-5 sm:p-6 text-white shadow-elevated relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Store Context & Page Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-control text-[11px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/15 backdrop-blur-sm">
                <ShieldCheck size={13} className="text-emerald-400 shrink-0" /> {userRole}
              </span>
              {currentUser.store_name && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-control text-[11px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/15 backdrop-blur-sm">
                  <Store size={13} className="text-amber-300 shrink-0" /> {currentUser.store_name}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                Dashboard
              </h1>
              <p className="text-xs sm:text-small text-slate-300 font-medium mt-0.5">
                {getGreeting()}, {currentUser.business_name || currentUser.name || 'Merchant'} • Real-time overview of business performance and operations.
              </p>
            </div>
          </div>

          {/* Right Header Controls: Live Clock, Attendance Trigger, Quick POS, Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Business Clock Widget */}
            <LiveClockWidget />

            {/* Staff Attendance Clock-In Trigger */}
            {isStaff && (
              <button
                type="button"
                onClick={handleToggleClock}
                disabled={clockLoading}
                className={`px-3.5 py-2 rounded-btn font-bold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 ${
                  clockedIn 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                    : 'bg-white text-slate-900 hover:bg-slate-100'
                }`}
                title={clockedIn ? 'Click to clock out' : 'Click to clock in'}
              >
                <Clock size={14} />
                {clockLoading ? 'Updating...' : clockedIn ? 'Clocked In (Active)' : 'Clock In Now'}
              </button>
            )}

            {/* Quick Action Button for Owner/Manager */}
            {isOwnerOrManager && (
              <button 
                type="button"
                onClick={() => navigate('/billing')} 
                className="px-4 py-2 bg-app-primary hover:bg-app-primary-hover text-white font-bold text-xs rounded-btn transition-all flex items-center gap-2 shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
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
      {/* 🟢 ROLE-SPECIFIC WORKSPACE: CASHIER                                       */}
      {/* ========================================================================= */}
      {userRole === 'Cashier' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
              <Zap size={14} className="text-app-primary" /> Cashier Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ActionCard label="New POS Bill" description="Create instant invoice" icon={<ShoppingCart size={20} />} onClick={() => navigate('/billing')} />
              <ActionCard label="Invoice History" description="Recent customer bills" icon={<Receipt size={20} />} onClick={() => navigate('/invoice-history')} />
              <ActionCard label="Customer Khata" description="Search & record payments" icon={<Users size={20} />} onClick={() => navigate('/customers')} />
              <ActionCard label="Stock Check" description="Browse item inventory" icon={<Package size={20} />} onClick={() => navigate('/inventory')} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
              <Activity size={14} className="text-app-primary" /> Shift Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard 
                title="Today's Counter Bills" 
                value={snapshot.todayOrders} 
                subtitle={`Processed in ${currentUser.store_name || 'Active Branch'}`} 
                icon={<Receipt size={20} />} 
              />
              <MetricCard 
                title="On Duty Status" 
                value={clockedIn ? 'Present' : 'Not Clocked'} 
                subtitle="Today's attendance log" 
                badge={clockedIn ? 'Active' : 'Pending'} 
                badgeVariant={clockedIn ? 'success' : 'warning'} 
                icon={<Clock size={20} />} 
              />
              <MetricCard 
                title="Terminal Branch" 
                value={currentUser.store_name || 'Main Counter'} 
                subtitle="Ready for fast barcode billing" 
                icon={<Store size={20} />} 
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🟢 ROLE-SPECIFIC WORKSPACE: WAREHOUSE STAFF                               */}
      {/* ========================================================================= */}
      {userRole === 'Warehouse Staff' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
              <Zap size={14} className="text-app-primary" /> Warehouse Operations
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ActionCard label="Inventory Stock" description="Browse all SKUs" icon={<Package size={20} />} onClick={() => navigate('/inventory')} />
              <ActionCard label="Receive Supplier PO" description="Stock intake & batches" icon={<Truck size={20} />} onClick={() => navigate('/suppliers')} />
              <ActionCard label="Low Stock Items" description={`${inventoryHealth.lowStockCount} items below threshold`} icon={<AlertTriangle size={20} />} onClick={() => navigate('/inventory')} />
              <ActionCard label="My Attendance" description="Log daily shift" icon={<Calendar size={20} />} onClick={() => navigate('/staff?tab=attendance')} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
              <Package size={14} className="text-app-primary" /> Inventory Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard 
                title="Catalog Products" 
                value={inventoryHealth.totalProducts} 
                subtitle="Active tracked inventory items" 
                icon={<Package size={20} />} 
              />
              <MetricCard 
                title="Low Stock Alerts" 
                value={inventoryHealth.lowStockCount} 
                subtitle="Items requiring replenishment" 
                badge={inventoryHealth.lowStockCount > 0 ? 'Action Needed' : 'Healthy'} 
                badgeVariant={inventoryHealth.lowStockCount > 0 ? 'danger' : 'success'} 
                icon={<AlertTriangle size={20} />} 
              />
              <MetricCard 
                title="Fulfillment Branch" 
                value={currentUser.store_name || 'Main Warehouse'} 
                subtitle="Active store location" 
                icon={<Store size={20} />} 
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🟢 ROLE-SPECIFIC WORKSPACE: ACCOUNTANT                                    */}
      {/* ========================================================================= */}
      {userRole === 'Accountant' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
              <Zap size={14} className="text-app-primary" /> Accounting Shortcuts
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ActionCard label="Sales Ledger" description="Audit customer invoices" icon={<Receipt size={20} />} onClick={() => navigate('/invoice-history')} />
              <ActionCard label="Record Expense" description="Add voucher or receipt" icon={<TrendingDown size={20} />} onClick={() => navigate('/expenses')} />
              <ActionCard label="GST Reports" description="GSTR-1 & GSTR-3B audit" icon={<BarChart2 size={20} />} onClick={() => navigate('/reports/gst')} />
              <ActionCard label="Customer Khata" description="Receivables reconciliation" icon={<Users size={20} />} onClick={() => navigate('/customers')} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
              <DollarSign size={14} className="text-app-primary" /> Financial Snapshot
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard 
                title="Total Billed Today" 
                value={`₹${Number(snapshot.todaySales || 0).toLocaleString('en-IN')}`} 
                subtitle="Gross invoice revenue logged" 
                icon={<Receipt size={20} />} 
              />
              <MetricCard 
                title="Pending Collections" 
                value={`₹${Number(snapshot.outstandingReceivables || 0).toLocaleString('en-IN')}`} 
                subtitle={`Across ${snapshot.pendingCustomersCount || 0} customer khatas`} 
                badge="Overdue Dues" 
                badgeVariant="danger" 
                icon={<Users size={20} />} 
              />
              <MetricCard 
                title="P&L Summary" 
                value={`₹${Number(snapshot.grossProfit || 0).toLocaleString('en-IN')}`} 
                subtitle={`Estimated Gross Margin: ${snapshot.profitMarginPercent}%`} 
                icon={<DollarSign size={20} />} 
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🟢 OWNER & MANAGER VIEW: UNIFIED EXECUTIVE COMMAND CENTER                 */}
      {/* ========================================================================= */}
      {isOwnerOrManager && (
        <>
          {/* --------------------------------------------------------------------- */}
          {/* 1. UNIFIED EXECUTIVE BUSINESS SNAPSHOT (4-PILLAR COMMAND GRID)        */}
          {/* --------------------------------------------------------------------- */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
                <Activity size={14} className="text-app-primary" /> Executive Snapshot
              </h2>
              <span className="text-micro font-semibold text-app-text-muted">
                Live metrics • Tabular numerals (₹)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pillar 1: Today's Sales */}
              <MetricCard
                title="Today's Sales"
                value={`₹${Number(snapshot.todaySales || 0).toLocaleString('en-IN')}`}
                change={`${snapshot.todaySalesGrowth >= 0 ? '+' : ''}${snapshot.todaySalesGrowth}%`}
                changeType={snapshot.todaySalesGrowth >= 0 ? 'increase' : 'decrease'}
                changePeriod="vs yesterday"
                subtitle={`Est. Profit: ₹${Number(snapshot.grossProfit || 0).toLocaleString('en-IN')}`}
                icon={<ShoppingCart size={20} />}
                iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                onClick={() => navigate('/billing')}
              />

              {/* Pillar 2: Customer Orders & Ticket Value */}
              <MetricCard
                title="Orders & Ticket Size"
                value={`${Number(snapshot.todayOrders || 0).toLocaleString('en-IN')} Orders`}
                change={`${snapshot.todayOrdersGrowth >= 0 ? '+' : ''}${snapshot.todayOrdersGrowth}%`}
                changeType={snapshot.todayOrdersGrowth >= 0 ? 'increase' : 'decrease'}
                changePeriod="vs yesterday"
                subtitle={`Avg Ticket (AOV): ₹${Number(snapshot.todayAov || 0).toLocaleString('en-IN')}`}
                icon={<Receipt size={20} />}
                iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                onClick={() => navigate('/invoice-history')}
              />

              {/* Pillar 3: Net Cash Position & Margin */}
              <MetricCard
                title="Net Cash Position"
                value={`${snapshot.netCashFlow >= 0 ? '+' : ''}₹${Number(Math.abs(snapshot.netCashFlow || 0)).toLocaleString('en-IN')}`}
                badge={snapshot.isCashFlowPositive ? 'Positive' : 'Deficit'}
                badgeVariant={snapshot.isCashFlowPositive ? 'success' : 'danger'}
                subtitle={`Margin: ${snapshot.profitMarginPercent || 25}% • Exp: ₹${Number(snapshot.todayExpenses || 0).toLocaleString('en-IN')}`}
                icon={<Wallet size={20} />}
                iconBg={snapshot.isCashFlowPositive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"}
                onClick={() => navigate('/pnl')}
              />

              {/* Pillar 4: Khata Receivables & Inventory */}
              <MetricCard
                title="Khata Receivables"
                value={`₹${Number(snapshot.outstandingReceivables || 0).toLocaleString('en-IN')}`}
                badge={snapshot.pendingCustomersCount ? `${snapshot.pendingCustomersCount} Khatas` : undefined}
                badgeVariant="warning"
                subtitle={`Stock: ${snapshot.inventoryValueFormatted || '₹0'} (${inventoryHealth.totalProducts || 0} SKUs)`}
                icon={<Users size={20} />}
                iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                onClick={() => navigate('/customers')}
              />
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* 2. SALES PERFORMANCE TREND & BUSINESS HEALTH (PAIRED 7/5 GRID)       */}
          {/* --------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Sales Performance Chart (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <Card className="p-5 sm:p-6 rounded-panel border border-app-border bg-app-surface shadow-card flex flex-col justify-between h-full">
                {/* Chart Header & Period Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-app-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-app-primary-subtle text-app-primary rounded-btn shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <h3 className="text-card-heading font-bold text-app-text tracking-tight">
                        Sales Performance
                      </h3>
                      <p className="text-caption text-app-text-secondary mt-0.5">
                        Gross sales revenue, order volumes & ticket progression
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex p-0.5 bg-app-surface-secondary border border-app-border rounded-btn text-micro font-semibold self-start sm:self-center shadow-xs">
                    {['Today', '7 Days', '30 Days', '12 Months'].map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setSelectedPeriod(period)}
                        className={`px-2.5 py-1 rounded-control transition-all cursor-pointer ${
                          selectedPeriod === period 
                            ? 'bg-app-surface text-app-text font-bold shadow-xs' 
                            : 'text-app-text-secondary hover:text-app-text'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Period Metric Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-app-border/40 text-center sm:text-left">
                  <div>
                    <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider block">Period Revenue</span>
                    <span className="text-sm sm:text-base font-black text-app-text tabular-nums mt-0.5 block">
                      ₹{Number(activePeriodRevenue).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider block">Total Orders</span>
                    <span className="text-sm sm:text-base font-black text-app-text tabular-nums mt-0.5 block">
                      {Number(activePeriodOrders).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider block">Period AOV</span>
                    <span className="text-sm sm:text-base font-black text-app-text tabular-nums mt-0.5 block">
                      ₹{Number(activePeriodAov).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider block">Gross Margin Est.</span>
                    <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5 block">
                      ₹{Number(Math.round(activePeriodRevenue * 0.25)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="pt-4 flex-1 min-h-[220px]">
                  {activeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3157D5" stopOpacity={0.35} />
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
                    <div className="h-[220px] flex items-center justify-center text-small text-app-text-muted font-medium">
                      No sales recorded for this period.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right: Integrated Business Health & Advisory Brief (5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              <Card className="p-5 sm:p-6 rounded-panel border border-app-border bg-app-surface shadow-card flex flex-col justify-between h-full space-y-4">
                <div>
                  {/* Top Bar: Title & Score Badge */}
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
                      {health.riskLevel || 'Healthy'} ({health.score || 82}/100)
                    </span>
                  </div>

                  {/* 4 Health Dimension Progress Indicators */}
                  <div className="space-y-2.5 my-4">
                    <div className="flex justify-between items-center text-small">
                      <span className="flex items-center gap-2 text-app-text-secondary">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        Sales Momentum
                      </span>
                      <span className="font-bold text-app-text">Strong</span>
                    </div>

                    <div className="flex justify-between items-center text-small">
                      <span className="flex items-center gap-2 text-app-text-secondary">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        Cash Flow Solvency
                      </span>
                      <span className="font-bold text-app-text">Good</span>
                    </div>

                    <div className="flex justify-between items-center text-small">
                      <span className="flex items-center gap-2 text-app-text-secondary">
                        <span className={`w-2 h-2 rounded-full ${inventoryHealth.lowStockCount > 5 ? 'bg-amber-500' : 'bg-emerald-500'} shrink-0`} />
                        Inventory Turnover
                      </span>
                      <span className="font-bold text-app-text">
                        {inventoryHealth.lowStockCount > 5 ? 'Needs Attention' : 'Healthy'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-small">
                      <span className="flex items-center gap-2 text-app-text-secondary">
                        <span className={`w-2 h-2 rounded-full ${snapshot.outstandingReceivables > 10000 ? 'bg-amber-500' : 'bg-emerald-500'} shrink-0`} />
                        Khata Collections
                      </span>
                      <span className="font-bold text-app-text">
                        {snapshot.outstandingReceivables > 10000 ? 'Needs Attention' : 'Healthy'}
                      </span>
                    </div>
                  </div>

                  {/* Integrated AI Strategic Briefing */}
                  <div className="p-3.5 rounded-panel bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-micro uppercase tracking-wider">
                      <Sparkles size={13} /> AI Advisory Brief
                    </div>
                    <p className="text-caption text-app-text-secondary leading-relaxed">
                      {businessInsight.summary || "Sales and operational metrics are updated in real time. Maintain consistent billing and customer khata follow-ups."}
                    </p>
                  </div>
                </div>

                {/* Audit Deep Link CTA */}
                <button
                  type="button"
                  onClick={() => navigate('/health-score')}
                  className="w-full py-2 px-3 bg-app-surface-secondary hover:bg-app-primary-subtle text-app-text hover:text-app-primary text-xs font-bold rounded-btn transition-colors flex items-center justify-center gap-2 cursor-pointer border border-app-border shrink-0"
                >
                  <span>View Full Business Health Audit</span>
                  <ChevronRight size={14} />
                </button>
              </Card>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* 3. OPERATIONAL ROW: IMPORTANT ALERTS & QUICK ACTIONS (PAIRED 7/5)     */}
          {/* --------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Needs Your Attention (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <SectionCard
                title="Needs Your Attention"
                subtitle="High-signal operational issues, stockouts & overdue collections"
                icon={<AlertCircle size={18} />}
                badge={needsAttention && needsAttention.length > 0 ? `${needsAttention.length} Actionable` : 'Clear'}
                className="h-full flex flex-col justify-between"
              >
                {needsAttention && needsAttention.length > 0 ? (
                  <div className="space-y-3">
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
                ) : (
                  <div className="p-8 text-center rounded-panel bg-app-surface-secondary/30 border border-app-border/40 flex flex-col items-center justify-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h4 className="text-small font-bold text-app-text">All Operational Signals Clear</h4>
                      <p className="text-caption text-app-text-secondary mt-0.5">
                        No inventory stockouts or critical billing anomalies detected today.
                      </p>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Right: Quick Actions Grid (5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              <SectionCard
                title="Quick Actions"
                subtitle="Fast shortcuts for daily operational tasks"
                icon={<Zap size={18} />}
                className="h-full flex flex-col justify-between"
              >
                <div className="grid grid-cols-2 gap-3">
                  <ActionCard 
                    label="New Sale" 
                    description="POS Billing" 
                    icon={<ShoppingCart size={18} />} 
                    onClick={() => navigate('/billing')} 
                  />
                  <ActionCard 
                    label="Add Product" 
                    description="Catalog SKU" 
                    icon={<PackagePlus size={18} />} 
                    onClick={() => navigate('/inventory')} 
                  />
                  <ActionCard 
                    label="Add Customer" 
                    description="Khata Ledger" 
                    icon={<UserPlus size={18} />} 
                    onClick={() => navigate('/customers')} 
                  />
                  <ActionCard 
                    label="Record Expense" 
                    description="Voucher entry" 
                    icon={<TrendingDown size={18} />} 
                    onClick={() => navigate('/expenses')} 
                  />
                  <ActionCard 
                    label="Create PO" 
                    description="Supplier order" 
                    icon={<Truck size={18} />} 
                    onClick={() => navigate('/suppliers')} 
                  />
                  <ActionCard 
                    label="Receive Payment" 
                    description="Customer credit" 
                    icon={<DollarSign size={18} />} 
                    onClick={() => navigate('/customers')} 
                  />
                </div>
              </SectionCard>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* 4. RECENT ACTIVITY & TOP PERFORMERS (PAIRED 7/5 GRID)                 */}
          {/* --------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Recent Business Activity Stream (7 cols) */}
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
                    {recentActivity.slice(0, 5).map((activity) => (
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
                    No recent business activity logged today. Create a sale to begin.
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Right: Top Performers (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <SectionCard
                title="Top Performers"
                subtitle="Highest revenue contributors & active customer accounts"
                icon={<BarChart2 size={18} />}
                headerAction={
                  <div className="inline-flex p-0.5 bg-app-surface-secondary border border-app-border rounded-btn text-micro font-semibold shadow-xs">
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
                        {inventoryHealth.fastMoving.slice(0, 5).map((p, idx) => (
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
                        {customerActivity.topCustomers.slice(0, 5).map((c, idx) => (
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
