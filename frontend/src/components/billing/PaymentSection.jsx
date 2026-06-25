
import { CreditCard, Banknote } from 'lucide-react';

const PaymentSection = ({ method, status, amountReceived, total, onChange }) => {
  return (
    <div className="p-5 space-y-5">
      <div>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Payment Method</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "cash", label: "Cash", icon: <Banknote size={15} /> },
            { id: "upi", label: "UPI", icon: <CreditCard size={15} /> },
            { id: "card", label: "Card", icon: <CreditCard size={15} /> }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => onChange("method", m.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-[0.97] cursor-pointer ${
                method === m.id
                  ? 'border-brand-blue bg-blue-50/50 text-brand-blue font-semibold'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {m.icon}
              <span className="text-[11px] mt-1.5">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Payment Status</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onChange("status", "paid")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-[0.97] cursor-pointer ${
              status === "paid" ? 'bg-emerald-50 text-emerald-700 border-emerald-100/60' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
             Paid
          </button>
          <button
            onClick={() => onChange("status", "unpaid")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-[0.97] cursor-pointer ${
              status === "unpaid" ? 'bg-rose-50 text-rose-700 border-rose-100/60' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
             Unpaid
          </button>
          <button
            onClick={() => onChange("status", "partial")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-[0.97] cursor-pointer ${
              status === "partial" ? 'bg-amber-50 text-amber-700 border-amber-100/60' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
             Partial
          </button>
        </div>
      </div>

      {status === 'partial' && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Amount Received (₹)</label>
          <input
            type="number"
            value={amountReceived}
            onChange={(e) => onChange("amountReceived", parseFloat(e.target.value) || 0)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
          />
          <div className="flex justify-between text-[11px] font-semibold mt-1">
             <span className="text-slate-400">Remaining Balance:</span>
             <span className="font-bold text-rose-600">₹{Math.max(0, total - amountReceived).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSection;
