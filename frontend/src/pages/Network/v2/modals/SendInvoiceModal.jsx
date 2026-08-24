import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { BUTTONS, TYPOGRAPHY } from '../utils/networkConstants';
import API from '../../../../services/apiClient';
import toast from 'react-hot-toast';

export default function SendInvoiceModal({ isOpen, onClose, onSuccess, initialPartner }) {
  const [partnerId, setPartnerId] = useState(initialPartner?.id || '');
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product_name: '', quantity: 1, purchase_price: '', total: 0 }
  ]);

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPartners();
      if (initialPartner) {
        setPartnerId(initialPartner.partner?.id || initialPartner.id || '');
      }
    }
  }, [isOpen, initialPartner]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/network/connections?status=accepted');
      setPartners(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load partners for invoice sending:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleItemChange = (index, field, value) => {
    const next = [...items];
    next[index][field] = value;
    if (field === 'quantity' || field === 'purchase_price') {
      const q = Number(next[index].quantity || 0);
      const p = Number(next[index].purchase_price || 0);
      next[index].total = q * p;
    }
    setItems(next);
  };

  const addItem = () => {
    setItems([...items, { product_name: '', quantity: 1, purchase_price: '', total: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + Number(item.total || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partnerId) {
      toast.error('Please select a connected buyer');
      return;
    }
    if (items.some(i => !i.product_name || Number(i.quantity) <= 0 || Number(i.purchase_price) <= 0)) {
      toast.error('Please fill in valid item names, quantities, and prices');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/api/network/trade/send', {
        receiver_id: partnerId,
        invoice_no: invoiceNo,
        items: items.map(i => ({
          product_name: i.product_name,
          quantity: Number(i.quantity),
          purchase_price: Number(i.purchase_price),
          selling_price: Number(i.purchase_price) * 1.2,
          total: Number(i.total)
        })),
        notes,
        due_date: dueDate || null
      });

      toast.success(`Invoice #${invoiceNo} dispatched to buyer!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.summary || err.response?.data?.error || 'Failed to dispatch invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-slate-100 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Dispatch B2B Invoice</h2>
            <p className="text-xs text-slate-500">Send an electronic bill to a connected buyer.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Select Buyer <span className="text-rose-500">*</span></label>
            <select
              value={partnerId}
              onChange={e => setPartnerId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select connected buyer...</option>
              {partners.map(p => {
                const id = p.partner?.id || p.partner_id || p.id;
                const name = p.partner?.business_name || p.business_name;
                return <option key={id} value={id}>{name} ({p.partner?.city || 'India'})</option>;
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Invoice No. <span className="text-rose-500">*</span></label>
              <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} required />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Payment Due Date</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Invoice Items</label>
              <button type="button" onClick={addItem} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <Plus size={13} /> Add Item
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <input
                  type="text"
                  placeholder="Item Name (e.g. Atta 5kg)"
                  value={item.product_name}
                  onChange={e => handleItemChange(idx, 'product_name', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold"
                  required
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                  className="w-16 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center font-semibold"
                  min="1"
                  required
                />
                <input
                  type="number"
                  placeholder="Price ₹"
                  value={item.purchase_price}
                  onChange={e => handleItemChange(idx, 'purchase_price', e.target.value)}
                  className="w-20 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-right font-semibold"
                  min="0"
                  step="0.01"
                  required
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-rose-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            <div className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl text-xs font-bold text-slate-700">
              <span>Total Invoice Amount:</span>
              <span className="text-sm font-black text-indigo-700">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Notes / Terms</label>
            <input
              type="text"
              placeholder="e.g. 5% GST included, 30 days credit terms"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
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
              {submitting ? 'Dispatching...' : <><Send size={13} /> Dispatch to Buyer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
