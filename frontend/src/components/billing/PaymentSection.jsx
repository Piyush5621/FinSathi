import React from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const PaymentSection = ({ method, status, onChange }) => {
  return (
    <div>
      <h3 className="text-indigo-400 text-lg font-semibold mb-4">Payment Details</h3>

      <div className="space-y-5">
        {/* 💳 Payment Method */}
        <div>
          <label className="text-indigo-400 font-semibold">Payment Method</label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              { value: 'cash', label: 'Cash', icon: <Banknote className="h-4 w-4" /> },
              { value: 'upi', label: 'UPI', icon: <Smartphone className="h-4 w-4" /> },
              { value: 'card', label: 'Card', icon: <CreditCard className="h-4 w-4" /> },
              { value: 'upi_only', label: 'UPI Only', icon: <Wallet className="h-4 w-4" /> },
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => onChange('method', m.value)}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl font-semibold transition-all border ${
                  method === m.value
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 💰 Payment Status */}
        <div>
          <label className="text-indigo-400 font-semibold mb-2 block">
            Payment Status
          </label>
          <div className="flex gap-3">
            {/* ✅ Paid */}
            <button
              onClick={() => onChange('status', 'paid')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-semibold transition-all ${
                status === 'paid'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700'
              }`}
            >
              <motion.div
                animate={{ scale: status === 'paid' ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                Paid
              </motion.div>
            </button>

            {/* ❌ Unpaid */}
            <button
              onClick={() => onChange('status', 'unpaid')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-semibold transition-all ${
                status === 'unpaid'
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-900/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700'
              }`}
            >
              <motion.div
                animate={{ scale: status === 'unpaid' ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="flex items-center gap-2"
              >
                <XCircle className="h-5 w-5" />
                Unpaid
              </motion.div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSection;
