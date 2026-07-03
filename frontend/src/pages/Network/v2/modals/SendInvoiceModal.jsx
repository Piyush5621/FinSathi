import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { BUTTONS, TYPOGRAPHY } from '../utils/networkConstants';
import toast from 'react-hot-toast';

export default function SendInvoiceModal({ isOpen, onClose }) {
  const [partner, setPartner] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success(`Invoice ${invoiceNo} sent to ${partner}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="send-invoice-title">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-6 focus:outline-none" tabIndex="-1">
        <div className="flex justify-between items-center mb-6">
          <h2 id="send-invoice-title" className="text-lg font-black text-slate-900">Send Invoice</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Select Buyer <span className="text-rose-500">*</span></label>
            <select value={partner} onChange={e => setPartner(e.target.value)} required className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all">
              <option value="">Select connection...</option>
              <option value="Raj Traders">Raj Traders</option>
              <option value="Sharma Distributors">Sharma Distributors</option>
              <option value="Tech Start">Tech Start</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Invoice # <span className="text-rose-500">*</span></label>
              <Input placeholder="e.g. INV-1024" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} required />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Amount (₹) <span className="text-rose-500">*</span></label>
              <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Attach PDF (Optional)</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-colors">
              <p className="text-xs font-bold text-slate-600">Click to upload invoice PDF</p>
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100 flex gap-3">
            <button type="button" onClick={onClose} className={`${BUTTONS.ghost} flex-1`}>Cancel</button>
            <button type="submit" className={`${BUTTONS.primary} flex-1`}>
              <Send size={16} /> Send via Network
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
