import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import FixedChartContainer from "./FixedChartContainer";
import API from "../../../services/apiClient";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const SalesTrend = ({ demoMode = false }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrend = async () => {
    setLoading(true);
    try {
      const res = await API.get("/sales/trend");
      const payload = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.value)
        ? res.data.value
        : [];
      const formatted = payload.map((r) => ({
        date: r.date,
        total_sales: Number(r.total_sales || r.total || r.amount || 0),
      }));
      setData(formatted);
    } catch (err) {
      console.error("SalesTrend fetch error:", err.message || err);
      if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
        const demo = [
          { date: "2025-11-01", total_sales: 1200 },
          { date: "2025-11-02", total_sales: 1500 },
          { date: "2025-11-03", total_sales: 1700 },
        ];
        setData(demo);
        toast((t) => (
          <span>
            /api/sales/trend unreachable — showing demo data. <button className="ml-2 underline" onClick={() => toast.dismiss(t.id)}>Dismiss</button>
          </span>
        ));
      } else {
        toast.error("Failed to load sales trend data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (demoMode) {
      const demo = [
        { date: "2025-11-01", total_sales: 1200 },
        { date: "2025-11-02", total_sales: 1500 },
        { date: "2025-11-03", total_sales: 1700 },
      ];
      setData(demo);
      setLoading(false);
      return;
    }

    fetchTrend();
  }, [demoMode]);

  return (
    <div className="bg-white/10 rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4">📈 Sales Trend</h3>
      <FixedChartContainer minHeight={260}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-primary-400" size={28} />
          </div>
        ) : data.length === 0 ? (
          <p className="text-center text-indigo-200 italic py-6">No sales trend data.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip
                contentStyle={{ backgroundColor: "rgba(0,0,0,0.75)", border: "none", borderRadius: 8 }}
                itemStyle={{ color: "#fff" }}
              />
              <Line type="monotone" dataKey="total_sales" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </FixedChartContainer>
    </div>
  );
};

export default SalesTrend;
