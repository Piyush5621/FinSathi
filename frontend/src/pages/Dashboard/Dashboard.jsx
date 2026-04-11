import {  useEffect, useState  } from 'react';
import { useNavigate } from "react-router-dom";
import API from "../../services/apiClient";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { 
  Plus, PackagePlus, UserPlus, DollarSign, AlertTriangle, Bell, MessageCircle, Activity, 
  TrendingUp, CheckCircle2, ShoppingBag, Users, Clock, Flame, 
  Target, ArrowRight, Zap, RefreshCw, MinusCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, 
  Tooltip, BarChart, Bar, Cell, PieChart, Pie, AreaChart, Area
} from "recharts";
import toast from "react-hot-toast";

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/dashboard");
      setData(res.data);
    } catch(err) {
      console.error(err);
      toast.error("Error refreshing dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-indigo-900 animate-pulse tracking-tight">Optimizing Business Intelligence...</p>
      </div>
    );
  }

  const { metrics, charts, inventory, recentSales } = data;

  return (
    <div className="space-y-8 animate-fade-in-up pb-12 max-w-[1400px] mx-auto">
      
      {/* 🟢 TOP BAR: PRO HEADER & PROGRESS */}
      <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Enterprise Pulse</h1>
             <Badge className="bg-indigo-600 text-white font-black">PRO</Badge>
          </div>
          <p className="text-slate-500 font-medium mt-1">Hello Admin! Your business is trending <span className="text-emerald-600 font-bold">{metrics.revenueGrowth}% higher</span> than last month.</p>
        </div>

        <div className="flex bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-4 items-center">
           <div className="relative w-16 h-16">
              <svg className="w-full h-full transform -rotate-90">
                 <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100"/>
                 <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" 
                    strokeDasharray={2 * Math.PI * 28} 
                    strokeDashoffset={2 * Math.PI * 28 * (1 - metrics.dailyTargetProgress/100)}
                    className="text-indigo-600 transition-all duration-1000"
                 />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[12px] font-black text-indigo-700">
                 {metrics.dailyTargetProgress}%
              </div>
           </div>
           <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Daily Target</p>
              <p className="font-bold text-slate-800">₹{metrics.todayRevenue.toLocaleString()} <span className="text-[12px] text-slate-400">/ 10k</span></p>
           </div>
        </div>
      </div>

      {/* ⚡ ROW 2: SMART QUICK ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <ActionBtn onClick={() => navigate('/billing')} icon={<Plus />} label="New Bill" color="bg-indigo-600" />
        <ActionBtn onClick={() => navigate('/expenses')} icon={<MinusCircle />} label="Expense" color="bg-rose-500" />
        <ActionBtn onClick={() => navigate('/inventory')} icon={<PackagePlus />} label="Returns" color="bg-slate-700" />
        <ActionBtn onClick={() => navigate('/customers')} icon={<UserPlus />} label="+Customer" color="bg-emerald-600" />
        <ActionBtn onClick={() => navigate('/payments')} icon={<DollarSign />} label="Payments" color="bg-amber-500" />
        <ActionBtn onClick={() => fetchData()} icon={<RefreshCw />} label="Sync" color="bg-slate-400" />
      </div>

      {/* 📊 ROW 3: VITAL METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
           label="Gross Revenue" 
           value={`₹${metrics.revenue.toLocaleString()}`} 
           growth={metrics.revenueGrowth} 
           icon={<DollarSign className="text-indigo-600"/>} 
           sub="MTD Performance"
        />
        <MetricCard 
           label="Average Order" 
           value={`₹${metrics.aov}`} 
           growth={metrics.aovGrowth} 
           icon={<ShoppingBag className="text-orange-500"/>} 
           sub="Value per customer"
        />
        <MetricCard 
           label="Net Profit" 
           value={`₹${metrics.profit.toLocaleString()}`} 
           icon={<TrendingUp className="text-emerald-500"/>} 
           sub="Est. Post-Costs"
        />
        <Card className="border-l-4 border-rose-500 relative overflow-hidden group">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Uncollected Dues</p>
                <h3 className="text-3xl font-black text-rose-600 mt-2">₹{metrics.outstanding.toLocaleString()}</h3>
             </div>
             <div className="p-2 bg-rose-50 text-rose-500 rounded-lg group-hover:scale-110 transition-transform">
                <AlertTriangle size={20} />
             </div>
          </div>
          <Button 
             variant="ghost" 
             size="small" 
             className="w-full mt-4 text-rose-600 hover:bg-rose-50 font-black border border-rose-100"
             onClick={() => navigate('/payments')}
          >
             COLLECT DUES NOW <ArrowRight size={14} className="ml-2" />
          </Button>
        </Card>
      </div>

      {/* 📈 ROW 4: ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Analysis */}
        <Card className="lg:col-span-8 flex flex-col h-[450px]">
          <div className="flex justify-between items-center mb-8">
            <CardTitle className="flex items-center gap-2">
               <Activity className="text-indigo-600" size={20} /> Sales performance
            </CardTitle>
            <div className="flex gap-2">
               <Badge className="bg-slate-100 text-slate-600">This Month</Badge>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={charts.trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} />
                  <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="sales" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={32}>
                     {charts.trend.map((entry, i) => (
                        <Cell key={i} fill={i === charts.trend.length - 1 ? '#4F46E5' : '#C7D2FE'} />
                     ))}
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Expense Split & Forecast */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <Card className="flex-1 flex flex-col">
              <CardTitle className="text-[14px] flex items-center gap-2">
                 <Target className="text-amber-500" size={18} /> Top Expenses
              </CardTitle>
              <div className="flex-1 flex gap-4 items-center">
                 <div className="w-[120px] h-[120px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie data={charts.expenses} innerRadius={40} outerRadius={55} paddingAngle={4} dataKey="value">
                             {charts.expenses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="space-y-2 flex-1">
                    {charts.expenses.map((e, i) => (
                       <div key={i} className="flex justify-between items-center text-[11px] font-bold">
                          <span className="text-slate-500 flex items-center gap-1">
                             <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[i]}} />
                             {e.name}
                          </span>
                          <span className="text-slate-900">₹{e.value.toLocaleString()}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </Card>

           <Card className="bg-indigo-900 border-none text-white relative overflow-hidden h-[180px]">
              <div className="absolute -right-8 -bottom-8 text-indigo-800 pointer-events-none">
                 <Zap size={140} />
              </div>
              <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">7-Day Forecast</p>
                 <h3 className="text-white text-3xl font-black mt-2">₹{charts.forecast.toLocaleString()}</h3>
                 <p className="text-indigo-200 text-[12px] font-medium mt-1">Expected Revenue Projection</p>
                 <div className="h-1 lg:h-2 w-full bg-indigo-800 rounded-full mt-6 overflow-hidden">
                    <div className="h-full bg-white animate-grow-x" style={{width: '70%', transition: 'width 2s'}} />
                 </div>
              </div>
           </Card>
        </div>
      </div>

      {/* 💡 ROW 5: INTELLIGENCE & HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Peak Hours Heatmap */}
        <Card className="lg:col-span-2">
           <CardTitle className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2"><Clock className="text-amber-500" size={20} /> Peak Business Hours</div>
              <Badge className="bg-amber-50 text-amber-700 font-black text-[10px]">HEATMAP</Badge>
           </CardTitle>
           <div className="h-[120px] flex items-end gap-1">
              {charts.peakHours.map((h, i) => (
                 <div key={i} className="flex-1 relative group">
                    <div 
                       className={`w-full rounded-t-sm transition-all duration-500 ${h.count > 0 ? 'bg-indigo-600' : 'bg-slate-100'}`} 
                       style={{height: `${Math.max((h.count / Math.max(...charts.peakHours.map(x=>x.count))) * 100, 5)}%`, opacity: Math.max(h.count/5, 0.1)}} 
                    />
                    <div className="absolute bottom-[-18px] left-0 right-0 text-center text-[8px] font-black text-slate-400 group-hover:text-indigo-600">
                       {i}h
                    </div>
                 </div>
              ))}
           </div>
        </Card>

        {/* AI Insights & Alerts */}
        <div className="flex flex-col gap-6">
           <Card className="bg-white border-l-4 border-indigo-600 shadow-xl shadow-indigo-100/20">
              <div className="flex items-center gap-2 mb-4">
                 <Flame className="text-orange-500" size={18} />
                 <h3 className="font-black text-slate-800 text-[14px] uppercase tracking-tighter">Business Intelligence</h3>
              </div>
              <div className="space-y-4">
                 {inventory.deadStock.length > 0 && (
                   <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                         <AlertTriangle size={16} />
                      </div>
                      <div>
                         <p className="text-[12px] font-black text-slate-800">Dead Stock Detected!</p>
                         <p className="text-[11px] text-slate-500 mt-1">Items like <span className="font-bold underline">{inventory.deadStock[0]}</span> have not sold in 30 days. Consider a discount.</p>
                      </div>
                   </div>
                 )}
                 <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                       <Zap size={16} />
                    </div>
                    <div>
                       <p className="text-[12px] font-black text-slate-800">Retention Score: {metrics.loyaltyRatio}%</p>
                       <p className="text-[11px] text-slate-500 mt-1">A significant {metrics.loyaltyRatio}% of your customers are returning shoppers! Keep up the quality.</p>
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </div>

    </div>
  );
}

function ActionBtn({ onClick, icon, label, color }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
    >
      <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-3`}>
         {icon}
      </div>
      <span className="text-[11px] font-black uppercase text-slate-600 tracking-tight">{label}</span>
    </button>
  );
}

function MetricCard({ label, value, growth, icon, sub }) {
  return (
    <Card className="relative group hover:shadow-2xl transition-all border-none bg-white">
      <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
             {icon}
          </div>
          {growth !== undefined && (
             <Badge variant={growth >= 0 ? 'success' : 'danger'} className="text-[10px] font-black">
                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
             </Badge>
          )}
      </div>
      <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
      <h3 className="text-3xl font-black text-slate-900 mt-2">{value}</h3>
      <p className="text-[10px] font-bold text-slate-400 mt-2 italic">{sub}</p>
    </Card>
  );
}

function ActionCenter() {
  return (
    <div className="w-full xl:w-[400px]">
        {/* Simplified Action center if needed or remove to make space */}
    </div>
  )
}
