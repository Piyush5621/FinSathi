import React, { memo } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";

const StatCard = memo(({ title, value, subtitle, icon }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45 }}
      className="glass-light neo-dark rounded-xl p-5 relative overflow-hidden group"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-accent-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-start justify-between relative">
        <div>
          <h3 className="text-sm text-dark-800 font-medium">{title}</h3>
          <p className="text-2xl font-bold text-white mt-2 tracking-tight">{value}</p>
          {subtitle && (
            <motion.p 
              initial={{ opacity: 0.8 }}
              whileHover={{ opacity: 1 }}
              className="text-xs text-dark-600 mt-1"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
        {icon && (
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="text-white/90 bg-gradient-to-br from-primary-500 to-accent-500 p-2.5 rounded-xl shadow-lg"
          >
            {icon}
          </motion.div>
        )}
      </div>

      {/* Subtle highlight effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
});

export default StatCard;
