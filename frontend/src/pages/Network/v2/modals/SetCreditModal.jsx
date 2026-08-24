import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle2 } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { BUTTONS, TYPOGRAPHY } from '../utils/networkConstants';
import API from '../../../../services/apiClient';
import toast from 'react-hot-toast';

export default function SetCreditModal({ isOpen, partner, onClose, onSuccess }) {
  const [partnerId, setPartnerId] = useState(partner?.id || '');
  const [limit, setLimit] = useState(partner?.credit_limit || '');
  const [terms, setTerms] = useState('30');
  const [dueDate, setDueDate] = useState('');
  const [partners, setPartners] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (partner) {
        setPartnerId(partner.id || partner.partner_id || partner.receiver_id || '');
        setLimit(partner.credit_limit || '');
      } else {
        fetchPartners();
      }
    }
  }, [isOpen, partner]);

  const fetchPartners = async () => {
    try {
      const res = await API.get('/network/connections?status=accepted');
      setPartners(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load partners:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partnerId || Number(limit) <= 0) {
      toast.error('Please select a partner and enter a valid credit limit');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/trade-credit', {
        buyer_id: partnerId,
        credit_limit: Number(limit),
        payment_terms_days: Number(terms),
        due_date: dueDate || null
      });

      toast.success('B2B Trade Credit limit updated successfully!');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.summary || err.response?.data?.error || 'Failed to update credit limit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-6 border border-slate-100 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Set B2B Trade Credit</h2>
            <p className="text-xs text-slate-500">Define mutual credit limit and net payment terms.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!partner && (
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Select Partner <span className="text-rose-500">*</span></label>
              <select
                value={partnerId}
                onChange={e => setPartnerId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select connected partner...</option>
                {partners.map(p => {
                  const id = p.partner?.id || p.partner_id || p.id;
                  const name = p.partner?.business_name || p.business_name;
                  return <option key={id} value={id}>{name}</option>;
                })}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Credit Ceiling (₹) <span className="text-rose-500">*</span></label>
            <Input type="number" placeholder="e.g. 50000" value={limit} onChange={e => setLimit(e.target.value)} required min="1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Terms (Days)</label>
              <select
                value={terms}
                onChange={e => setTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="15">Net 15 Days</option>
                <option value="30">Net 30 Days</option>
                <option value="45">Net 45 Days</option>
                <option value="60">Net 60 Days</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Settlement Due Date</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? 'Updating...' : <><CreditCard size={13} /> Save Credit Terms</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
