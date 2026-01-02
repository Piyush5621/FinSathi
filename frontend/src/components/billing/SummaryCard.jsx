import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IndianRupee } from 'lucide-react';

const SummaryCard = ({ subtotal = 0, gst = 0, discount = 0, total = 0, onFieldChange }) => {
  const safeValue = (v) => (isNaN(v) || v < 0 ? 0 : v);

  return (
    <div className="bg-slate-800/90 backdrop-blur-md p-6 rounded-2xl shadow-lg sticky top-4 border border-slate-700">
      <h3 className="text-indigo-400 text-lg font-semibold mb-4">Summary</h3>

      <div className="space-y-3 text-sm">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Subtotal</span>
          <motion.span
            key={subtotal}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-100 font-medium"
          >
            ₹{safeValue(subtotal).toFixed(2)}
          </motion.span>
        </div>

        {/* Discount Input */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Discount</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => onFieldChange('discount', parseFloat(e.target.value) || 0)}
              className="w-20 bg-slate-900 border border-slate-600 rounded text-center p-1 text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-100">₹</span>
          </div>
        </div>

        {/* GST Input */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">GST</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={gst}
              onChange={(e) => onFieldChange('gst', parseFloat(e.target.value) || 0)}
              className="w-20 bg-slate-900 border border-slate-600 rounded text-center p-1 text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-100">₹</span>
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-slate-700 pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-indigo-300 font-semibold text-base">Total</span>

            <AnimatePresence mode="wait">
              <motion.div
                key={total}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-1 text-indigo-400 font-bold text-xl"
              >
                <IndianRupee className="h-5 w-5" />
                {safeValue(total).toFixed(2)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
