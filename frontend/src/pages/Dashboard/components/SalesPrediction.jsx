import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import FixedChartContainer from "./FixedChartContainer";

const SalesPrediction = ({ data, demoMode = false }) => {
  // Simple moving average for predicted trend
  const chartData = useMemo(() => {
    // demo override
    if (demoMode) {
      return Array.from({ length: 7 }).map((_, i) => ({
        name: `Day ${i + 1}`,
        actual: [1200, 1500, 1700, 1400, 1900, 2200, 2000][i],
        predicted: Math.round(1500 + Math.sin(i) * 200),
      }));
    }

    if (!data || data.length === 0) return [];
    // Accept both shapes: { value } (our backend) or { amount }
    const sum = data.reduce((acc, item) => acc + (item.value ?? item.amount ?? 0), 0);
    const avg = sum / data.length;
    const predicted = Array.from({ length: 7 }).map((_, i) => ({
      name: `Day ${i + 1}`,
      actual: data[i]?.value ?? data[i]?.amount ?? avg,
      predicted: Math.round(avg + Math.sin(i) * 200),
    }));
    return predicted;
  }, [data]);

  return (
    <FixedChartContainer minHeight={300} className="relative">
      <h3 className="text-lg font-semibold text-white mb-4">
        📊 Sales Prediction (Next 7 Days)
      </h3>

      {/* If there's no chart data yet, show a friendly placeholder */}
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[220px] bg-white/5 rounded-lg">
          <p className="text-white/70">No prediction data available yet.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="name" stroke="#c7d2fe" />
            <YAxis stroke="#c7d2fe" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#34d399" strokeWidth={2} />
            <Line type="monotone" dataKey="predicted" stroke="#818cf8" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* No-data overlay when all values are zero */}
      {chartData.length > 0 && chartData.every((d) => Number(d.actual) === 0 && Number(d.predicted) === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg pointer-events-none">
          <div className="text-center">
            <p className="text-white font-semibold text-lg">No data to display</p>
            <p className="text-white/80 text-sm">Prediction and actual values are all zero — try adding demo data or check your backend.</p>
          </div>
        </div>
      )}
    </FixedChartContainer>
  );
};

export default SalesPrediction;
