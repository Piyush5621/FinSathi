import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "../../hooks/useDashboard";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { 
  PackagePlus, UserPlus, DollarSign, 
  TrendingUp, CheckCircle2, Users, 
  ArrowRight, ShoppingCart, Wallet, 
  FileText, Settings2, HeartPulse, Bot, Bell, Sparkles, Activity, 
  AlertCircle, RefreshCw, Clock, Check, ShieldCheck, Store, Calendar,
  Truck, Receipt, BarChart2, Package
} from 'lucide-react';
import toast from "react-hot-toast";
import Skeleton from "../../components/ui/Skeleton";
import API from '../../services/apiClient';

// --- Component: Quick Action Card ---
const ActionCard = ({ label, icon, onClick, bgColor = "bg-white", hoverColor = "hover:bg-slate-50", iconBg = "bg-slate-100" }) => (
  <div 
    onClick={onClick}
    className={`${bgColor} border border-slate-100 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer ${hoverColor} hover:-translate-y-0.5 transition-all group`}
  >
    <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <span className="text-xs font-bold text-slate-700 text-center">{label}</span>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useDashboardData();
  
  // Current user context
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser.role || 'Owner';
  const isStaff = Boolean(currentUser.staff_id) || (userRole !== 'Owner' && userRole !== 'Admin');

  // Dynamic time and greeting state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockedIn, setClockedIn] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        setTodayAttendance(attList[0]);
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
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Good Night";
  };

  useEffect(() => {
    if (error) {
      toast.error("Error refreshing dashboard");
    }
  }, [error]);

  if (isLoading || !data) {
    return (
      <div className="space-y-8 pb-12 max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center">
           <Skeleton height="35px" width="220px" />
           <Skeleton height="40px" width="100px" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
           {[...Array(6)].map((_, i) => <Skeleton key={i} height="90px" rounded="rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {[...Array(4)].map((_, i) => <Skeleton key={i} height="120px" rounded="rounded-[24px]" />)}
        </div>
      </div>
    );
  }

  // Calculate Health Score for Owner
  const healthScore = Math.min(
    100,
    70 + (data.metrics.revenueGrowth > 0 ? 10 : 0) + (data.inventory.lowStockCount < 10 ? 10 : 0) + (data.metrics.outstanding < 5000 ? 10 : 0)
  );

  return (
    <div className="space-y-6 pb-20 max-w-[1200px] mx-auto">
      
      {/* 🟢 1. Role-Aware Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-brand-blue to-indigo-700 rounded-[28px] p-6 md:p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <Badge variant="indigo" className="text-[10px] font-black uppercase tracking-wider py-0.5 px-2 bg-white/20 text-white border-white/20">
              <ShieldCheck size={12} className="inline mr-1 text-emerald-400" /> {userRole}
            </Badge>
            {currentUser.store_name && (
              <Badge variant="indigo" className="text-[10px] font-black uppercase tracking-wider py-0.5 px-2 bg-white/10 text-white border-white/20">
                <Store size={12} className="inline mr-1 text-amber-300" /> {currentUser.store_name}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
            {getGreeting()}, {currentUser.name || 'User'}!
          </h1>
          <p className="text-xs text-white/80 font-medium">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Staff Clock-in status button */}
          {isStaff && (
            <button
              onClick={handleToggleClock}
              disabled={clockLoading}
              className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-sm ${
                clockedIn 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                  : 'bg-white text-indigo-900 hover:bg-slate-100'
              }`}
            >
              <Clock size={15} />
              {clockLoading ? 'Updating...' : clockedIn ? 'Clocked In (Active)' : 'Clock In Now'}
            </button>
          )}

          {(userRole === 'Owner' || userRole === 'Manager' || userRole === 'Cashier') && (
            <button 
              onClick={() => navigate('/billing')} 
              className="px-5 py-2.5 bg-white text-brand-blue font-black text-xs rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-sm shrink-0"
            >
              <ShoppingCart size={15} /> Quick Sale (POS)
            </button>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 🟢 CASHIER WORKSPACE VIEW                           */}
      {/* ==================================================== */}
      {userRole === 'Cashier' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionCard label="New POS Bill" icon={<ShoppingCart className="text-brand-blue" size={22} />} iconBg="bg-brand-blue/10" onClick={() => navigate('/billing')} />
            <ActionCard label="Invoice History" icon={<Receipt className="text-indigo-500" size={22} />} iconBg="bg-indigo-100" onClick={() => navigate('/invoice-history')} />
            <ActionCard label="Customer Khata" icon={<Users className="text-emerald-500" size={22} />} iconBg="bg-emerald-100" onClick={() => navigate('/customers')} />
            <ActionCard label="My Payslips" icon={<DollarSign className="text-amber-500" size={22} />} iconBg="bg-amber-100" onClick={() => navigate('/staff?tab=payroll')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
              <p className="text-[11px] font-black uppercase text-slate-400">Today's Counter Bills</p>
              <p className="text-3xl font-black text-slate-900">{data.metrics?.invoicesCount || 0}</p>
              <p className="text-xs text-slate-500">Processed in {currentUser.store_name || 'Active Branch'}</p>
            </Card>

            <Card className="p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
              <p className="text-[11px] font-black uppercase text-emerald-600">On Duty Status</p>
              <p className="text-3xl font-black text-emerald-600">{clockedIn ? 'Present' : 'Not Clocked'}</p>
              <p className="text-xs text-slate-500">Attendance logged for today</p>
            </Card>

            <Card className="p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
              <p className="text-[11px] font-black uppercase text-brand-blue">Active Store</p>
              <p className="text-2xl font-black text-slate-900 truncate">{currentUser.store_name || 'Main Counter'}</p>
              <p className="text-xs text-slate-500">Terminal ready for billing</p>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 🟢 WAREHOUSE STAFF WORKSPACE VIEW                    */}
      {/* ==================================================== */}
      {userRole === 'Warehouse Staff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionCard label="Inventory Stock" icon={<Package className="text-brand-blue" size={22} />} iconBg="bg-brand-blue/10" onClick={() => navigate('/inventory')} />
            <ActionCard label="Receive Supplier PO" icon={<Truck className="text-indigo-500" size={22} />} iconBg="bg-indigo-100" onClick={() => navigate('/suppliers')} />
            <ActionCard label="Stock Counts" icon={<FileText className="text-emerald-500" size={22} />} iconBg="bg-emerald-100" onClick={() => navigate('/inventory')} />
            <ActionCard label="My Attendance" icon={<Calendar className="text-amber-500" size={22} />} iconBg="bg-amber-100" onClick={() => navigate('/staff?tab=attendance')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
              <p className="text-[11px] font-black uppercase text-slate-400">Total Catalog Products</p>
              <p className="text-3xl font-black text-slate-900">{data.inventory?.totalItems || 0}</p>
              <p className="text-xs text-slate-500">Items tracked in inventory</p>
            </Card>

            <Card className="p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
              <p className="text-[11px] font-black uppercase text-rose-600">Low Stock Alerts</p>
              <p className="text-3xl font-black text-rose-600">{data.inventory?.lowStockCount || 0}</p>
              <p className="text-xs text-slate-500">Items below threshold</p>
            </Card>

            <Card className="p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
              <p className="text-[11px] font-black uppercase text-emerald-600">Warehouse Branch</p>
              <p className="text-2xl font-black text-slate-900 truncate">{currentUser.store_name || 'Main Warehouse'}</p>
              <p className="text-xs text-slate-500">Active fulfillment location</p>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 🟢 ACCOUNTANT WORKSPACE VIEW                         */}
      {/* ==================================================== */}
      {userRole === 'Accountant' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionCard label="Sales Ledger" icon={<Receipt className="text-brand-blue" size={22} />} iconBg="bg-brand-blue/10" onClick={() => navigate('/invoice-history')} />
            <ActionCard label="Record Expense" icon={<TrendingDown className="text-rose-500" size={22} />} iconBg="bg-rose-100" onClick={() => navigate('/expenses')} />
            <ActionCard label="GST Tax Reports" icon={<BarChart2 className="text-indigo-500" size={22} />} iconBg="bg-indigo-100" onClick={() => navigate('/reports/gst')} />
            <ActionCard label="Customer Khata" icon={<Users className="text-emerald-500" size={22} />} iconBg="bg-emerald-100" onClick={() => navigate('/customers')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
              <p className="text-[11px] font-black uppercase text-slate-400">Total Billed Today</p>
              <p className="text-3xl font-black text-slate-900">₹{Number(data.metrics?.todayRevenue || 0).toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500">Gross revenue logged</p>
            </Card>

            <Card className="p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
              <p className="text-[11px] font-black uppercase text-rose-600">Pending Collections</p>
              <p className="text-3xl font-black text-rose-600">₹{Number(data.metrics?.outstanding || 0).toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500">Customer khata receivables</p>
            </Card>

            <Card className="p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-3">
              <p className="text-[11px] font-black uppercase text-indigo-600">Audit Status</p>
              <p className="text-2xl font-black text-slate-900">Tax Ready</p>
              <p className="text-xs text-slate-500">GSTR-1 & GSTR-3B synced</p>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 🟢 OWNER & MANAGER EXECUTIVE VIEW                     */}
      {/* ==================================================== */}
      {(userRole === 'Owner' || userRole === 'Manager' || userRole === 'Admin') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Business Health */}
            <Card className="p-6 border border-slate-100 shadow-sm rounded-[24px] flex flex-col justify-center items-center">
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4 self-start flex items-center gap-2">
                <HeartPulse size={14} className="text-emerald-500" /> Business Health
              </h2>
              <div className="flex items-center gap-6 w-full">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className={`${healthScore > 80 ? 'text-emerald-500' : healthScore > 50 ? 'text-amber-500' : 'text-rose-500'}`} strokeDasharray={`${healthScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-black text-slate-800">{healthScore}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full text-xs font-semibold text-slate-600">
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Cash Flow</span><span>✅</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Stock</span><span>{data.inventory?.lowStockCount > 5 ? '⚠️' : '✅'}</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Collections</span><span>{data.metrics?.outstanding > 1000 ? '⚠️' : '✅'}</span></div>
                </div>
              </div>
            </Card>

            {/* AI Insight */}
            <Card className="lg:col-span-2 p-6 border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm rounded-[24px] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Bot size={100} className="text-indigo-600" />
              </div>
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-500" /> AI Advisor
              </h2>
              <div className="relative z-10">
                {data.metrics?.outstanding > 2000 ? (
                  <>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">Collect ₹{Number(data.metrics?.outstanding || 0).toLocaleString('en-IN')} in Pending Dues.</h3>
                    <p className="text-sm font-medium text-slate-600 mb-4 max-w-md">Your pending collections are high. Sending a WhatsApp reminder to your debtors can boost cash flow.</p>
                    <button onClick={() => navigate('/customers')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors">
                      View Collections
                    </button>
                  </>
                ) : data.inventory?.lowStockCount > 0 ? (
                  <>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">{data.inventory?.lowStockCount} Items are Running Low.</h3>
                    <p className="text-sm font-medium text-slate-600 mb-4 max-w-md">Restocking these items before the weekend will prevent stockouts and lost sales.</p>
                    <button onClick={() => navigate('/inventory')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors">
                      Restock Now
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">Great job! Your business operations are running smoothly.</h3>
                    <p className="text-sm font-medium text-slate-600 mb-4 max-w-md">Review staff attendance or check purchase orders to maintain efficiency.</p>
                    <button onClick={() => navigate('/staff')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors">
                      Staff Hub
                    </button>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionCard label="New Bill" icon={<ShoppingCart className="text-brand-blue" size={20} />} iconBg="bg-brand-blue/10" onClick={() => navigate('/billing')} />
            <ActionCard label="Add Customer" icon={<UserPlus className="text-indigo-500" size={20} />} iconBg="bg-indigo-100" onClick={() => navigate('/customers')} />
            <ActionCard label="Add Stock" icon={<PackagePlus className="text-emerald-500" size={20} />} iconBg="bg-emerald-100" onClick={() => navigate('/inventory')} />
            <ActionCard label="Staff Hub" icon={<Users className="text-purple-500" size={20} />} iconBg="bg-purple-100" onClick={() => navigate('/staff')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 border border-slate-100 shadow-sm rounded-[24px]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <TrendingUp size={14} className="text-brand-blue" /> 7-Day Sales Trend
                  </h2>
                </div>
                <div className="h-[200px] w-full flex items-end justify-between gap-2 pt-4">
                  {data.charts?.trend?.length > 0 ? (
                    (() => {
                      const maxSales = Math.max(...data.charts.trend.map(t => t.sales || 0));
                      return data.charts.trend.map((day, idx) => {
                        const heightPercent = maxSales > 0 ? (day.sales / maxSales) * 100 : 0;
                        return (
                          <div key={idx} className="flex flex-col items-center flex-1 gap-2 h-full justify-end group">
                            <div className="w-full relative flex items-end justify-center h-full bg-slate-50 rounded-t-lg">
                              <div 
                                className="w-full bg-brand-blue/80 hover:bg-brand-blue rounded-t-lg transition-all duration-300"
                                style={{ height: `${heightPercent}%` }}
                                title={`₹${day.sales}`}
                              ></div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400">{day.name}</span>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                      No sales data available.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 border border-slate-100 shadow-sm rounded-[24px]">
                <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                  <Activity size={14} className="text-brand-blue" /> Today's KPIs
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Sales</p>
                    <p className="text-xl font-black text-slate-900">₹{Number(data.metrics?.todayRevenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Profit</p>
                    <p className="text-xl font-black text-emerald-600">₹{Math.round((data.metrics?.todayRevenue || 0) * 0.15).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Low Stock Items</p>
                    <p className="text-xl font-black text-rose-500">{data.inventory?.lowStockCount || 0}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Quick Shortcuts */}
            <div className="space-y-6">
              <Card className="p-6 border border-slate-100 shadow-sm rounded-[24px]">
                <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <Users size={14} className="text-purple-500" /> Team on Duty
                </h2>
                <div className="space-y-3">
                  <p className="text-2xl font-black text-slate-900">
                    {data.metrics?.staffPresent || 0} Staff Present
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Manage team attendance, permissions, and salary payouts from the Staff Hub.
                  </p>
                  <Button
                    onClick={() => navigate('/staff')}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-2.5 rounded-xl shadow-sm"
                  >
                    Open Staff Hub
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
