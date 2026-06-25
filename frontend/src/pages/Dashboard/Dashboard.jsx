import { useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "../../hooks/useDashboard";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { 
  PackagePlus, UserPlus, DollarSign, 
  TrendingUp, CheckCircle2, Users, 
  ArrowRight, RefreshCw, ShoppingCart, Wallet, 
  FileText, Settings2, HeartPulse, Bot, Bell, Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, 
  Tooltip, BarChart, Bar, Cell, PieChart, Pie, AreaChart, Area
} from "recharts";
import toast from "react-hot-toast";
import Skeleton from "../../components/ui/Skeleton";
import CashFlowWidget from "../../components/Dashboard/CashFlowWidget";
import AnomalyBanner from "../../components/Dashboard/AnomalyBanner";

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useDashboardData();

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Skeleton height="350px" rounded="rounded-[24px]" />
           <Skeleton height="350px" rounded="rounded-[24px]" />
        </div>
      </div>
    );
  }

  const totalExpenses = data.charts.expenses.reduce((sum, item) => sum + item.value, 0);
  const topExpenseCategory = data.charts.expenses[0]?.name || "None";

  return (
    <div className="space-y-8 pb-16 max-w-[1400px] mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Business Overview</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/health-score')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer"
          >
            <HeartPulse size={13} />
            Health Score
          </button>
          <button
            onClick={() => navigate('/founder-dashboard')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-750 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer"
          >
            <Sparkles size={13} className="text-indigo-600" />
            Founder Console
          </button>
          <button
            onClick={() => navigate('/ai-advisor')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all cursor-pointer shadow-sm shadow-indigo-600/25"
          >
            <Bot size={13} />
            AI Advisor
          </button>
          <Button 
            onClick={() => refetch()} 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 border border-slate-100 bg-white"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* SECTION 1: Quick Actions */}
      <section className="space-y-2">
        <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <ActionCard 
            label="POS Terminal" 
            desc="New sale checkout" 
            icon={<ShoppingCart className="text-brand-blue" size={18} />} 
            onClick={() => navigate('/billing')} 
          />
          <ActionCard 
            label="Record Expense" 
            desc="Log store spend" 
            icon={<DollarSign className="text-rose-500" size={18} />} 
            onClick={() => navigate('/expenses')} 
          />
          <ActionCard 
            label="Inventory" 
            desc="Add & restock" 
            icon={<PackagePlus className="text-amber-500" size={18} />} 
            onClick={() => navigate('/inventory')} 
          />
          <ActionCard 
            label="Customers" 
            desc="Buyer ledger" 
            icon={<UserPlus className="text-indigo-500" size={18} />} 
            onClick={() => navigate('/customers')} 
          />
          <ActionCard 
            label="Invoice History" 
            desc="Manage outstanding" 
            icon={<FileText className="text-emerald-500" size={18} />} 
            onClick={() => navigate('/invoice-history')} 
          />
          <ActionCard 
            label="General Tools" 
            desc="GST, alerts, reports" 
            icon={<Settings2 className="text-slate-600" size={18} />} 
            onClick={() => navigate('/general')} 
          />
        </div>
      </section>

      {/* SECTION 2: Vital Metrics Cards */}
      <section className="space-y-2">
        <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Key Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            label="MTD Gross Revenue" 
            value={`₹${data.metrics.revenue.toLocaleString('en-IN')}`} 
            growth={data.metrics.revenueGrowth} 
            icon={<TrendingUp className="text-indigo-600" size={18} />} 
            sub="Inflow from sale invoices" 
          />
          <MetricCard 
            label="Estimated Net Profit" 
            value={`₹${data.metrics.profit.toLocaleString('en-IN')}`} 
            icon={<CheckCircle2 className="text-emerald-600" size={18} />} 
            sub={`Avg Order: ₹${data.metrics.aov}`} 
          />
          <MetricCard 
            label="Total Expenses" 
            value={`₹${totalExpenses.toLocaleString('en-IN')}`} 
            icon={<DollarSign className="text-rose-600" size={18} />} 
            sub={`Top: ${topExpenseCategory}`} 
          />
          <MetricCard 
            label="Outstanding Dues" 
            value={`₹${data.metrics.outstanding.toLocaleString('en-IN')}`} 
            icon={<Wallet className="text-amber-600" size={18} />} 
            sub="Uncollected credit" 
            isWarning={data.metrics.outstanding > 0}
          />
        </div>
      </section>

      {/* SECTION 3: Analytics Charts */}
      <section className="space-y-2">
        <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Analytics & Trends</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-[24px]">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Sales Performance</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Last 10 Days Revenue</p>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg">Live</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.charts.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesTrendColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: '600' }}
                    formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#salesTrendColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Expense Breakdown Chart */}
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-[24px]">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Expense Breakdown</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Distribution of outflows</p>
              </div>
              <span className="text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">Top 5</span>
            </div>
            {data.charts.expenses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-52 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.charts.expenses} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                        {data.charts.expenses.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: '600' }}
                        formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Expense']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {data.charts.expenses.map((item, index) => (
                    <div key={item.name} className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        {item.name}
                      </span>
                      <span className="font-extrabold text-slate-800">₹{item.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
                <DollarSign size={24} className="mb-2 text-slate-300" />
                <span>No expenses recorded for this period.</span>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* SECTION 4: Business Intelligence */}
      <section className="space-y-2">
        <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Operations Intelligence</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Peak Hours */}
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-[24px]">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Peak Billing Hours</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Hourly Transaction Heatmap</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.peakHours} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: '600' }}
                    formatter={(v) => [v, 'Sales']}
                  />
                  <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Loyalty & Dead Stock */}
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-[24px] flex flex-col justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Customer & Inventory Signals</h3>

            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Users size={14} className="text-brand-blue" />
                  Customer Loyalty Ratio
                </span>
                <span className="text-sm font-black text-slate-800">{data.metrics.loyaltyRatio}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-brand-blue rounded-full transition-all" style={{ width: `${data.metrics.loyaltyRatio}%` }} />
              </div>
              <p className="text-[9px] font-semibold text-slate-400 mt-2">
                % of clients purchasing more than once this month.
              </p>
            </div>

            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex-1">
              <h4 className="text-xs font-bold text-slate-600 flex items-center gap-2 mb-3">
                <PackagePlus size={14} className="text-amber-500" />
                Dead Stock (Unsold &gt;30 Days)
              </h4>
              {data.inventory.deadStock && data.inventory.deadStock.length > 0 ? (
                <div className="space-y-1.5">
                  {data.inventory.deadStock.map((name, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100/50 last:border-0">
                      <span className="font-semibold text-slate-700 truncate max-w-[80%]">{name}</span>
                      <Badge variant="warning" className="text-[8px] font-bold py-0.5 px-1.5 uppercase">Dead</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 font-semibold">All products are moving. No dead stock detected.</p>
              )}
            </div>

            <button
              onClick={() => navigate('/health-score')}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer"
            >
              <HeartPulse size={13} />
              View Full Business Health Score
              <ArrowRight size={12} />
            </button>
          </Card>
        </div>
      </section>

      {/* SECTION 5: Alerts & Forecast */}
      <section className="space-y-2">
        <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Alerts & Cash Flow Forecast</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CashFlowWidget />
          <div className="space-y-4">
            <AnomalyBanner />
            {data.inventory.lowStockCount > 0 && (
              <Card className="p-4 bg-amber-50/30 border border-amber-100 rounded-[20px]">
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={14} className="text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-800">Inventory Alert</h3>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  <span className="font-black text-amber-700">{data.inventory.lowStockCount} products</span> are running low on stock.
                </p>
                <button
                  onClick={() => navigate('/inventory')}
                  className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
                >
                  Go to Inventory <ArrowRight size={11} />
                </button>
              </Card>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

function ActionCard({ label, desc, icon, onClick }) {
  return (
    <Card 
      onClick={onClick}
      className="p-4 bg-white border border-slate-100 hover:border-brand-blue/30 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between h-24 cursor-pointer group active:scale-[0.98]"
    >
      <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-brand-blue/5 transition-colors shrink-0 w-max">
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-blue transition-colors leading-tight">{label}</h4>
        <p className="text-[9px] text-slate-400 mt-0.5 truncate leading-none">{desc}</p>
      </div>
    </Card>
  );
}

function MetricCard({ label, value, growth, icon, sub, isWarning = false }) {
  return (
    <Card className={`relative group hover:shadow-md transition-all border ${isWarning ? 'border-amber-100 bg-amber-50/5' : 'border-slate-100/80 bg-white'} p-5 flex flex-col justify-between rounded-[24px]`}>
      <div>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-1.5 ${isWarning ? 'bg-amber-100/30' : 'bg-slate-50'} rounded-lg shrink-0`}>
               {icon}
            </div>
            {growth !== undefined && (
               <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider ${growth >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100/60' : 'bg-rose-50 text-rose-700 border-rose-100/60'}`}>
                  {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
               </span>
            )}
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">{value}</h3>
      </div>
      <p className="text-[9px] font-semibold text-slate-400 mt-3 italic">{sub}</p>
    </Card>
  );
}
