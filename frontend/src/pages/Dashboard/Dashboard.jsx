import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { 
  Plus, PackagePlus, UserPlus, BarChart2,
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Lightbulb, Bell, MessageCircle, Activity, ArrowRight, CheckCircle2
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  BarChart, Bar, Cell
} from "recharts";
import toast from "react-hot-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: sales } = await supabase.from("sales").select("*, customers(*), sale_items(*, inventory(*))").order('date', {ascending: false});
      const { data: expenses } = await supabase.from("expenses").select("*").order('date', {ascending: false});
      const { data: inventory } = await supabase.from("inventory").select("*").order('id');
      const { data: payments } = await supabase.from("payments").select("*, customers(name)").order('date', {ascending: false});

      const today = new Date();
      today.setHours(0,0,0,0);
      const yesterdayStart = new Date(today);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      // Row 2 Metrics
      let todaySalesAmt = 0;
      let yesterdaySalesAmt = 0;
      (sales || []).forEach(s => {
          const sDate = new Date(s.date);
          if (sDate >= today) todaySalesAmt += Number(s.total);
          else if (sDate >= yesterdayStart && sDate < today) yesterdaySalesAmt += Number(s.total);
      });
      const salesGrowth = yesterdaySalesAmt > 0 ? ((todaySalesAmt - yesterdaySalesAmt)/yesterdaySalesAmt * 100) : 0;

      const pendingPayments = (sales || []).reduce((sum, s) => {
          if (s.payment_status === 'paid') return sum;
          const due = Number(s.total || 0) - Number(s.amount_paid || 0);
          return sum + (due > 0.01 ? due : 0);
      }, 0);

      const lowStockItems = (inventory || []).filter(i => Number(i.quantity || 0) <= Number(i.low_stock_threshold || 5));
      
      const totalRev = (sales || []).reduce((sum, s) => sum + Number(s.total || 0), 0);
      const totalExp = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const profit = totalRev - totalExp;

      // Charts (Trend)
      const trendMap = {};
      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          trendMap[dateStr] = { date: dateStr.split('-').slice(1).join('/'), sales: 0, yesterday: 0 };
      }
      (sales || []).forEach(s => {
          const dStr = s.date?.split('T')[0];
          if (trendMap[dStr]) trendMap[dStr].sales += Number(s.total);
      });
      const trendData = Object.values(trendMap);

      // Top Products
      const productMap = {};
      (sales || []).forEach(s => {
          (s.sale_items || []).forEach(si => {
              const name = si.inventory?.name || 'Unknown';
              productMap[name] = (productMap[name] || 0) + Number(si.quantity);
          });
      });
      const topProducts = Object.entries(productMap)
         .map(([name, qty]) => ({name, quantity: qty}))
         .sort((a,b) => b.quantity - a.quantity)
         .slice(0, 5);

      // Pending Reminders (FIFO logic simplified for Dashboard)
      const pendingReminders = (sales || []).filter(s => s.payment_status !== 'paid').map(s => {
         const due = Number(s.total || 0) - Number(s.amount_paid || 0);
         const daysOverdue = Math.floor((new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24));
         return { id: s.id, customer: s.customers?.name || 'Walk-in', phone: s.customers?.phone, amount: due, daysOverdue };
      }).filter(s => s.amount > 1).slice(0, 4);

      // Activity Feed (Mixed)
      const activity = [
          ...(sales || []).slice(0, 3).map(s => ({ type: 'sale', title: `New Sale to ${s.customers?.name || 'Walk-in'}`, amount: s.total, date: s.date, icon: DollarSign })),
          ...(expenses || []).slice(0, 2).map(e => ({ type: 'expense', title: `Expense: ${e.category}`, amount: e.amount, date: e.date, icon: TrendingDown })),
          ...(payments || []).slice(0, 2).map(p => ({ type: 'payment', title: `Payment from ${p.customers?.name}`, amount: p.amount, date: p.date, icon: Activity }))
      ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

      // Action Center Priority Tasks
      const alerts = [];
      if (pendingReminders.length > 0) alerts.push({ type: 'danger', text: `${pendingReminders.length} payments are overdue.`, action: 'Manage', link: '/payments' });
      if (lowStockItems.length > 0) alerts.push({ type: 'warning', text: `${lowStockItems.length} items are running low.`, action: 'Restock', link: '/inventory' });
      if (todaySalesAmt < yesterdaySalesAmt && todaySalesAmt > 0) alerts.push({ type: 'info', text: `Sales are ${((yesterdaySalesAmt-todaySalesAmt)/yesterdaySalesAmt*100).toFixed(0)}% lower than yesterday.`, action: 'Tips', link: '/pnl' });

      setData({
         todaySalesAmt, salesGrowth, pendingPayments, lowStockCount: lowStockItems.length, profit,
         trendData, topProducts, recentSales: (sales || []).slice(0, 5), pendingReminders,
         activity, alerts
      });
    } catch(err) {
      console.error(err);
      toast.error("Error refreshing dashboard");
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = (rem) => {
    if (!rem.phone) return toast.error("No phone number for this customer");
    const msg = `Hi ${rem.customer}, Your pending amount ₹${rem.amount.toLocaleString()} for the invoice dated ${new Date().toLocaleDateString()} is due. Kindly clear it at your earliest. - Sent via FinSathi`;
    window.open(`https://wa.me/91${rem.phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading || !data) {
    return <div className="flex h-[400px] items-center justify-center font-bold text-brand-blue animate-pulse text-[18px]">Initializing FinSathi Core...</div>;
  }

  return (
    <div className="space-y-[32px] animate-fade-in-up pb-[40px]">
      
      {/* HEADER SECTION: Welcome & Quick Actions */}
      <div className="flex flex-col xl:flex-row gap-[24px]">
        <div className="flex-1">
            <h1 className="text-[28px] font-extrabold text-brand-navy tracking-tight">Enterprise Overview</h1>
            <p className="text-[14px] text-text-muted mt-[4px] font-medium">Hello Admin, here's what's happening in your business today.</p>
            
            <section className="grid grid-cols-2 md:grid-cols-4 gap-[12px] mt-[24px]">
                <Button onClick={() => navigate('/billing')} icon={<Plus size={18} />} className="shadow-lg shadow-brand-blue/20">New Sale</Button>
                <Button variant="secondary" onClick={() => navigate('/inventory')} icon={<PackagePlus size={18} />}>Add Stock</Button>
                <Button variant="secondary" onClick={() => navigate('/customers')} icon={<UserPlus size={18} />}>Customer</Button>
                <Button variant="secondary" onClick={() => navigate('/tools')} icon={<BarChart2 size={18} />}>Tools Hub</Button>
            </section>
        </div>

        {/* Action Center - Urgent Portal */}
        <div className="w-full xl:w-[400px]">
            <Card className="bg-slate-50 border-blue-100 h-full relative overflow-hidden group">
                <div className="absolute top-[-20px] right-[-20px] text-blue-500/5 opacity-40 group-hover:scale-110 transition-transform">
                    <AlertTriangle size={150} />
                </div>
                <div className="relative z-10 flex flex-col h-full">
                    <h3 className="text-brand-navy text-[14px] font-black uppercase tracking-widest mb-[20px] flex items-center gap-[10px]">
                       <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white">
                          <Bell size={18} />
                       </div>
                       Action Center
                    </h3>
                    <div className="space-y-[12px] flex-1">
                        {data.alerts.map((alert, i) => (
                           <div key={i} className="flex justify-between items-center bg-white rounded-xl p-[14px] border border-blue-50 shadow-sm hover:border-brand-blue/30 transition-all">
                               <p className="text-slate-700 text-[13px] font-bold">{alert.text}</p>
                               <button onClick={() => navigate(alert.link)} className="text-brand-blue text-[11px] font-black hover:bg-brand-blue hover:text-white border border-brand-blue/20 px-3 py-1.5 rounded-lg transition-all">
                                   {alert.action}
                               </button>
                           </div>
                        ))}
                        {data.alerts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                <div className="p-4 bg-emerald-50 rounded-full mb-4">
                                   <CheckCircle2 size={32} className="text-emerald-500" />
                                </div>
                                <p className="text-[14px] font-bold text-slate-500 italic text-center">Excellent! No urgent alerts found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
      </div>

      {/* ROW 2: CRITICAL METRICS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-[24px]">
        <Card className="border-l-[6px] border-brand-blue">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Today Revenue</p>
          <div className="flex items-baseline gap-[8px] mt-[8px]">
             <span className="text-[32px] font-black text-brand-navy">₹{data.todaySalesAmt.toLocaleString()}</span>
             {data.salesGrowth > 0 && <span className="text-[12px] font-bold text-status-success">↑ {data.salesGrowth.toFixed(1)}%</span>}
             {data.salesGrowth < 0 && <span className="text-[12px] font-bold text-status-danger">↓ {Math.abs(data.salesGrowth).toFixed(1)}%</span>}
          </div>
        </Card>
        <Card className="border-l-[6px] border-status-danger">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest text-status-danger">Pending Dues</p>
          <span className="text-[32px] font-black text-brand-navy block mt-[8px]">₹{data.pendingPayments.toLocaleString()}</span>
        </Card>
        <Card className="border-l-[6px] border-yellow-500">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Inventory Health</p>
          <div className="flex items-baseline gap-[8px] mt-[8px]">
             <span className="text-[32px] font-black text-brand-navy">{data.lowStockCount}</span>
             <span className="text-[14px] font-bold text-text-muted">Items Low</span>
          </div>
        </Card>
        <Card className="border-l-[6px] border-[#10B981]">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest text-[#10B981]">G.Profit (Life)</p>
          <span className="text-[32px] font-black text-brand-navy block mt-[8px]">₹{data.profit.toLocaleString()}</span>
        </Card>
      </section>

      {/* ROW 3: VISUAL INTELLIGENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-[24px]">
        {/* Sales Chart (60%) */}
        <Card className="lg:col-span-3 h-[420px] flex flex-col">
          <div className="flex justify-between items-center mb-[32px]">
             <h3 className="text-[16px] font-bold text-brand-navy flex items-center gap-[8px]">
                <BarChart2 size={20} className="text-brand-blue" /> Sales Dynamics
             </h3>
             <Badge variant="gray">Last 7 Days</Badge>
          </div>
          <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
                      <RechartsTooltip cursor={{stroke: '#3B82F6', strokeWidth: 2}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={4} dot={{r: 5, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                  </LineChart>
              </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Products (40%) */}
        <Card className="lg:col-span-2 h-[420px] flex flex-col bg-slate-50 border-slate-200">
          <h3 className="text-[16px] font-bold text-brand-navy mb-[24px]">Power Products</h3>
          <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topProducts} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#1E293B', fontSize: 12, fontWeight: 700}} width={120} />
                      <RechartsTooltip cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Bar dataKey="quantity" fill="#3B82F6" radius={[0, 8, 8, 0]}>
                          {data.topProducts.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#1E293B' : '#3B82F6'} />
                          ))}
                      </Bar>
                  </BarChart>
              </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-text-muted mt-4 italic font-bold text-center">Top products driving your unit volume this month.</p>
        </Card>
      </div>

      {/* ROW 4: ACTIVITY FEED & REMINDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
        {/* Activity Feed (66% Width Combined) */}
        <Card className="lg:col-span-2 noPadding overflow-hidden">
            <div className="p-[20px] bg-brand-navy flex justify-between items-center">
                <h3 className="text-white text-[15px] font-bold flex items-center gap-[10px]">
                    <Activity size={18} className="text-[#3B82F6]" /> Business Stream
                </h3>
            </div>
            <div className="divide-y divide-gray-100">
                {data.activity.map((act, i) => {
                    const Icon = act.icon;
                    return (
                        <div key={i} className="flex items-center gap-[16px] p-[20px] hover:bg-gray-50 transition-colors group">
                           <div className={`w-[44px] h-[44px] rounded-xl flex items-center justify-center shrink-0 ${
                               act.type === 'sale' ? 'bg-emerald-50 text-emerald-600' : 
                               act.type === 'expense' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                           }`}>
                               <Icon size={20} />
                           </div>
                           <div className="flex-1">
                               <p className="text-[14px] font-bold text-brand-navy">{act.title}</p>
                               <p className="text-[12px] text-text-muted">{new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Just now</p>
                           </div>
                           <div className="text-right">
                               <p className={`text-[15px] font-black ${act.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                   {act.type === 'expense' ? '-' : '+'}₹{Number(act.amount).toLocaleString()}
                               </p>
                           </div>
                        </div>
                    );
                })}
            </div>
        </Card>

        {/* Reminders Portal */}
        <div className="flex flex-col gap-[24px]">
            <Card className="bg-[#FEF2F2] border-[#FCA5A5] h-full">
                <div className="flex justify-between items-center mb-[20px]">
                    <h3 className="text-[#991B1B] text-[15px] font-bold flex items-center gap-[8px]">
                        <MessageCircle size={18} /> Overdue Portal
                    </h3>
                </div>
                <div className="space-y-[12px]">
                    {data.pendingReminders.map(rem => (
                       <div key={rem.id} className="bg-white rounded-2xl p-[16px] border border-[#FCA5A5]/30 shadow-sm hover:translate-x-1 transition-transform">
                          <div className="flex justify-between items-start mb-[8px]">
                             <div>
                                <p className="text-[14px] font-bold text-brand-navy">{rem.customer}</p>
                                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-tighter">{rem.daysOverdue} Days Overdue</p>
                             </div>
                             <span className="text-[18px] font-black text-rose-700">₹{rem.amount.toLocaleString()}</span>
                          </div>
                          <button 
                             onClick={() => sendWhatsApp(rem)}
                             className="w-full mt-[8px] bg-[#25D366] hover:bg-[#128C7E] text-white py-[8px] rounded-xl text-[12px] font-bold flex items-center justify-center gap-[8px] transition-all shadow-md shadow-green-500/20"
                          >
                             <MessageCircle size={14} /> WhatsApp Reminder
                          </button>
                       </div>
                    ))}
                    {data.pendingReminders.length === 0 && (
                        <div className="py-12 text-center text-rose-400 font-medium italic">
                            No overdue payments found.
                        </div>
                    )}
                </div>
                <Button variant="ghost" className="w-full mt-[16px] text-rose-700 hover:bg-rose-100" onClick={() => navigate('/payments')}>
                    Release All Dues <ArrowRight size={14} className="ml-2" />
                </Button>
            </Card>
        </div>
      </div>
    </div>
  );
}
