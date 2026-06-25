import React, { useEffect, useState } from "react";
import API from "../../services/apiClient";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { 
  TrendingUp, BarChart2, DollarSign, Package, 
  Users, Download, FileSpreadsheet, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Award
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Cell, 
  PieChart, Pie, Legend, LineChart, Line 
} from "recharts";
import toast from "react-hot-toast";

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

export default function ExecutiveAnalytics() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("revenue");
  
  // Datasets
  const [dashboardData, setDashboardData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [pnlData, setPnlData] = useState(null);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [dashRes, prodRes, custRes, pnlRes] = await Promise.all([
        API.get("/dashboard"),
        API.get("/analytics/top-products?limit=10"),
        API.get("/analytics/top-customers?limit=10"),
        API.get("/analytics/pnl")
      ]);

      if (dashRes.data) setDashboardData(dashRes.data);
      if (prodRes.data?.success) setTopProducts(prodRes.data.data);
      if (custRes.data?.success) setTopCustomers(custRes.data.data);
      if (pnlRes.data?.success) setPnlData(pnlRes.data.data);

    } catch (err) {
      console.error(err);
      toast.error("Failed to refresh analytics dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Exporter: Generate and download CSV
  const exportToCSV = (filename, headers, rows) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    toast.success("CSV report exported successfully!");
  };

  const handleExport = () => {
    if (activeTab === "revenue") {
      const data = dashboardData?.charts?.trend || [];
      const headers = ["Date", "Revenue (₹)"];
      const rows = data.map(item => [item.name, item.sales]);
      exportToCSV("revenue_trend_report", headers, rows);
    } else if (activeTab === "profit") {
      const headers = ["Metric", "Amount (₹)"];
      const rows = [
        ["Total Revenue", pnlData?.revenue || 0],
        ["Total Expenses", pnlData?.expenses || 0],
        ["Net profit", pnlData?.profit || 0]
      ];
      exportToCSV("pnl_statement_report", headers, rows);
    } else if (activeTab === "products") {
      const headers = ["Product Name", "Sales Amount (₹)"];
      const rows = topProducts.map(item => [item.name, item.amount]);
      exportToCSV("top_selling_products", headers, rows);
    } else if (activeTab === "loyalty") {
      const headers = ["Customer Name", "MTD Invoice Total (₹)"];
      const rows = topCustomers.map(item => [item.name, item.amount]);
      exportToCSV("top_valuable_customers", headers, rows);
    } else if (activeTab === "expenses") {
      const data = dashboardData?.charts?.expenses || [];
      const headers = ["Category", "Amount (₹)"];
      const rows = data.map(item => [item.name, item.value]);
      exportToCSV("expense_categories_distribution", headers, rows);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-12 max-w-[1400px] mx-auto">
        <Skeleton height="35px" width="280px" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} height="100px" rounded="rounded-2xl" />)}
        </div>
        <Skeleton height="350px" rounded="rounded-[24px]" />
      </div>
    );
  }

  // Calculate Profit Margin
  const profitMarginPercent = pnlData?.revenue > 0 
    ? ((pnlData.profit / pnlData.revenue) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-8 pb-16 max-w-[1400px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Executive Analytics
            <Badge variant="info" className="text-[9px] uppercase tracking-wider py-0.5 px-2 font-bold bg-indigo-50 border-indigo-100 text-indigo-700">
              C-Suite
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Operational dashboard and visual breakdowns of key business performance drivers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer shadow-sm shadow-indigo-600/5"
          >
            <Download size={13} />
            <span>Export CSV Report</span>
          </button>
          <button
            onClick={fetchAnalyticsData}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* MTD Revenue */}
        <Card className="p-5 bg-white border border-slate-100 shadow-sm rounded-[20px] flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">MTD Gross Revenue</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">₹{(pnlData?.revenue || 0).toLocaleString("en-IN")}</h3>
            <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-1.5">
              <ArrowUpRight size={10} /> Active sales pipeline
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <TrendingUp size={20} />
          </div>
        </Card>

        {/* MTD Expenses */}
        <Card className="p-5 bg-white border border-slate-100 shadow-sm rounded-[20px] flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">MTD Total Expenses</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">₹{(pnlData?.expenses || 0).toLocaleString("en-IN")}</h3>
            <span className="text-[9px] font-semibold text-rose-600 flex items-center gap-0.5 mt-1.5">
              <ArrowDownRight size={10} /> Outflow billing logs
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <DollarSign size={20} />
          </div>
        </Card>

        {/* Net Profit */}
        <Card className="p-5 bg-white border border-slate-100 shadow-sm rounded-[20px] flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estimated Net Profit</p>
            <h3 className="text-xl font-black text-slate-850 mt-1">₹{(pnlData?.profit || 0).toLocaleString("en-IN")}</h3>
            <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-1.5">
              <ArrowUpRight size={10} /> positive income
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Award size={20} />
          </div>
        </Card>

        {/* Net Margin */}
        <Card className="p-5 bg-white border border-slate-100 shadow-sm rounded-[20px] flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Net Profit Margin</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{profitMarginPercent}%</h3>
            <span className="text-[9px] font-semibold text-slate-450 flex items-center gap-0.5 mt-1.5">
              Target margin: &gt; 15%
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <BarChart2 size={20} />
          </div>
        </Card>

      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: "revenue", label: "Revenue Trend", icon: TrendingUp },
          { id: "profit", label: "Profit Margins", icon: Award },
          { id: "products", label: "Top Inventory", icon: Package },
          { id: "loyalty", label: "Loyal Customers", icon: Users },
          { id: "expenses", label: "Expenses Split", icon: DollarSign }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? "border-indigo-600 text-indigo-650" 
                  : "border-transparent text-slate-400 hover:text-slate-650"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Interactive Charts display */}
      <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-[24px]">
        
        {/* REVENUE TAB */}
        {activeTab === "revenue" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Sales Outflow Trend</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Gross revenue comparison</p>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData?.charts?.trend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsTrendColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "11px", fontWeight: "600" }}
                    formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Sales"]}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#analyticsTrendColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* PNL TAB */}
        {activeTab === "profit" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">MTD Net Income & Profit</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">P&L performance overview</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Revenue", amount: pnlData?.revenue || 0, fill: "#6366F1" },
                    { name: "Expenses", amount: pnlData?.expenses || 0, fill: "#EF4444" },
                    { name: "Profit", amount: pnlData?.profit || 0, fill: "#10B981" }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "11px" }}
                      formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Amount"]}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {
                        [
                          { fill: "#6366F1" },
                          { fill: "#EF4444" },
                          { fill: "#10B981" }
                        ].map((entry, index) => <Cell key={index} fill={entry.fill} />)
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-650 uppercase tracking-widest">P&L Statement</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500">Gross Revenue</span>
                  <span className="text-xs font-black text-slate-800">₹{(pnlData?.revenue || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500">Outflow Expenses</span>
                  <span className="text-xs font-black text-slate-800">- ₹{(pnlData?.expenses || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-700">Net Profit</span>
                  <span className="text-xs font-black text-indigo-700">₹{(pnlData?.profit || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500">Business Margin Rating</span>
                  <Badge variant={profitMarginPercent >= 15 ? "success" : "warning"} className="text-[9px] font-bold">
                    {profitMarginPercent >= 15 ? "Healthy" : "Low Margin"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Top 10 Selling Products</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Revenue per inventory item</p>
            </div>
            {topProducts.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} axisLine={false} width={120} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "11px" }}
                      formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Sales"]}
                    />
                    <Bar dataKey="amount" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs">
                No inventory sales records found yet.
              </div>
            )}
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === "loyalty" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Top Valuable Customers</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Revenue contributions by buyer</p>
            </div>
            {topCustomers.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomers} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "11px" }}
                      formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Total Paid"]}
                    />
                    <Bar dataKey="amount" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs">
                No customer transaction records found.
              </div>
            )}
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === "expenses" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Expense Category Distribution</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Outflow category-wise distribution</p>
            </div>
            {dashboardData?.charts?.expenses && dashboardData.charts.expenses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-80 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.charts.expenses}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {dashboardData.charts.expenses.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "11px" }}
                        formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Expense"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-650 uppercase tracking-widest">Expenses Breakdown</h4>
                  <div className="space-y-2">
                    {dashboardData.charts.expenses.map((item, index) => (
                      <div key={item.name} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-xl">
                        <span className="font-semibold text-slate-650 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          {item.name}
                        </span>
                        <span className="font-extrabold text-slate-800">
                          ₹{item.value.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs">
                No expense entries logged for this period.
              </div>
            )}
          </div>
        )}

      </Card>

    </div>
  );
}
