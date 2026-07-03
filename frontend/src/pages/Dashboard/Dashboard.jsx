import React, { useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "../../hooks/useDashboard";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { 
  PackagePlus, UserPlus, DollarSign, 
  TrendingUp, CheckCircle2, Users, 
  ArrowRight, ShoppingCart, Wallet, 
  FileText, Settings2, HeartPulse, Bot, Bell, Sparkles, Activity, AlertCircle, RefreshCw
} from 'lucide-react';
import toast from "react-hot-toast";
import Skeleton from "../../components/ui/Skeleton";

// Removed Recharts for maximum performance.

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
  
  // Dynamic time and greeting state
  const [currentTime, setCurrentTime] = React.useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 17) return "Good Afternoon!";
    if (hour < 21) return "Good Evening!";
    return "Good Night!";
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

  // Calculate Health Score (mock logic based on real data points)
  const healthScore = Math.min(
    100,
    70 + (data.metrics.revenueGrowth > 0 ? 10 : 0) + (data.inventory.lowStockCount < 10 ? 10 : 0) + (data.metrics.outstanding < 5000 ? 10 : 0)
  );

  return (
    <div className="space-y-6 pb-20 max-w-[1200px] mx-auto">
      
      {/* 1. Hero Section (Keep Existing) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-brand-blue to-indigo-600 rounded-[24px] p-6 text-white shadow-lg shadow-indigo-500/20">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{getGreeting()}</h1>
          <div className="flex items-center gap-3 mt-1.5 opacity-90">
            <p className="text-sm font-medium">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {/* Premium Business Watch */}
           <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-xl shadow-inner">
             <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow-sm shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                <div 
                  className="absolute w-0.5 h-3 bg-white rounded-full bottom-1/2 left-1/2 origin-bottom transition-transform duration-1000 ease-linear"
                  style={{ transform: `translateX(-50%) rotate(${currentTime.getHours() * 30 + currentTime.getMinutes() * 0.5}deg)` }}
                ></div>
                <div 
                  className="absolute w-0.5 h-4 bg-white/80 rounded-full bottom-1/2 left-1/2 origin-bottom transition-transform duration-1000 ease-linear"
                  style={{ transform: `translateX(-50%) rotate(${currentTime.getMinutes() * 6}deg)` }}
                ></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full z-10"></div>
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none mb-1">Local Time</span>
               <div className="flex items-baseline gap-1 leading-none">
                 <span className="text-xl font-black tracking-tight">
                   {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                 </span>
                 <span className="text-xs font-bold text-white/70">
                   {currentTime.toLocaleTimeString('en-IN', { second: '2-digit' })}
                 </span>
               </div>
             </div>
           </div>
           
           <button onClick={() => navigate('/billing')} className="px-5 py-2.5 bg-white text-indigo-700 font-bold text-sm rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-sm shrink-0">
             <ShoppingCart size={16} /> Quick Sale
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Business Health & 3. AI Insight (Top Row) */}
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
              <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Inventory</span><span>{data.inventory.lowStockCount > 5 ? '⚠️' : '✅'}</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Collections</span><span>{data.metrics.outstanding > 1000 ? '⚠️' : '✅'}</span></div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6 border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm rounded-[24px] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Bot size={100} className="text-indigo-600" />
          </div>
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-500" /> AI Insight
          </h2>
          <div className="relative z-10">
            {data.metrics.outstanding > 2000 ? (
              <>
                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">Collect ₹{data.metrics.outstanding.toLocaleString('en-IN')} in Pending Dues.</h3>
                <p className="text-sm font-medium text-slate-600 mb-4 max-w-md">Your pending collections are high. Sending a WhatsApp reminder to your top 3 debtors today can boost cash flow.</p>
                <button onClick={() => navigate('/customers')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors">
                  View Collections
                </button>
              </>
            ) : data.inventory.lowStockCount > 0 ? (
              <>
                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">{data.inventory.lowStockCount} Items are Running Low.</h3>
                <p className="text-sm font-medium text-slate-600 mb-4 max-w-md">Restocking these items before the weekend will prevent stockouts and lost sales.</p>
                <button onClick={() => navigate('/inventory')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors">
                  Restock Now
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">Great job! Your business is stable today.</h3>
                <p className="text-sm font-medium text-slate-600 mb-4 max-w-md">Try adding a new customer or reviewing your expenses to find savings.</p>
                <button onClick={() => navigate('/expenses')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors">
                  Review Expenses
                </button>
              </>
            )}
          </div>
        </Card>

      </div>

      {/* 4. Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ActionCard label="New Bill" icon={<ShoppingCart className="text-brand-blue" size={20} />} iconBg="bg-brand-blue/10" onClick={() => navigate('/billing')} />
        <ActionCard label="Add Customer" icon={<UserPlus className="text-indigo-500" size={20} />} iconBg="bg-indigo-100" onClick={() => navigate('/customers')} />
        <ActionCard label="Add Inventory" icon={<PackagePlus className="text-emerald-500" size={20} />} iconBg="bg-emerald-100" onClick={() => navigate('/inventory')} />
        <ActionCard label="Add Expense" icon={<DollarSign className="text-rose-500" size={20} />} iconBg="bg-rose-100" onClick={() => navigate('/expenses')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: 6. Sales Trend & 7. Business KPIs */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card className="p-6 border border-slate-100 shadow-sm rounded-[24px]">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                 <TrendingUp size={14} className="text-brand-blue" /> 7-Day Sales Trend
               </h2>
             </div>
             <div className="h-[200px] w-full flex items-end justify-between gap-2 pt-4">
               {data.charts.trend?.length > 0 ? (
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
                  <p className="text-xl font-black text-slate-900">₹{data.metrics.todayRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Profit</p>
                  <p className="text-xl font-black text-emerald-600">₹{Math.round(data.metrics.todayRevenue * 0.15).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Orders</p>
                  <p className="text-xl font-black text-slate-900">{data.metrics.orders}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Bill Value</p>
                  <p className="text-xl font-black text-slate-900">₹{data.metrics.aov.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sales Target</p>
                  <p className="text-xl font-black text-slate-900">{data.metrics.dailyTargetProgress}%</p>
                </div>
             </div>
          </Card>

        </div>

        {/* Right Col: 5. Today's Focus & 8. Recent Activity */}
        <div className="space-y-6">
          
          <Card className="p-0 border border-slate-100 shadow-sm rounded-[24px] overflow-hidden">
             <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
               <AlertCircle size={16} className="text-rose-500" />
               <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600">Today's Focus</h2>
             </div>
             
             <div className="divide-y divide-slate-100">
               {data.inventory.lowStockCount > 0 && (
                 <div className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                   <div>
                     <p className="text-sm font-bold text-slate-900">Low Stock Alert</p>
                     <p className="text-xs text-rose-600 font-medium">{data.inventory.lowStockCount} items need restock</p>
                   </div>
                   <button onClick={() => navigate('/inventory')} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200">Restock Now</button>
                 </div>
               )}
               {data.metrics.outstanding > 0 && (
                 <div className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                   <div>
                     <p className="text-sm font-bold text-slate-900">Pending Collections</p>
                     <p className="text-xs text-amber-600 font-medium">₹{data.metrics.outstanding.toLocaleString('en-IN')} overdue</p>
                   </div>
                   <button onClick={() => navigate('/customers')} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200">View Collection</button>
                 </div>
               )}
               {data.inventory.deadStock?.length > 0 && (
                 <div className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                   <div>
                     <p className="text-sm font-bold text-slate-900">Dead Stock</p>
                     <p className="text-xs text-slate-500 font-medium">{data.inventory.deadStock.length} idle items</p>
                   </div>
                   <button onClick={() => navigate('/inventory')} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200">Review Stock</button>
                 </div>
               )}
               <div className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-bold text-slate-900">Sales Target Progress</p>
                    <p className="text-xs font-bold text-brand-blue">{data.metrics.dailyTargetProgress}%</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-1 overflow-hidden">
                    <div className="bg-brand-blue h-2 rounded-full" style={{ width: `${data.metrics.dailyTargetProgress}%` }}></div>
                  </div>
               </div>
             </div>
          </Card>

          <Card className="p-5 border border-slate-100 shadow-sm rounded-[24px]">
             <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
               <RefreshCw size={14} className="text-slate-500" /> Recent Activity
             </h2>
             <div className="space-y-4">
               {data.recentSales?.length > 0 ? (
                 data.recentSales.slice(0, 4).map((sale, idx) => (
                   <div key={idx} className="flex gap-3 items-start">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                     <div>
                       <p className="text-xs font-bold text-slate-800">Invoice #{sale.no} created</p>
                       <p className="text-[10px] text-slate-500 font-medium">₹{sale.total} • {sale.customer}</p>
                     </div>
                   </div>
                 ))
               ) : (
                 <p className="text-xs text-slate-500 text-center py-4">No recent activity.</p>
               )}
             </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
