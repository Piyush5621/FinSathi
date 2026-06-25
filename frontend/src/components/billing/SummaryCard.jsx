
import { motion, AnimatePresence } from 'framer-motion';
import { IndianRupee } from 'lucide-react';

const SummaryCard = ({ subtotal = 0, gst = 0, discount = 0, total = 0, onFieldChange }) => {
  const safeValue = (v) => (isNaN(v) || v < 0 ? 0 : v);

  return (
    <div className="bg-slate-50/50 p-6 rounded-2xl sticky top-4 border border-slate-100">
      <h3 className="text-slate-800 text-sm font-bold mb-4">Summary</h3>

      <div className="space-y-3 text-sm">
        {/* Subtotal */}
        <div className="flex justify-between items-center text-xs font-medium">
          <span className="text-slate-500">Subtotal</span>
          <motion.span
            key={subtotal}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-800 font-bold"
          >
            ₹{safeValue(subtotal).toFixed(2)}
          </motion.span>
        </div>

        {/* Discount Input */}
        <div className="flex justify-between items-center text-xs font-medium border-t border-slate-100 pt-2">
          <span className="text-brand-blue font-bold">Discount %</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => onFieldChange('discount_percent', parseFloat(e.target.value) || 0)}
              className="w-16 bg-white border border-slate-200 rounded-lg text-center p-1 text-slate-800 font-semibold focus:ring-2 focus:ring-brand-blue/20 outline-none"
            />
            <span className="text-slate-500 font-bold">%</span>
          </div>
        </div>

        {/* GST Input */}
        <div className="flex justify-between items-center text-xs font-medium">
          <span className="text-slate-500">GST Amount</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-800 font-bold">₹{safeValue(gst).toFixed(2)}</span>
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-slate-200 pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-800 font-bold text-sm">Total</span>

            <AnimatePresence mode="wait">
              <motion.div
                key={total}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-1 text-brand-blue font-black text-xl"
              >
                ₹{safeValue(total).toFixed(2)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
