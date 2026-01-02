import React from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";

const CircularProgress = ({ percent = 72, label = "Retention", comparison }) => {
  const size = 90;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  // Animation variants
  const circleVariants = {
    hidden: {
      strokeDashoffset: circumference,
    },
    visible: {
      strokeDashoffset: offset,
      transition: {
        duration: 1.5,
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.4 }}
      className="glass-light neo-dark rounded-xl p-4 flex items-center gap-4 group relative overflow-hidden"
    >
      {/* Background gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-accent-500/10 to-primary-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-x" />

      {/* SVG Progress Circle */}
      <div className="relative">
        <svg width={size} height={size} className="transform transition-transform group-hover:rotate-3 duration-500">
          <defs>
            <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g transform={`translate(${size / 2},${size / 2})`}>
            {/* Background circle */}
            <circle
              r={radius}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={stroke}
              fill="transparent"
              className="transition-all duration-300 group-hover:stroke-white/20"
            />
            {/* Progress circle */}
            <motion.circle
              r={radius}
              stroke="url(#circleGradient)"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={circumference}
              variants={circleVariants}
              initial="hidden"
              animate="visible"
              transform="rotate(-90)"
              filter="url(#glow)"
            />
            {/* Percentage text */}
            <motion.text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="middle"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5, ease: "backOut" }}
              className="text-lg font-bold"
              fill="white"
            >
              {percent}%
            </motion.text>
          </g>
        </svg>

        {/* Decorative dots */}
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-accent-400 rounded-full animate-pulse delay-150" />
      </div>

      {/* Label and comparison */}
      <div className="relative">
        <h4 className="text-sm font-medium text-dark-800">{label}</h4>
        {comparison && (
          <motion.p
            initial={{ opacity: 0.6 }}
            whileHover={{ opacity: 1 }}
            className="text-xs text-dark-600 mt-1 flex items-center gap-1"
          >
            vs last month
            <span className={`${
              comparison > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {comparison > 0 ? '↑' : '↓'} {Math.abs(comparison)}%
            </span>
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};

export default CircularProgress;
