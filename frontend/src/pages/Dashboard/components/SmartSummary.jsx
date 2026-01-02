import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

const SmartSummary = ({ data }) => {
  // Sample fallback summary if no AI data
  const defaultSummary = [
    { label: "Sales Growth", value: "+12%", trend: "up" },
    { label: "Customer Retention", value: "72%", trend: "up" },
    { label: "Pending Invoices", value: "12", trend: "neutral" },
    { label: "Profit Margin", value: "-3%", trend: "down" },
  ];

  const summaryData = Array.isArray(data) && data.length > 0
    ? data.map((item) => ({
      label: item.includes("Sales")
        ? "Sales Performance"
        : item.includes("Customer")
          ? "Customer Activity"
          : "Business Insight",
      value: item,
      trend: item.includes("increased")
        ? "up"
        : item.includes("decreased")
          ? "down"
          : "neutral",
    }))
    : defaultSummary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full overflow-y-auto custom-scrollbar"
    >
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Activity size={18} /> Smart Business Summary
      </h3>

      <div className="space-y-4">
        {summaryData.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-white/90">{item.label}</p>
              <p className="text-xs text-white/60 truncate max-w-[200px]">
                {item.value}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {item.trend === "up" && (
                <>
                  <TrendingUp size={18} className="text-emerald-400" />
                  <span className="text-emerald-400 font-semibold text-sm">
                    Up
                  </span>
                </>
              )}
              {item.trend === "down" && (
                <>
                  <TrendingDown size={18} className="text-red-400" />
                  <span className="text-red-400 font-semibold text-sm">
                    Down
                  </span>
                </>
              )}
              {item.trend === "neutral" && (
                <span className="text-gray-300 font-semibold text-sm">Stable</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SmartSummary;
