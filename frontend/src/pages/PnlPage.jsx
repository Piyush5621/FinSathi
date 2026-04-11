import {  useEffect, useState  } from 'react';
import API from "../services/apiClient";
import { TrendingUp, TrendingDown, Activity, Lightbulb, ArrowUpRight, ArrowDownRight, Users, ReceiptText } from 'lucide-react';
import { Card } from "../components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "../components/ui/Table";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  PieChart, Pie, Cell, BarChart, Bar, Legend
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
            // Fetch everything via secure backend
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
                if (todayRev > yestRev) insights.push({ type: 'success', text: `📈 Revenue is up by ₹${(todayRev - yestRev).toFixed(2)} compared to yesterday.`});
                else if (todayRev < yestRev && yestRev > 0) insights.push({ type: 'warning', text: `⚠️ Revenue dropped by ₹${(yestRev - todayRev).toFixed(2)} today. Check operations.`});
            }
            if (outOfStock.length > 0) {
                insights.push({ type: 'danger', text: `🚨 ${outOfStock.length} items out of stock! Estimated ₹${potentialLoss.toLocaleString()} potential revenue lost.`});
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
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-[32px] animate-fade-in-up pb-[40px]">
            <div>
                <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-[8px]">
                   <Activity size={24} className="text-[#3B82F6]" />
                   Pro Revenue Engine & Analytics
                </h1>
                <p className="text-[14px] text-[#64748B] mt-[4px]">Data-driven decision-making engine mapping your financial operational trends.</p>
            </div>

            {/* ROW 1: CORE STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-[24px]">
                <Card className="border-t-[4px] border-t-[#3B82F6]">
                    <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider">Total Revenue</span>
                    <h2 className="text-[32px] font-extrabold text-[#0F172A] mt-[8px]">₹{metrics.totalRevenue.toLocaleString()}</h2>
                </Card>
                <Card className="border-t-[4px] border-t-[#EF4444]">
                    <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider">Total Expenses</span>
                    <h2 className="text-[32px] font-extrabold text-[#0F172A] mt-[8px]">₹{metrics.totalExpenses.toLocaleString()}</h2>
                </Card>
                <Card className={`border-t-[4px] ${metrics.netProfit < 0 ? 'border-t-[#EF4444]' : 'border-t-[#10B981]'}`}>
                    <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider">Net Profit</span>
                    <h2 className={`text-[32px] font-extrabold mt-[8px] ${metrics.netProfit < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                        ₹{metrics.netProfit.toLocaleString()}
                    </h2>
                </Card>
                <Card className="border-t-[4px] border-t-[#F59E0B] bg-[#FFFBEB]">
                    <span className="text-[12px] font-bold text-[#B45309] uppercase tracking-wider">Net Profit Margin %</span>
                    <h2 className="text-[32px] font-extrabold text-[#D97706] mt-[8px]">{metrics.profitMargin}%</h2>
                </Card>
            </div>

            {/* ROW 6: SMART INSIGHTS (Pulled up for visibility) */}
            {metrics.insights.length > 0 && (
                <div className="bg-[#1E293B] rounded-2xl p-[24px] shadow-lg border border-[#334155]">
                    <h3 className="text-[16px] font-bold text-white mb-[16px] flex items-center gap-[8px]">
                        <Lightbulb size={20} className="text-[#FBBF24]" /> Smart Business Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        {metrics.insights.map((insight, idx) => (
                            <div key={idx} className="bg-[#0F172A] border border-[#334155] p-[16px] rounded-xl flex items-start gap-[12px]">
                                <div className="text-[14px] text-[#E2E8F0] font-medium leading-relaxed">{insight.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ROW 2: CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
                <Card className="lg:col-span-2 flex flex-col">
                    <h3 className="text-[14px] font-bold text-[#0F172A] mb-[24px] border-b border-[#E2E8F0] pb-[12px]">Sales & Expense Trend (7 Days)</h3>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics.trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dx={-10} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line type="monotone" name="Revenue" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                <Line type="monotone" name="Expenses" dataKey="expenses" stroke="#EF4444" strokeWidth={3} dot={{r: 4}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card className="flex flex-col">
                    <h3 className="text-[14px] font-bold text-[#0F172A] mb-[24px] border-b border-[#E2E8F0] pb-[12px]">Expense Breakdown</h3>
                    <div className="h-[280px] w-full flex items-center justify-center">
                        {metrics.expenseBreakdown.length === 0 ? (
                            <p className="text-[#64748B] text-[13px]">No expenses recorded.</p>
                        ) : (
                            <ResponsiveContainer width="99%" height={280}>
                                <PieChart>
                                    <Pie data={metrics.expenseBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {metrics.expenseBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Card>
            </div>

            {/* ROW 3: PROFIT PRODUCTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
                <Card noPadding>
                    <div className="p-[20px] border-b border-[#E2E8F0]">
                        <h3 className="text-[14px] font-bold text-[#0F172A] flex items-center gap-[8px]">
                            <TrendingUp size={18} className="text-[#10B981]" /> Top Profit Products
                        </h3>
                    </div>
                    <Table>
                        <Thead><tr><Th>Product</Th><Th className="text-right">Profit Margin</Th><Th className="text-right">Net Profit</Th></tr></Thead>
                        <Tbody>
                            {metrics.topProducts.length === 0 ? (
                                <Tr><Td colSpan="3" className="text-center py-6 text-[#64748B]">No sales data.</Td></Tr>
                            ) : metrics.topProducts.map((p, idx) => (
                                <Tr key={idx}>
                                    <Td className="font-bold text-[#0F172A]">{p.name}</Td>
                                    <Td className="text-right font-medium text-[#10B981]">{p.margin.toFixed(1)}%</Td>
                                    <Td className="text-right font-bold text-[#0F172A]">₹{p.profit.toLocaleString()}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
                
                <Card noPadding>
                    <div className="p-[20px] border-b border-[#E2E8F0] bg-[#FEF2F2]">
                        <h3 className="text-[14px] font-bold text-[#991B1B] flex items-center gap-[8px]">
                            <TrendingDown size={18} className="text-[#EF4444]" /> Low Margin / Loss Products
                        </h3>
                    </div>
                    <Table>
                        <Thead><tr><Th>Product</Th><Th className="text-right">Profit Margin</Th><Th className="text-right">Net Profit</Th></tr></Thead>
                        <Tbody>
                            {metrics.lowProducts.length === 0 ? (
                                <Tr><Td colSpan="3" className="text-center py-6 text-[#64748B]">No poorly performing data.</Td></Tr>
                            ) : metrics.lowProducts.map((p, idx) => (
                                <Tr key={idx}>
                                    <Td className="font-bold text-[#0F172A]">{p.name}</Td>
                                    <Td className={`text-right font-medium ${p.margin <= 0 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>{p.margin.toFixed(1)}%</Td>
                                    <Td className={`text-right font-bold ${p.profit <= 0 ? 'text-[#EF4444]' : 'text-[#D97706]'}`}>₹{p.profit.toLocaleString()}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </div>

            {/* ROW 4 & 5: CASH FLOW & TRANSACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
                <Card noPadding>
                    <div className="p-[20px] border-b border-[#E2E8F0]">
                        <h3 className="text-[14px] font-bold text-[#0F172A] flex items-center gap-[8px]">
                            <Users size={18} className="text-[#3B82F6]" /> Top Customers By Revenue
                        </h3>
                    </div>
                    <Table>
                        <Thead><tr><Th>Customer</Th><Th className="text-right">Total Contributed</Th></tr></Thead>
                        <Tbody>
                            {metrics.topCustomers.length === 0 ? (
                                <Tr><Td colSpan="2" className="text-center py-6 text-[#64748B]">No customer data.</Td></Tr>
                            ) : metrics.topCustomers.map((c, idx) => (
                                <Tr key={idx}>
                                    <Td className="font-bold text-[#0F172A]">{c.name}</Td>
                                    <Td className="text-right font-bold text-[#3B82F6]">₹{c.total.toLocaleString()}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
                
                <Card noPadding>
                    <div className="p-[20px] border-b border-[#E2E8F0]">
                        <h3 className="text-[14px] font-bold text-[#0F172A] flex items-center gap-[8px]">
                            <ReceiptText size={18} className="text-[#3B82F6]" /> Recent Cash Flow
                        </h3>
                    </div>
                    <div className="divide-y divide-[#E2E8F0]">
                        {metrics.allTx.length === 0 ? (
                            <div className="p-[20px] text-center text-[#64748B] text-[13px]">No recent transactions.</div>
                        ) : metrics.allTx.map((tx, idx) => (
                            <div key={idx} className="p-[16px] flex justify-between items-center hover:bg-[#F8FAFC] transition-colors">
                                <div className="flex items-center gap-[12px]">
                                    <div className={`p-[8px] rounded-lg ${tx.txType === 'SALE' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEE2E2] text-[#DC2626]'}`}>
                                        {tx.txType === 'SALE' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-bold text-[#0F172A]">{tx.title}</p>
                                        <p className="text-[12px] text-[#64748B]">{tx.dateObj.toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className={`font-bold ${tx.txType === 'SALE' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                    {tx.txType === 'SALE' ? '+' : '-'}₹{Number(tx.amt).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            
        </div>
    );
}
