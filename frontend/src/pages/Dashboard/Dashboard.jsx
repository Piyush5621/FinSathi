import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SmartSummary from "./components/SmartSummary";
import NotificationPanel from "./components/NotificationPanel";
import DashboardMetrics from "../../components/DashboardMetrics";
import BillingMetrics from "../../components/BillingMetrics";
import FilterBar from "../../components/FilterBar";
import TopProductsChart from "../../components/TopProductsChart";
import TopCustomersChart from "../../components/TopCustomersChart";
import SalesTrendChart from "../../components/SalesTrendChart";
import API from "../../services/apiClient";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [salesSummary, setSalesSummary] = useState({});
  const [dashboardData, setDashboardData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [activeView, setActiveView] = useState("Dashboard");
  const [filterParams, setFilterParams] = useState({
    type: 'month',
    month: new Date().getMonth() + 1
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, salesSummaryRes, dashboardRes] = await Promise.all([
        API.get("/summary"),
        API.get("/sales/summary"),
        API.get("/dashboard/data"),
      ]);

      setSummary(summaryRes.data);
      setSalesSummary(salesSummaryRes.data || {});
      setDashboardData(dashboardRes.data || null);
    } catch (err) {
      setError(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleString());
    }
  };

  useEffect(() => {
    fetchData();
    // small resize after mount so charts measure correctly
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 120);
    return () => clearTimeout(t);
  }, []);

  const handleFilter = (filters) => {
    setFilterParams(filters);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ClipLoader size={36} color="#fff" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {activeView === "Overview" || activeView === "Dashboard" ? (
        <>
          {/* Dashboard Metrics */}
          <DashboardMetrics data={dashboardData?.metrics} />

          {/* Billing Metrics */}
          <BillingMetrics />

          {/* Filter Bar */}
          <FilterBar onFilter={handleFilter} />

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <SalesTrendChart
                month={filterParams.type === 'month' ? filterParams.month : undefined}
                startDate={filterParams.type === 'range' ? filterParams.startDate : undefined}
                endDate={filterParams.type === 'range' ? filterParams.endDate : undefined}
              />
            </div>

            <TopProductsChart
              month={filterParams.type === 'month' ? filterParams.month : undefined}
              startDate={filterParams.type === 'range' ? filterParams.startDate : undefined}
              endDate={filterParams.type === 'range' ? filterParams.endDate : undefined}
            />
            <TopCustomersChart
              month={filterParams.type === 'month' ? filterParams.month : undefined}
              startDate={filterParams.type === 'range' ? filterParams.startDate : undefined}
              endDate={filterParams.type === 'range' ? filterParams.endDate : undefined}
            />
          </div>

          {/* Recent Transactions (New) */}
          <div className="glass-card p-6 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
              <button onClick={() => setActiveView("Billing")} className="text-sm text-indigo-400 hover:text-indigo-300 transition">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="text-xs uppercase font-bold tracking-wider bg-slate-900/50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {(!dashboardData?.recentSales || dashboardData.recentSales.length === 0) ? (
                    <tr><td colSpan="4" className="text-center py-4">No recent transactions</td></tr>
                  ) : dashboardData?.recentSales?.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 text-white font-medium">{sale.customerName}</td>
                      <td className="px-4 py-3 text-xs md:text-sm">{new Date(sale.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${sale.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          sale.payment_status === 'unpaid' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-700 text-slate-300'
                          }`}>
                          {sale.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">₹{sale.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Smart Summary and Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl h-[320px] overflow-y-auto custom-scrollbar animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <SmartSummary data={summary?.insights || []} />
            </div>
            <div className="lg:col-span-2 glass-card p-6 rounded-2xl h-[300px] overflow-y-auto custom-scrollbar animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <NotificationPanel />
            </div>
          </div>

          <p className="text-xs text-gray-400 text-right mt-4">Last Real-time Update: {lastUpdated}</p>

          {typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV && (
            <div className="fixed bottom-4 right-4 z-50">
              <details className="bg-black/60 text-white p-3 rounded-lg backdrop-blur-md max-w-sm">
                <summary className="cursor-pointer font-medium">Debug: sales summary</summary>
                <pre className="text-xs max-h-64 overflow-auto mt-2">{JSON.stringify(salesSummary, null, 2)}</pre>
              </details>
            </div>
          )}
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <ClipLoader size={50} color="#fff" className="mb-6" />
          <h2 className="text-2xl font-semibold mb-3 text-white">{activeView}</h2>
          <p className="text-white/80 mb-6">This section is under development. Coming soon!</p>
          <button onClick={() => setActiveView("Dashboard")} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all">Back to Dashboard</button>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
