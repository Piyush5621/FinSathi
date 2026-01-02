import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import FixedChartContainer from "./FixedChartContainer";
import API from "../../../services/apiClient";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const SalesChart = ({ demoMode = false }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await API.get("/analytics/sales-summary");
      const payload = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.value) ? res.data.value : [];
      const formatted = payload.map((row) => ({
        name: row.date ? new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : row.date,
        value: Number(row.total_sales || row.total || row.amount || 0),
      }));
      setData(formatted);
    } catch (err) {
      console.error("SalesChart fetch error:", err.message || err);
      if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
        const demo = [
          { name: "01 Sep", value: 1200 },
          { name: "02 Sep", value: 1500 },
          { name: "03 Sep", value: 1700 },
          { name: "04 Sep", value: 1400 },
          { name: "05 Sep", value: 1900 },
        ];
        setData(demo);
        toast((t) => (
          <span>
            Analytics unreachable — showing demo data. <button className="ml-2 underline" onClick={() => toast.dismiss(t.id)}>Dismiss</button>
          </span>
        ));
      } else {
        toast.error("Failed to load sales chart data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (demoMode) {
      const demo = [
        { name: "01 Sep", value: 1200 },
        { name: "02 Sep", value: 1500 },
        { name: "03 Sep", value: 1700 },
        { name: "04 Sep", value: 1400 },
        { name: "05 Sep", value: 1900 },
      ];
      setData(demo);
      setLoading(false);
      return;
    }

    fetchSummary();
  }, [demoMode]);

  return (
    <div className="bg-white/10 rounded-2xl p-6 shadow-lg h-full">
      <h3 className="text-lg font-semibold mb-4">Sales (Daily)</h3>
      <FixedChartContainer minHeight={260}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-primary-400" size={28} />
          </div>
        ) : data.length === 0 ? (
          <p className="text-center text-indigo-200 italic py-6">No sales summary found.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip
                contentStyle={{ backgroundColor: "rgba(0,0,0,0.75)", border: "none", borderRadius: 8 }}
                itemStyle={{ color: "#fff" }}
              />
              <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </FixedChartContainer>
    </div>
  );
};

export default SalesChart;
