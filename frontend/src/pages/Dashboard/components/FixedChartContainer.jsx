import React from "react";

/**
 * FixedChartContainer
 * Ensures Recharts' ResponsiveContainer has a sized parent so it can compute
 * positive width/height. Use as a lightweight wrapper around charts.
 *
 * Props:
 * - minHeight: number (px) default 260
 * - className, style
 */
const FixedChartContainer = ({ children, minHeight = 260, className = "", style = {} }) => {
  return (
    <div
      style={{ width: "100%", minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight, position: "relative", ...style }}
      className={className}
    >
      {children}
    </div>
  );
};

export default FixedChartContainer;
