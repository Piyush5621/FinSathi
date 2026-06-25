import { useEffect, useState } from 'react';
import API from "../services/apiClient";
import { TrendingUp, TrendingDown, Activity, Lightbulb, ArrowUpRight, ArrowDownRight, Users, ReceiptText, Award, Percent } from 'lucide-react';
import { Card } from "../components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function PnlPage() {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const [salesRes, expensesRes, invRes] = await Promise.all([
                API.get("/sales"),
                API.get("/expenses"),
                API.get("/inventory")
            ]);

            const sales = salesRes.data || [];
            const expenses = expensesRes.data || [];
            const inventory = invRes.data || [];

            const today = new Date();
            const last30Days = new Date();
            last30Days.setDate(today.getDate() - 30);

            // 1. Basic Stats
            const totalRevenue = (sales || []).reduce((sum, s) => sum + Number(s.total || 0), 0);
            const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
            const netProfit = totalRevenue - totalExpenses;
            const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

            // 2. Sales Trends (Last 7 Days)
            const trendDataMap = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                trendDataMap[dateStr] = { date: dateStr, revenue: 0, expenses: 0 };
            }

            (sales || []).forEach(s => {
                const dStr = s.date?.split('T')[0];
                if (trendDataMap[dStr]) trendDataMap[dStr].revenue += Number(s.total);
            });
            (expenses || []).forEach(e => {
                const dStr = e.date?.split('T')[0];
                if (trendDataMap[dStr]) trendDataMap[dStr].expenses += Number(e.amount);
            });

            const trendData = Object.values(trendDataMap).map(d => ({
                ...d,
                shortDate: d.date.split('-').slice(1).join('/')
            }));

            // 3. Expense Breakdown
            const expenseCatMap = {};
            (expenses || []).forEach(e => {
                const cat = e.category || 'Misc';
                expenseCatMap[cat] = (expenseCatMap[cat] || 0) + Number(e.amount);
            });
            const expenseBreakdown = Object.entries(expenseCatMap).map(([name, value]) => ({name, value}));

            // 4. Product Profitability
            const productSales = {};
            (sales || []).forEach(s => {
                s.sale_items?.forEach(si => {
                    const itemName = si.inventory?.name || 'Unknown Item';
                    if (!productSales[itemName]) productSales[itemName] = { name: itemName, revenue: 0, cost: 0, units: 0 };
                    
                    const rev = Number(si.total_price);
                    const cost = Number(si.inventory?.cost_price || 0) * Number(si.quantity);
                    
                    productSales[itemName].revenue += rev;
                    productSales[itemName].cost += cost;
                    productSales[itemName].units += Number(si.quantity);
                });
            });

            const productProfitData = Object.values(productSales).map(p => ({
                ...p,
                profit: p.revenue - p.cost,
                margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0
            }));
            
            const topProducts = [...productProfitData].sort((a,b) => b.profit - a.profit).slice(0, 5);
            const lowProducts = [...productProfitData].sort((a,b) => a.profit - b.profit).slice(0, 5);

            // 5. Customer Contribution
            const customerSales = {};
            (sales || []).forEach(s => {
                const cName = s.customers?.name || 'Walk-in';
                customerSales[cName] = (customerSales[cName] || 0) + Number(s.total);
            });
            const topCustomers = Object.entries(customerSales).sort((a,b) => b[1] - a[1]).slice(0,5).map(([name, total]) => ({name, total}));

            // 6. Recent Transactions Mixed
            const allTx = [
                ...(sales || []).map(s => ({ ...s, txType: 'SALE', title: `Sale #${s.invoice_no || s.id}`, amt: s.total, dateObj: new Date(s.date) })),
                ...(expenses || []).map(e => ({ ...e, txType: 'EXPENSE', title: `Expense - ${e.category}`, amt: e.amount, dateObj: new Date(e.date) }))
            ].sort((a, b) => b.dateObj - a.dateObj).slice(0, 8);

            // 7. Stock Impact
            const outOfStock = (inventory || []).filter(i => Number(i.quantity) <= 0);
            const potentialLoss = outOfStock.reduce((sum, i) => sum + (Number(i.selling_price) * 5), 0); 

            // 8. Smart Insights Generation
            const insights = [];
            if (trendData.length >= 2) {
                const todayRev = trendData[trendData.length-1].revenue;
                const yestRev = trendData[trendData.length-2].revenue;
                if (todayRev > yestRev) insights.push({ type: 'success', text: `📈 Revenue is up by ₹${(todayRev - yestRev).toLocaleString('en-IN')} compared to yesterday.`});
                else if (todayRev < yestRev && yestRev > 0) insights.push({ type: 'warning', text: `⚠️ Revenue dropped by ₹${(yestRev - todayRev).toLocaleString('en-IN')} today. Check operations.`});
            }
            if (outOfStock.length > 0) {
                insights.push({ type: 'danger', text: `🚨 ${outOfStock.length} items out of stock! Estimated ₹${potentialLoss.toLocaleString('en-IN')} potential revenue lost.`});
            }
            if (topProducts.length > 0) {
                insights.push({ type: 'info', text: `🔥 ${topProducts[0].name} is driving the most profit. Consider running a combo offer!`});
            }
            if (lowProducts.length > 0 && lowProducts[0].profit <= 0) {
                insights.push({ type: 'danger', text: `⚠️ ${lowProducts[0].name} is operating at a loss or 0 margin. Review pricing strategy.`});
            }
            if (profitMargin > 20) {
                insights.push({ type: 'success', text: `🏆 Your profit margin is ${profitMargin}%, which is excellent for retail!`})
            }

            setMetrics({
                totalRevenue, totalExpenses, netProfit, profitMargin,
                trendData, expenseBreakdown,
                topProducts, lowProducts,
                topCustomers, allTx,
                insights,
                potentialLoss
            });

        } catch(err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !metrics) {
        return (
            <div className="flex items-center justify-center min-h-[450px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-[32px] animate-fade-in-up pb-[40px]">
            {/* Header */}
            <div>
                <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-[8px]">
                   <Activity size={24} className="text-[#3B82F6]" />
                   Pro Revenue Engine & Analytics
                </h1>
                <p className="text-[14px] text-[#64748B] mt-[4px]">Data-driven decision-making engine mapping your financial operational trends.</p>
            </div>

            {/* Smart Insights (Top Visibility) */}
            {metrics.insights.length > 0 && (
                <div className="bg-[#090D16] border border-slate-800 rounded-3xl p-[24px] shadow-2xl relative overflow-hidden">
                    <div className="absolute right-[-10px] top-[-10px] w-32 h-32 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none"></div>
                    <h3 className="text-sm font-bold text-white mb-[18px] flex items-center gap-[8px] tracking-tight">
                        <Lightbulb size={18} className="text-amber-400" /> AI Business Assistant Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        {metrics.insights.map((insight, idx) => (
                            <div key={idx} className="bg-slate-950/60 border border-slate-800/80 p-[16px] rounded-2xl flex items-start gap-[12px]">
                                <div className="text-xs text-slate-200 font-medium leading-relaxed">{insight.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px]">
                <Card className="border-t-[4px] border-t-[#3B82F6] border-slate-150">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Total Revenue</span>
                    <h2 className="text-[28px] font-extrabold text-[#0F172A] mt-2 block">₹{metrics.totalRevenue.toLocaleString('en-IN')}</h2>
                </Card>
                <Card className="border-t-[4px] border-t-[#EF4444] border-slate-150">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Total Expenses</span>
                    <h2 className="text-[28px] font-extrabold text-[#0F172A] mt-2 block">₹{metrics.totalExpenses.toLocaleString('en-IN')}</h2>
                </Card>
                <Card className={`border-t-[4px] border-slate-150 ${metrics.netProfit < 0 ? 'border-t-red-500' : 'border-t-emerald-500'}`}>
                    <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Net Profit</span>
                    <h2 className={`text-[28px] font-extrabold mt-2 block ${metrics.netProfit < 0 ? 'text-red-650' : 'text-emerald-650'}`}>
                        ₹{metrics.netProfit.toLocaleString('en-IN')}
                    </h2>
                </Card>
                <Card className="border-t-[4px] border-t-amber-500 bg-amber-50/20 border-slate-150">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Net Profit Margin %</span>
                    <h2 className="text-[28px] font-extrabold text-amber-700 mt-2 block flex items-center gap-1">
                      <Percent size={20} className="stroke-2 shrink-0" /> {metrics.profitMargin}%
                    </h2>
                </Card>
            </div>

            {/* Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
                <Card className="lg:col-span-2 flex flex-col border border-slate-150">
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-[24px] border-b border-slate-100 pb-[12px]">Financial Operational Trend (7 Days)</h3>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics.trendData}>
                                <defs>
                                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01}/>
                                  </linearGradient>
                                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.01}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11, fontWeight: 600}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11, fontWeight: 600}} dx={-10} />
                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }} />
                                <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                                <Area type="monotone" name="Expenses" dataKey="expenses" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card className="flex flex-col border border-slate-150">
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-[24px] border-b border-slate-100 pb-[12px]">Expense Outflow Breakdown</h3>
                    <div className="h-[280px] w-full flex flex-col items-center justify-center">
                        {metrics.expenseBreakdown.length === 0 ? (
                            <p className="text-slate-400 text-xs italic">No operational outflow recorded.</p>
                        ) : (
                            <>
                              <ResponsiveContainer width="99%" height={200}>
                                  <PieChart>
                                      <Pie data={metrics.expenseBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={4} dataKey="value">
                                          {metrics.expenseBreakdown.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                          ))}
                                      </Pie>
                                      <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                                  </PieChart>
                              </ResponsiveContainer>
                              {/* Custom Legend */}
                              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-4 w-full px-2 max-h-[70px] overflow-y-auto custom-scrollbar">
                                {metrics.expenseBreakdown.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-1 text-[10px] font-bold text-slate-700">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                    {item.name}
                                  </div>
                                ))}
                              </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Profit & Loss Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
                {/* Top Profit Products */}
                <Card noPadding className="border border-slate-150 overflow-hidden">
                    <div className="p-[20px] border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-[8px]">
                            <TrendingUp size={16} className="text-[#10B981]" /> Top Performing Products
                        </h3>
                    </div>
                    <Table>
                        <Thead><tr><Th>Product</Th><Th className="text-right">Profit Margin</Th><Th className="text-right">Net Profit</Th></tr></Thead>
                        <Tbody>
                            {metrics.topProducts.length === 0 ? (
                                <Tr><Td colSpan="3" className="text-center py-8 text-slate-400">No product sales logged yet.</Td></Tr>
                            ) : metrics.topProducts.map((p, idx) => (
                                <Tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/30">
                                    <Td className="font-semibold text-slate-900 text-xs">{p.name}</Td>
                                    <Td className="text-right"><Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-100">{p.margin.toFixed(1)}% margin</Badge></Td>
                                    <Td className="text-right font-bold text-slate-900">₹{p.profit.toLocaleString('en-IN')}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
                
                {/* Low Margin/Loss Products */}
                <Card noPadding className="border border-slate-150 overflow-hidden">
                    <div className="p-[20px] border-b border-slate-100 bg-red-50/10">
                        <h3 className="text-xs font-bold text-red-950 uppercase tracking-wider flex items-center gap-[8px]">
                            <TrendingDown size={16} className="text-red-500" /> Low Margin / Loss Products
                        </h3>
                    </div>
                    <Table>
                        <Thead><tr><Th>Product</Th><Th className="text-right">Profit Margin</Th><Th className="text-right">Net Profit</Th></tr></Thead>
                        <Tbody>
                            {metrics.lowProducts.length === 0 ? (
                                <Tr><Td colSpan="3" className="text-center py-8 text-slate-400">No low margin items found.</Td></Tr>
                            ) : metrics.lowProducts.map((p, idx) => (
                                <Tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/30">
                                    <Td className="font-semibold text-slate-900 text-xs">{p.name}</Td>
                                    <Td className="text-right">
                                       <Badge variant={p.margin <= 0 ? "danger" : "warning"}>
                                         {p.margin.toFixed(1)}% margin
                                       </Badge>
                                    </Td>
                                    <Td className={`text-right font-bold ${p.profit <= 0 ? 'text-red-600' : 'text-slate-900'}`}>₹{p.profit.toLocaleString('en-IN')}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </div>

            {/* Customers & Recent Cash Flow */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
                {/* Top Customers */}
                <Card noPadding className="border border-slate-150 overflow-hidden">
                    <div className="p-[20px] border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-[8px]">
                            <Users size={16} className="text-[#3B82F6]" /> Client Contribution Ledgers
                        </h3>
                    </div>
                    <Table>
                        <Thead><tr><Th>Customer</Th><Th className="text-right">Total Contributed</Th></tr></Thead>
                        <Tbody>
                            {metrics.topCustomers.length === 0 ? (
                                <Tr><Td colSpan="2" className="text-center py-8 text-slate-400">No client payments logged.</Td></Tr>
                            ) : metrics.topCustomers.map((c, idx) => (
                                <Tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/30">
                                    <Td className="font-semibold text-slate-900 text-xs">{c.name}</Td>
                                    <Td className="text-right font-bold text-[#3B82F6]">₹{c.total.toLocaleString('en-IN')}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
                
                {/* Recent Cash Flow ledger */}
                <Card noPadding className="border border-slate-150 overflow-hidden">
                    <div className="p-[20px] border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-[8px]">
                            <ReceiptText size={16} className="text-[#3B82F6]" /> Recent Cash Flow Logs
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {metrics.allTx.length === 0 ? (
                            <div className="p-[20px] text-center text-slate-400 text-xs italic">No transactions recorded.</div>
                        ) : metrics.allTx.map((tx, idx) => (
                            <div key={idx} className="p-[14px] flex justify-between items-center hover:bg-slate-50/40 transition-colors">
                                <div className="flex items-center gap-[12px]">
                                    <div className={`p-[6px] rounded-lg shrink-0 ${tx.txType === 'SALE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                        {tx.txType === 'SALE' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-[#0F172A]">{tx.title}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{tx.dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-bold ${tx.txType === 'SALE' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {tx.txType === 'SALE' ? '+' : '-'}₹{Number(tx.amt).toLocaleString('en-IN')}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            
        </div>
    );
}
