import { useEffect, useState, useMemo } from 'react';
import API from "../services/apiClient";
import { 
  TrendingUp, TrendingDown, Activity, Lightbulb, ArrowUpRight, ArrowDownRight, 
  Users, ReceiptText, Award, Percent, Printer, Download, Calendar, Store, 
  RefreshCw, CheckCircle2, AlertTriangle, FileSpreadsheet, Layers, Sparkles
} from 'lucide-react';
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  PieChart, Pie, Cell, Legend
} from "recharts";
import toast from "react-hot-toast";

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function PnlPage() {
    const [loading, setLoading] = useState(true);
    const [salesRaw, setSalesRaw] = useState([]);
    const [expensesRaw, setExpensesRaw] = useState([]);
    const [inventoryRaw, setInventoryRaw] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('30d'); // '7d' | '30d' | 'this_month' | 'last_month' | 'quarter' | 'fy' | 'all'

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const [salesRes, expensesRes, invRes] = await Promise.all([
                API.get("/sales"),
                API.get("/expenses"),
                API.get("/inventory")
            ]);

            setSalesRaw(salesRes.data || []);
            setExpensesRaw(expensesRes.data || []);
            setInventoryRaw(invRes.data || []);
        } catch(err) {
            console.error("Failed to load P&L datasets", err);
            toast.error("Failed to load financial records");
        } finally {
            setLoading(false);
        }
    };

    // Period threshold filter
    const dateRange = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        if (selectedPeriod === '7d') {
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            return { start, end: now, label: "Last 7 Days" };
        }
        if (selectedPeriod === '30d') {
            const start = new Date(now);
            start.setDate(start.getDate() - 30);
            return { start, end: now, label: "Last 30 Days" };
        }
        if (selectedPeriod === 'this_month') {
            const start = new Date(currentYear, currentMonth, 1);
            const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
            return { start, end, label: "This Month" };
        }
        if (selectedPeriod === 'last_month') {
            const start = new Date(currentYear, currentMonth - 1, 1);
            const end = new Date(currentYear, currentMonth, 0, 23, 59, 59);
            return { start, end, label: "Last Month" };
        }
        if (selectedPeriod === 'quarter') {
            const quarterMonth = Math.floor(currentMonth / 3) * 3;
            const start = new Date(currentYear, quarterMonth, 1);
            const end = new Date(currentYear, quarterMonth + 3, 0, 23, 59, 59);
            return { start, end, label: "Current Quarter" };
        }
        if (selectedPeriod === 'fy') {
            const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
            const start = new Date(fyStartYear, 3, 1);
            const end = new Date(fyStartYear + 1, 2, 31, 23, 59, 59);
            return { start, end, label: "Current Financial Year" };
        }
        return { start: new Date(0), end: now, label: "All Time" };
    }, [selectedPeriod]);

    // Computed metrics based on period filter
    const metrics = useMemo(() => {
        const sales = salesRaw.filter(s => {
            if (selectedPeriod === 'all') return true;
            const d = new Date(s.date || s.created_at || 0);
            return d >= dateRange.start && d <= dateRange.end;
        });

        const expenses = expensesRaw.filter(e => {
            if (selectedPeriod === 'all') return true;
            const d = new Date(e.date || e.created_at || 0);
            return d >= dateRange.start && d <= dateRange.end;
        });

        const inventory = inventoryRaw;

        // 1. Basic Stats (Preserved formulas)
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

        // 2. Operational Trends (Last 7 Days)
        const trendDataMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            trendDataMap[dateStr] = { date: dateStr, revenue: 0, expenses: 0 };
        }

        salesRaw.forEach(s => {
            const dStr = (s.date || s.created_at || '').split('T')[0];
            if (trendDataMap[dStr]) trendDataMap[dStr].revenue += Number(s.total || 0);
        });
        expensesRaw.forEach(e => {
            const dStr = (e.date || e.created_at || '').split('T')[0];
            if (trendDataMap[dStr]) trendDataMap[dStr].expenses += Number(e.amount || 0);
        });

        const trendData = Object.values(trendDataMap).map(d => ({
            ...d,
            shortDate: d.date.split('-').slice(1).join('/')
        }));

        // 3. Expense Breakdown
        const expenseCatMap = {};
        expenses.forEach(e => {
            const cat = e.category || 'Misc';
            expenseCatMap[cat] = (expenseCatMap[cat] || 0) + Number(e.amount || 0);
        });
        const expenseBreakdown = Object.entries(expenseCatMap).map(([name, value]) => ({ name, value }));

        // 4. Product Profitability
        const productSales = {};
        sales.forEach(s => {
            s.sale_items?.forEach(si => {
                const itemName = si.inventory?.name || 'Unknown Item';
                if (!productSales[itemName]) productSales[itemName] = { name: itemName, revenue: 0, cost: 0, units: 0 };
                
                const rev = Number(si.total_price || 0);
                const cost = Number(si.inventory?.cost_price || 0) * Number(si.quantity || 1);
                
                productSales[itemName].revenue += rev;
                productSales[itemName].cost += cost;
                productSales[itemName].units += Number(si.quantity || 1);
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
        sales.forEach(s => {
            const cName = s.customers?.name || 'Walk-in Client';
            customerSales[cName] = (customerSales[cName] || 0) + Number(s.total || 0);
        });
        const topCustomers = Object.entries(customerSales).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, total]) => ({ name, total }));

        // 6. Recent Mixed Transactions
        const allTx = [
            ...sales.map(s => ({ ...s, txType: 'SALE', title: `Sale #${s.invoice_no || s.id}`, amt: s.total, dateObj: new Date(s.date || s.created_at) })),
            ...expenses.map(e => ({ ...e, txType: 'EXPENSE', title: `Expense - ${e.category || 'Misc'}`, amt: e.amount, dateObj: new Date(e.date || e.created_at) }))
        ].sort((a, b) => b.dateObj - a.dateObj).slice(0, 8);

        // 7. Stock Impact
        const outOfStock = inventory.filter(i => Number(i.quantity || 0) <= 0);
        const potentialLoss = outOfStock.reduce((sum, i) => sum + (Number(i.selling_price || 0) * 5), 0);

        // 8. Smart Insights Generation
        const insights = [];
        if (trendData.length >= 2) {
            const todayRev = trendData[trendData.length - 1].revenue;
            const yestRev = trendData[trendData.length - 2].revenue;
            if (todayRev > yestRev) {
                insights.push({ type: 'success', text: `Revenue is up by ₹${(todayRev - yestRev).toLocaleString('en-IN')} compared to yesterday.` });
            } else if (todayRev < yestRev && yestRev > 0) {
                insights.push({ type: 'warning', text: `Revenue decreased by ₹${(yestRev - todayRev).toLocaleString('en-IN')} compared to yesterday.` });
            }
        }
        if (outOfStock.length > 0) {
            insights.push({ type: 'danger', text: `${outOfStock.length} items out of stock! Estimated ₹${potentialLoss.toLocaleString('en-IN')} potential revenue impact.` });
        }
        if (topProducts.length > 0) {
            insights.push({ type: 'info', text: `${topProducts[0].name} is driving the highest profit in this period.` });
        }
        if (lowProducts.length > 0 && lowProducts[0].profit <= 0) {
            insights.push({ type: 'danger', text: `${lowProducts[0].name} operates at a loss or zero margin. Review pricing.` });
        }
        if (Number(profitMargin) > 20) {
            insights.push({ type: 'success', text: `Your profit margin of ${profitMargin}% is strong for retail operations.` });
        }

        return {
            totalRevenue,
            totalExpenses,
            netProfit,
            profitMargin,
            trendData,
            expenseBreakdown,
            topProducts,
            lowProducts,
            topCustomers,
            allTx,
            insights,
            potentialLoss
        };
    }, [salesRaw, expensesRaw, inventoryRaw, selectedPeriod, dateRange]);

    // Print Handler
    const handlePrint = () => {
        window.print();
    };

    // Export CSV Handler
    const handleExportCSV = () => {
        if (!metrics) return toast.error("No P&L data available");
        const rows = [
            ["Profit & Loss Statement", `Period: ${dateRange.label}`],
            ["Generated on", new Date().toLocaleString('en-IN')],
            [],
            ["Metric", "Amount (₹)"],
            ["Total Revenue", metrics.totalRevenue],
            ["Total Operating Expenses", metrics.totalExpenses],
            ["Net Profit", metrics.netProfit],
            ["Net Profit Margin", `${metrics.profitMargin}%`],
            [],
            ["Category Expense Breakdown"],
            ["Category", "Amount (₹)"],
            ...metrics.expenseBreakdown.map(e => [e.name, e.value]),
            [],
            ["Top Performing Products"],
            ["Product", "Revenue (₹)", "Margin %", "Net Profit (₹)"],
            ...metrics.topProducts.map(p => [p.name, p.revenue, `${p.margin.toFixed(1)}%`, p.profit])
        ];

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `karobar_pnl_statement_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("P&L Statement exported to CSV!");
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                <p className="text-xs text-app-muted font-medium">Computing profit & loss statement...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up pb-20 max-w-[1600px] mx-auto print:p-0">
            
            {/* 1. Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs print:border-none print:shadow-none">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black border border-primary/20 shrink-0 print:hidden">
                        <Activity size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-app-text tracking-tight">Profit & Loss Statement</h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                <Store size={10} /> Active Store
                            </span>
                        </div>
                        <p className="text-xs text-app-muted mt-0.5">
                            Authoritative profitability statement, operating cost analysis, and product margin performance.
                        </p>
                    </div>
                </div>

                {/* Period Selector & Action Cluster */}
                <div className="flex items-center gap-2 flex-wrap print:hidden">
                    <div className="flex items-center gap-1.5 bg-app-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs">
                        <Calendar size={13} className="text-app-muted" />
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-app-text outline-none cursor-pointer"
                        >
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="quarter">Current Quarter</option>
                            <option value="fy">Financial Year</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border bg-app-surface hover:bg-app-hover text-app-text text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                        title="Export P&L Statement to CSV"
                    >
                        <Download size={13} />
                        <span>Export CSV</span>
                    </button>

                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border bg-app-surface hover:bg-app-hover text-app-text text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                        title="Print Financial Statement"
                    >
                        <Printer size={13} />
                        <span>Print</span>
                    </button>
                </div>
            </div>

            {/* Print Header Badge (Only visible on print) */}
            <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">KaroBar Business OS — Financial Statement</h2>
                        <p className="text-xs text-slate-500">Period: {dateRange.label} • Generated: {new Date().toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right font-mono text-xs text-slate-600">
                        Official Store Statement
                    </div>
                </div>
            </div>

            {/* 2. 4-Pillar Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider">Total Revenue</span>
                    <div>
                        <h2 className="text-2xl font-black font-mono text-app-text tracking-tight">
                            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
                        </h2>
                        <p className="text-[11px] text-app-muted mt-0.5 font-medium">Gross sales receipts</p>
                    </div>
                </div>

                <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider">Operating Expenses</span>
                    <div>
                        <h2 className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">
                            ₹{metrics.totalExpenses.toLocaleString('en-IN')}
                        </h2>
                        <p className="text-[11px] text-app-muted mt-0.5 font-medium">Total operational outflows</p>
                    </div>
                </div>

                <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider">Net Operating Profit</span>
                        <Badge variant={metrics.netProfit >= 0 ? "success" : "danger"} className="text-[10px]">
                            {metrics.netProfit >= 0 ? "Profitable" : "Operating Loss"}
                        </Badge>
                    </div>
                    <div>
                        <h2 className={`text-2xl font-black font-mono tracking-tight ${metrics.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {metrics.netProfit >= 0 ? `+₹${metrics.netProfit.toLocaleString('en-IN')}` : `-₹${Math.abs(metrics.netProfit).toLocaleString('en-IN')}`}
                        </h2>
                        <p className="text-[11px] text-app-muted mt-0.5 font-medium">Revenue − Expenses</p>
                    </div>
                </div>

                <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider">Net Profit Margin %</span>
                    <div>
                        <h2 className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight flex items-center gap-1">
                            <Percent size={18} className="stroke-2 shrink-0" /> {metrics.profitMargin}%
                        </h2>
                        <p className="text-[11px] text-app-muted mt-0.5 font-medium">Return on turnover</p>
                    </div>
                </div>
            </div>

            {/* 3. Executive P&L Waterfall Statement */}
            <div className="p-5 bg-app-surface border border-app-border rounded-2xl shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-app-text uppercase tracking-wider flex items-center gap-2">
                    <ReceiptText size={15} className="text-primary" /> Financial Flow Statement ({dateRange.label})
                </h3>

                <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-app-subtle/50">
                        <span className="font-bold text-app-text">1. Gross Business Revenue (Sales Inflow)</span>
                        <span className="font-mono font-black text-app-text text-sm">₹{metrics.totalRevenue.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-rose-500/5 text-rose-700 dark:text-rose-300">
                        <span className="font-semibold">2. Less: Total Operating Expenses (OPEX)</span>
                        <span className="font-mono font-bold text-sm">-₹{metrics.totalExpenses.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 px-3 rounded-xl border border-app-border bg-app-subtle font-bold">
                        <span className="text-app-text">3. Net Operating Profit / (Loss) Before Taxes</span>
                        <span className={`font-mono font-black text-base ${metrics.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            ₹{metrics.netProfit.toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. Smart Insights */}
            {metrics.insights.length > 0 && (
                <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs space-y-2.5 print:hidden">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-primary" />
                        <h3 className="text-xs font-bold text-app-text">Automated Operational Insights</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {metrics.insights.map((insight, idx) => (
                            <div key={idx} className="p-2.5 bg-app-subtle/50 border border-app-border/60 rounded-xl text-xs text-app-text font-medium flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                                <span>{insight.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 print:grid-cols-1">
                {/* 7-Day Operational Trend (7 cols) */}
                <div className="lg:col-span-7 p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4 border-b border-app-border pb-2.5">
                        <h3 className="text-xs font-bold text-app-text uppercase tracking-wider">7-Day Operational Revenue vs Expense Trend</h3>
                        <span className="text-[10px] text-app-muted font-mono">Daily Comparison</span>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics.trendData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01}/>
                                    </linearGradient>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.01}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-app-border" opacity={0.4} />
                                <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dx={-10} />
                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-subtle, #e2e8f0)', fontSize: 12 }} />
                                <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                                <Area type="monotone" name="Expenses" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Outflow Breakdown (5 cols) */}
                <div className="lg:col-span-5 p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4 border-b border-app-border pb-2.5">
                        <h3 className="text-xs font-bold text-app-text uppercase tracking-wider">Expense Outflow by Category</h3>
                        <span className="text-[10px] text-app-muted font-mono">{metrics.expenseBreakdown.length} Categories</span>
                    </div>
                    <div className="h-64 w-full flex flex-col items-center justify-center">
                        {metrics.expenseBreakdown.length === 0 ? (
                            <p className="text-app-muted text-xs italic">No operational outflow recorded in this period.</p>
                        ) : (
                            <>
                                <ResponsiveContainer width="99%" height={170}>
                                    <PieChart>
                                        <Pie data={metrics.expenseBreakdown} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={4} dataKey="value">
                                            {metrics.expenseBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 w-full px-2 max-h-16 overflow-y-auto">
                                    {metrics.expenseBreakdown.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-1 text-[10px] font-bold text-app-text">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span>{item.name}: ₹{item.value.toLocaleString('en-IN')}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 6. Product Margin Profitability Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Performing Products */}
                <div className="border border-app-border rounded-2xl bg-app-surface overflow-hidden shadow-2xs">
                    <div className="p-3.5 border-b border-app-border bg-app-subtle/30 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-app-text uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp size={15} className="text-emerald-500" /> Top Performing Products
                        </h3>
                        <span className="text-[10px] font-mono text-app-muted">By Net Profit Contribution</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-app-subtle/50 border-b border-app-border text-[10px] font-bold uppercase text-app-muted">
                                    <th className="py-2.5 px-3.5">Product Name</th>
                                    <th className="py-2.5 px-3.5 text-right">Margin %</th>
                                    <th className="py-2.5 px-3.5 text-right">Net Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-app-border/40">
                                {metrics.topProducts.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center py-8 text-app-muted text-xs">No product sales logged in this period.</td></tr>
                                ) : metrics.topProducts.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-app-hover/50 transition-colors">
                                        <td className="py-2.5 px-3.5 font-bold text-app-text text-xs">{p.name}</td>
                                        <td className="py-2.5 px-3.5 text-right">
                                            <Badge variant="success" className="font-mono text-[10px]">
                                                {p.margin.toFixed(1)}%
                                            </Badge>
                                        </td>
                                        <td className="py-2.5 px-3.5 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                                            ₹{p.profit.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Low Margin / Loss Products */}
                <div className="border border-app-border rounded-2xl bg-app-surface overflow-hidden shadow-2xs">
                    <div className="p-3.5 border-b border-app-border bg-app-subtle/30 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-app-text uppercase tracking-wider flex items-center gap-2">
                            <TrendingDown size={15} className="text-rose-500" /> Low Margin / Loss Products
                        </h3>
                        <span className="text-[10px] font-mono text-app-muted">Action Recommended</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-app-subtle/50 border-b border-app-border text-[10px] font-bold uppercase text-app-muted">
                                    <th className="py-2.5 px-3.5">Product Name</th>
                                    <th className="py-2.5 px-3.5 text-right">Margin %</th>
                                    <th className="py-2.5 px-3.5 text-right">Net Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-app-border/40">
                                {metrics.lowProducts.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center py-8 text-app-muted text-xs">No low margin items found.</td></tr>
                                ) : metrics.lowProducts.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-app-hover/50 transition-colors">
                                        <td className="py-2.5 px-3.5 font-bold text-app-text text-xs">{p.name}</td>
                                        <td className="py-2.5 px-3.5 text-right">
                                            <Badge variant={p.margin <= 0 ? "danger" : "warning"} className="font-mono text-[10px]">
                                                {p.margin.toFixed(1)}%
                                            </Badge>
                                        </td>
                                        <td className={`py-2.5 px-3.5 text-right font-black font-mono ${p.profit <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-app-text'}`}>
                                            ₹{p.profit.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 7. Client Contribution & Recent Mixed Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Client Contribution */}
                <div className="border border-app-border rounded-2xl bg-app-surface overflow-hidden shadow-2xs">
                    <div className="p-3.5 border-b border-app-border bg-app-subtle/30 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-app-text uppercase tracking-wider flex items-center gap-2">
                            <Users size={15} className="text-primary" /> Client Contribution Ledgers
                        </h3>
                        <span className="text-[10px] font-mono text-app-muted">Top Revenue Accounts</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-app-subtle/50 border-b border-app-border text-[10px] font-bold uppercase text-app-muted">
                                    <th className="py-2.5 px-3.5">Customer</th>
                                    <th className="py-2.5 px-3.5 text-right">Total Contributed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-app-border/40">
                                {metrics.topCustomers.length === 0 ? (
                                    <tr><td colSpan="2" className="text-center py-8 text-app-muted text-xs">No client contributions recorded.</td></tr>
                                ) : metrics.topCustomers.map((c, idx) => (
                                    <tr key={idx} className="hover:bg-app-hover/50 transition-colors">
                                        <td className="py-2.5 px-3.5 font-bold text-app-text">{c.name}</td>
                                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-primary">
                                            ₹{c.total.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Cash Flow Ledger */}
                <div className="border border-app-border rounded-2xl bg-app-surface overflow-hidden shadow-2xs">
                    <div className="p-3.5 border-b border-app-border bg-app-subtle/30 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-app-text uppercase tracking-wider flex items-center gap-2">
                            <ReceiptText size={15} className="text-primary" /> Recent Transaction Stream
                        </h3>
                        <span className="text-[10px] font-mono text-app-muted">Latest 8 Activities</span>
                    </div>
                    <div className="divide-y divide-app-border/40 max-h-72 overflow-y-auto">
                        {metrics.allTx.length === 0 ? (
                            <div className="p-8 text-center text-app-muted text-xs italic">No transactions recorded.</div>
                        ) : metrics.allTx.map((tx, idx) => (
                            <div key={idx} className="p-3 flex justify-between items-center hover:bg-app-hover/50 transition-colors text-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                                        tx.txType === 'SALE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {tx.txType === 'SALE' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-app-text text-xs">{tx.title}</p>
                                        <p className="text-[10px] text-app-muted font-mono">{tx.dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                </div>
                                <span className={`font-mono font-black ${tx.txType === 'SALE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {tx.txType === 'SALE' ? '+' : '-'}₹{Number(tx.amt || 0).toLocaleString('en-IN')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
        </div>
    );
}
