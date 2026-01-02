import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

const DarkModeToggle = ({ isDark, onToggle }) => {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className="relative p-2 rounded-full glass-light neo-dark overflow-hidden group"
    >
      <div className="relative z-10">
        {isDark ? (
          <Moon size={20} className="text-dark-800" />
        ) : (
          <Sun size={20} className="text-dark-800" />
        )}
      </div>

      {/* Animated background */}
      <motion.div
        initial={false}
        animate={{
          backgroundColor: isDark ? "rgba(30, 41, 59, 0.8)" : "rgba(219, 234, 254, 0.8)"
        }}
        className="absolute inset-0 transition-colors duration-300"
      />

      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute top-0 left-0 w-1 h-1 rounded-full bg-primary-400 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-1 h-1 rounded-full bg-accent-400 animate-pulse delay-150" />
      </div>
    </motion.button>
  );
};

export default DarkModeToggle;
