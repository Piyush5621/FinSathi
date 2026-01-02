import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Loader2 } from "lucide-react";
import API from "../../../services/apiClient";
import toast from "react-hot-toast";
import FixedChartContainer from "./FixedChartContainer";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const ChartCard = ({ title, data: externalData = null, demoMode = false }) => {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  /** 🔄 Fetch sales data from backend */
  const fetchSales = async (force = false) => {
    // Prevent unnecessary refetch if within cache window
    if (!force && lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
      return;
    }

    setLoading(true);
    try {
      const res = await API.get("/sales");
      // Backend already returns [{ name, value }] in our implementation.
      // Detect that shape and use it directly; otherwise attempt to format fallback fields.
      // supabase/our API sometimes returns a wrapper like { value: [...], Count }
      const payload = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.value)
        ? res.data.value
        : [];
      let formatted = [];
      if (payload.length > 0 && payload[0].hasOwnProperty("name") && payload[0].hasOwnProperty("value")) {
        formatted = payload;
      } else {
        formatted = payload.map((item) => ({
          name: item.date
            ? new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
            : item.name || "",
          value: item.amount ?? item.value ?? 0,
        }));
      }

      setSalesData(formatted.filter((d) => d && (typeof d.value === "number" || !isNaN(Number(d.value)))));
      setLastFetchTime(Date.now());
    } catch (err) {
      console.error("Sales fetch error:", err.message);
      // In dev mode, fall back to demo data so the UI remains usable when backend is down
      if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
        const demo = [
          { name: "Mon", value: 1200 },
          { name: "Tue", value: 1500 },
          { name: "Wed", value: 1700 },
          { name: "Thu", value: 1400 },
          { name: "Fri", value: 1900 },
          { name: "Sat", value: 2200 },
          { name: "Sun", value: 2000 },
        ];
        setSalesData(demo);
        toast((t) => (
          <span>
            Backend unreachable — showing demo data. <button className="ml-2 underline" onClick={() => toast.dismiss(t.id)}>Dismiss</button>
          </span>
        ));
      } else {
        toast.error("Failed to load sales data ❌");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If demo mode is active, show demo data and skip fetching
    if (demoMode) {
      const demo = [
        { name: "Mon", value: 1200 },
        { name: "Tue", value: 1500 },
        { name: "Wed", value: 1700 },
        { name: "Thu", value: 1400 },
        { name: "Fri", value: 1900 },
        { name: "Sat", value: 2200 },
        { name: "Sun", value: 2000 },
      ];
      setSalesData(demo);
      setLoading(false);
      return;
    }

    // If parent passed data prop, use it directly (normalized in Dashboard)
    if (Array.isArray(externalData) && externalData.length > 0) {
      setSalesData(externalData);
      setLoading(false);
      return;
    }

    fetchSales();
  }, [demoMode, externalData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.6 }}
      className="glass-light neo-dark rounded-2xl p-6 relative overflow-hidden group animate-gradient-x bg-gradient-to-r from-primary-900/30 via-accent-900/20 to-primary-900/30"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title || "Sales Overview"}</h3>
        <button
          onClick={() => fetchSales(true)} // Force refresh
          className="text-xs bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 px-4 py-2 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-primary-500/20"
        >
          <span className="flex items-center gap-2">
            {lastFetchTime ? (
              <>
                <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
                Last updated {new Date(lastFetchTime).toLocaleTimeString()}
              </>
            ) : (
              "Refresh"
            )}
          </span>
        </button>
      </div>

  {/* Chart Section */}
  <FixedChartContainer minHeight={300}>
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-10"
          >
            <div className="relative">
              <Loader2 className="animate-spin text-primary-400" size={28} />
              <div className="absolute inset-0 animate-pulse-slow blur-sm">
                <Loader2 className="text-accent-400" size={28} />
              </div>
            </div>
            <p className="ml-3 text-dark-700 animate-pulse">
              Fetching latest data...
            </p>
          </motion.div>
        ) : salesData.length === 0 ? (
          <p className="text-center text-indigo-200 italic py-6">
            No sales data found.
          </p>
        ) : (
          <div className="relative w-full h-full">
            {/* Chart */}
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis dataKey="name" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.7)",
                  borderRadius: "8px",
                  border: "none",
                }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#colorGradient)"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#10b981",
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
                activeDot={{
                  r: 6,
                  fill: "#10b981",
                  strokeWidth: 3,
                  stroke: "#fff",
                }}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
            </LineChart>
            </ResponsiveContainer>

            {/* No-data overlay when all values are zero */}
            {salesData.every((d) => Number(d.value) === 0) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg pointer-events-none">
                <div className="text-center">
                  <p className="text-white font-semibold text-lg">No data to display</p>
                  <p className="text-white/80 text-sm">All values are zero — try changing the date range or check your data source.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </FixedChartContainer>
    </motion.div>
  );
};

export default ChartCard;
