import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { BUTTONS, TYPOGRAPHY } from '../utils/networkConstants';

export default function SetCreditModal({ isOpen, partner, onClose }) {
  const [step, setStep] = useState(1);
  const [limit, setLimit] = useState('');
  const [terms, setTerms] = useState('30');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setStep(2);
    // Simulate API call
    setTimeout(() => {
      onClose();
      setStep(1);
      setLimit('');
    }, 2000);
  };

  const handleClose = () => {
    setStep(1);
    setLimit('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="credit-modal-title">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden focus:outline-none" tabIndex="-1">
        {step === 1 ? (
          <>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 id="credit-modal-title" className="text-lg font-black text-slate-900">Set Credit Limit</h2>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl" aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl mb-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-sm shrink-0">
                  {partner?.name?.[0] || 'P'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{partner?.name || 'Partner'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">B2B Trade Credit</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="credit-limit" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Credit Limit (₹) <span className="text-rose-500">*</span></label>
                  <Input id="credit-limit" type="number" placeholder="e.g. 50000" value={limit} onChange={e => setLimit(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="credit-terms" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Payment Terms <span className="text-rose-500">*</span></label>
                  <select id="credit-terms" value={terms} onChange={e => setTerms(e.target.value)} className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all">
                    <option value="15">Net 15 Days</option>
                    <option value="30">Net 30 Days</option>
                    <option value="45">Net 45 Days</option>
                    <option value="60">Net 60 Days</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={handleClose} className={`${BUTTONS.ghost} flex-1`}>Cancel</button>
                <button type="submit" className={`${BUTTONS.primary} flex-1`}>Set Limit</button>
              </div>
            </form>
          </>
        ) : (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">Limit Updated</h2>
            <p className="text-xs text-slate-500 font-medium">Credit terms for {partner?.name} have been updated.</p>
          </div>
        )}
      </div>
    </div>
  );
}
