import React, { useState, useEffect } from 'react';
import { Banknote, QrCode, CreditCard, Building, BookOpen, Layers, CheckCircle2, ArrowRight } from 'lucide-react';

const PaymentSection = ({ 
  method, 
  status, 
  amountReceived, 
  total, 
  splitDetails = { cash: 0, upi: 0, card: 0 },
  onChange,
  onSplitChange 
}) => {
  const [cashTendered, setCashTendered] = useState(amountReceived || total || 0);

  // Sync cash tendered with total if in cash mode and not manually set
  useEffect(() => {
    if (method === 'cash' && status === 'paid' && (!cashTendered || cashTendered < total)) {
      setCashTendered(total);
      onChange("amountReceived", total);
    }
  }, [method, status, total]);

  const changeDue = Math.max(0, (cashTendered || 0) - total);

  const handleDenominationClick = (denom) => {
    const nextAmount = (cashTendered || 0) + denom;
    setCashTendered(nextAmount);
    onChange("amountReceived", total); // invoice amount paid is full, but customer gave extra cash
  };

  const handleExactCash = () => {
    setCashTendered(total);
    onChange("amountReceived", total);
  };

  return (
    <div className="p-4 space-y-4">
      {/* 1. Payment Method Pills */}
      <div>
        <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider block mb-2">
          Payment Method
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {[
            { id: "cash", label: "Cash", icon: <Banknote size={14} />, key: "F4" },
            { id: "upi", label: "UPI QR", icon: <QrCode size={14} />, key: "F5" },
            { id: "card", label: "Card", icon: <CreditCard size={14} /> },
            { id: "netbanking", label: "Net Bank", icon: <Building size={14} /> },
            { id: "khata", label: "Khata (Udhaar)", icon: <BookOpen size={14} />, key: "F6" },
            { id: "split", label: "Split Pay", icon: <Layers size={14} /> },
          ].map((m) => {
            const isSelected = method === m.id || (m.id === 'khata' && status === 'unpaid');
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  if (m.id === 'khata') {
                    onChange("method", "cash");
                    onChange("status", "unpaid");
                    onChange("amountReceived", 0);
                  } else if (m.id === 'split') {
                    onChange("method", "split");
                    onChange("status", "paid");
                  } else {
                    onChange("method", m.id);
                    onChange("status", "paid");
                    onChange("amountReceived", total);
                  }
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-app-primary bg-app-primary/10 text-app-primary font-bold shadow-xs'
                    : 'border-app-border bg-app-surface text-app-text-secondary hover:border-app-border-hover hover:text-app-text'
                }`}
              >
                <div className="mb-1">{m.icon}</div>
                <span className="text-[10px] leading-none">{m.label}</span>
                {m.key && (
                  <span className="text-[8px] font-mono text-app-text-muted mt-0.5 opacity-80">{m.key}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CASH CHANGE CALCULATOR (When Cash is selected and Paid) */}
      {method === 'cash' && status === 'paid' && (
        <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-bold text-app-text">
            <span>Cash Tendered / Received</span>
            <span className="font-mono text-sm text-app-primary">₹{cashTendered || 0}</span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleExactCash}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-app-primary text-white hover:bg-app-primary/90 transition-colors cursor-pointer"
            >
              Exact (₹{Math.round(total)})
            </button>
            {[100, 200, 500, 2000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setCashTendered(amt)}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-app-surface border border-app-border hover:border-app-primary/40 text-app-text transition-colors cursor-pointer"
              >
                ₹{amt}
              </button>
            ))}
            <div className="flex-1 min-w-[80px]">
              <input
                type="number"
                min="0"
                placeholder="Custom ₹"
                value={cashTendered || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setCashTendered(val);
                }}
                className="w-full text-right font-bold text-xs bg-app-surface border border-app-border rounded-lg px-2 py-1 outline-none focus:border-app-primary text-app-text"
              />
            </div>
          </div>

          {/* Change Display */}
          <div className="flex items-center justify-between pt-2 border-t border-app-border/80">
            <span className="text-[11px] font-bold text-app-text-secondary">
              Change to Return to Customer:
            </span>
            <span className={`text-sm font-black font-mono ${changeDue > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-app-text'}`}>
              ₹{changeDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* 3. SPLIT PAYMENT WORKFLOW */}
      {method === 'split' && (
        <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl space-y-2 animate-fadeIn">
          <span className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider block">
            Split Payment Amounts
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-app-text-muted font-semibold block mb-1">Cash (₹)</label>
              <input
                type="number"
                min="0"
                value={splitDetails.cash || ""}
                onChange={(e) => onSplitChange?.({ ...splitDetails, cash: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-bold bg-app-surface border border-app-border rounded-lg p-1.5 text-app-text focus:border-app-primary outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-app-text-muted font-semibold block mb-1">UPI (₹)</label>
              <input
                type="number"
                min="0"
                value={splitDetails.upi || ""}
                onChange={(e) => onSplitChange?.({ ...splitDetails, upi: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-bold bg-app-surface border border-app-border rounded-lg p-1.5 text-app-text focus:border-app-primary outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-app-text-muted font-semibold block mb-1">Card (₹)</label>
              <input
                type="number"
                min="0"
                value={splitDetails.card || ""}
                onChange={(e) => onSplitChange?.({ ...splitDetails, card: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-bold bg-app-surface border border-app-border rounded-lg p-1.5 text-app-text focus:border-app-primary outline-none"
              />
            </div>
          </div>
          <div className="flex justify-between items-center text-[11px] pt-1 text-app-text-secondary font-semibold">
            <span>Allocated: ₹{((splitDetails.cash || 0) + (splitDetails.upi || 0) + (splitDetails.card || 0)).toFixed(2)}</span>
            <span className={Math.abs(total - ((splitDetails.cash || 0) + (splitDetails.upi || 0) + (splitDetails.card || 0))) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}>
              Remaining: ₹{Math.max(0, total - ((splitDetails.cash || 0) + (splitDetails.upi || 0) + (splitDetails.card || 0))).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* 4. Payment Status Selector */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider shrink-0">
          Payment Status
        </label>
        <div className="inline-flex rounded-lg border border-app-border bg-app-surface p-0.5 text-xs font-bold">
          {[
            { id: "paid", label: "Paid", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
            { id: "partial", label: "Partial", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
            { id: "unpaid", label: "Khata (Due)", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange("status", s.id)}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                status === s.id
                  ? `${s.color} shadow-xs font-black`
                  : 'text-app-text-secondary hover:text-app-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Partial Payment Amount Input */}
      {status === 'partial' && (
        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2 animate-fadeIn">
          <label className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
            Amount Received Now (₹)
          </label>
          <input
            type="number"
            min="0"
            max={total}
            value={amountReceived}
            onChange={(e) => onChange("amountReceived", parseFloat(e.target.value) || 0)}
            className="w-full bg-app-surface border border-amber-300 dark:border-amber-800 rounded-lg px-3 py-1.5 text-xs font-bold text-app-text outline-none focus:border-amber-500"
          />
          <div className="flex justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200">
            <span>Customer Balance (Khata Due):</span>
            <span className="text-rose-600">₹{Math.max(0, total - (amountReceived || 0)).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSection;
