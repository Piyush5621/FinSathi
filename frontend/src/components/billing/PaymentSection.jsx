
import { CreditCard, Banknote, History } from "lucide-react";

const PaymentSection = ({ method, status, amountReceived, total, onChange }) => {
  return (
    <div className="p-[20px] space-y-[24px]">
      <div>
        <h3 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider mb-[12px]">Payment Method</h3>
        <div className="grid grid-cols-3 gap-[8px]">
          {[
            { id: "cash", label: "Cash", icon: <Banknote size={18} /> },
            { id: "upi", label: "UPI", icon: <CreditCard size={18} /> },
            { id: "card", label: "Card", icon: <CreditCard size={18} /> }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => onChange("method", m.id)}
              className={`flex flex-col items-center justify-center p-[12px] rounded-lg border transition-all ${
                method === m.id
                  ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                  : 'border-[#E2E8F0] text-[#64748B] hover:border-[#3B82F6]/50 hover:bg-[#F8FAFC]'
              }`}
            >
              {m.icon}
              <span className="text-[13px] font-medium mt-[4px]">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wider mb-[12px]">Payment Status</h3>
        <div className="flex gap-[8px]">
          <button
            onClick={() => onChange("status", "paid")}
            className={`flex-1 py-[10px] rounded-lg text-[14px] font-semibold transition ${
              status === "paid" ? 'bg-[#DCFCE7] text-[#15803D] border border-[#15803D]/30' : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
            }`}
          >
             Paid in Full
          </button>
          <button
            onClick={() => onChange("status", "unpaid")}
            className={`flex-1 py-[10px] rounded-lg text-[14px] font-semibold transition ${
              status === "unpaid" ? 'bg-[#FEE2E2] text-[#B91C1C] border border-[#B91C1C]/30' : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
            }`}
          >
             Unpaid (Credit)
          </button>
          <button
            onClick={() => onChange("status", "partial")}
            className={`flex-1 py-[10px] rounded-lg text-[14px] font-semibold transition ${
              status === "partial" ? 'bg-[#FEF3C7] text-[#B45309] border border-[#B45309]/30' : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
            }`}
          >
             Partial
          </button>
        </div>
      </div>

      {status === 'partial' && (
        <div>
          <label className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-[4px] block">Amount Received (₹)</label>
          <input
            type="number"
            value={amountReceived}
            onChange={(e) => onChange("amountReceived", parseFloat(e.target.value) || 0)}
            className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-[12px] font-bold text-[#0F172A] focus:ring-2 focus:ring-[#3B82F6]/50 outline-none"
          />
          <div className="mt-[8px] flex justify-between text-[13px]">
             <span className="text-[#64748B]">Remaining Balance:</span>
             <span className="font-bold text-[#B91C1C]">₹{Math.max(0, total - amountReceived).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSection;
