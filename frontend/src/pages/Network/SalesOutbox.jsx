import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { Send, CheckCircle2, Clock, Eye, Package, Plus, X, Loader2 } from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

const statusStyles = {
  Pending: 'text-amber-600 bg-amber-50 border-amber-200',
  Viewed: 'text-blue-600 bg-blue-50 border-blue-200',
  Accepted: 'text-sky-600 bg-sky-50 border-sky-200',
  Imported: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  Rejected: 'text-rose-600 bg-rose-50 border-rose-200',
};

const statusIcons = { Pending: Clock, Viewed: Eye, Accepted: CheckCircle2, Imported: Package, Rejected: X };

export default function SalesOutbox() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);

  // Send invoice form
  const [form, setForm] = useState({ receiver_id: '', invoice_no: '', invoice_date: '', notes: '' });
  const [items, setItems] = useState([{ product_name: '', sku: '', quantity: 1, purchase_price: 0, gst_percent: 0, unit: 'pcs', category: '' }]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [outboxRes, connRes] = await Promise.all([
        API.get('/trade/outbox'),
        API.get('/network/connections')
      ]);
      setTransactions(outboxRes.data?.data || []);
      setConnections(connRes.data?.data || []);
    } catch { toast.error('Failed to load sales outbox'); }
    finally { setLoading(false); }
  };

  const addItem = () => setItems(prev => [...prev, { product_name: '', sku: '', quantity: 1, purchase_price: 0, gst_percent: 0, unit: 'pcs', category: '' }]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.receiver_id) return toast.error('Select a receiver');
    if (items.length === 0 || !items[0].product_name) return toast.error('Add at least one product');
    setSending(true);
    try {
      await API.post('/trade/send', { ...form, items });
      toast.success('Invoice sent successfully!');
      setShowSendModal(false);
      setForm({ receiver_id: '', invoice_no: '', invoice_date: '', notes: '' });
      setItems([{ product_name: '', sku: '', quantity: 1, purchase_price: 0, gst_percent: 0, unit: 'pcs', category: '' }]);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  const getStatusTimeline = (status) => {
    const stages = ['Pending', 'Viewed', 'Accepted', 'Imported'];
    const rejectedAt = status === 'Rejected' ? stages.indexOf('Viewed') + 1 : -1;
    return stages.map((s, i) => ({
      stage: s, done: stages.indexOf(status) >= i,
      rejected: rejectedAt > -1 && i >= rejectedAt
    }));
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Send size={22} className="text-blue-600" /> Sales Outbox
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Track invoices you've sent to connected buyers.
          </p>
        </div>
        <Button onClick={() => setShowSendModal(true)} className="bg-blue-600 text-white border-none hover:bg-blue-700 font-bold flex items-center gap-2">
          <Plus size={15} /> Send Invoice
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} height="140px" rounded="rounded-[20px]" />)}</div>
      ) : transactions.length === 0 ? (
        <Card className="p-16 text-center rounded-[24px] border-slate-100 shadow-sm">
          <Send size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold text-sm">No invoices sent yet</p>
          <p className="text-slate-300 text-xs mt-1">Send your first invoice to a connected buyer</p>
          <Button onClick={() => setShowSendModal(true)} className="mt-4 bg-blue-600 text-white border-none hover:bg-blue-700 font-bold">
            Send Invoice
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {transactions.map(tx => {
            const StatusIcon = statusIcons[tx.status] || Clock;
            const timeline = getStatusTimeline(tx.status);
            return (
              <Card key={tx.id} className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                      {(tx.receiver?.business_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{tx.receiver?.business_name || 'Unknown Buyer'}</p>
                        <span className={`text-[9px] font-black border rounded-full px-2 py-0.5 ${statusStyles[tx.status]}`}>
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        Invoice #{tx.invoice_no} · {new Date(tx.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">₹{Number(tx.total_amount || 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Total Amount</p>
                  </div>
                </div>
                {/* Status timeline */}
                <div className="flex items-center gap-1 mt-4 pt-4 border-t border-slate-50">
                  {timeline.map((t, i) => (
                    <React.Fragment key={i}>
                      <div className={`flex items-center gap-1 text-[9px] font-bold ${
                        tx.status === 'Rejected' && t.stage !== 'Pending' ? 'text-rose-400' :
                        t.done ? 'text-indigo-600' : 'text-slate-300'
                      }`}>
                        <div className={`w-3 h-3 rounded-full border-2 transition-all ${
                          tx.status === 'Rejected' && t.stage !== 'Pending' ? 'border-rose-300 bg-rose-100' :
                          t.done ? 'border-indigo-500 bg-indigo-500' : 'border-slate-200 bg-white'
                        }`} />
                        <span className="hidden sm:block">{t.stage}</span>
                      </div>
                      {i < timeline.length - 1 && (
                        <div className={`flex-1 h-0.5 ${t.done && timeline[i+1]?.done ? 'bg-indigo-400' : 'bg-slate-100'}`} />
                      )}
                    </React.Fragment>
                  ))}
                  {tx.status === 'Rejected' && (
                    <span className="text-[9px] font-bold text-rose-500 ml-2">Rejected</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Send Invoice Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">Send Trade Invoice</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Send an invoice to a connected buyer</p>
              </div>
              <button onClick={() => setShowSendModal(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-xl">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSend} className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Send To *</label>
                <select
                  value={form.receiver_id}
                  onChange={e => setForm({ ...form, receiver_id: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">-- Select Connected Business --</option>
                  {connections.map(conn => (
                    <option key={conn.partner?.id} value={conn.partner?.id}>
                      {conn.partner?.business_name || conn.partner?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Invoice No</label>
                  <input
                    type="text"
                    value={form.invoice_no}
                    onChange={e => setForm({ ...form, invoice_no: e.target.value })}
                    placeholder="e.g. INV-2024-001"
                    className="w-full px-4 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={form.invoice_date}
                    onChange={e => setForm({ ...form, invoice_date: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              </div>
              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Products *</label>
                  <button type="button" onClick={addItem} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
                    <Plus size={11} /> Add Product
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-3 border border-slate-100 rounded-xl grid grid-cols-5 gap-2 items-end">
                      <div className="col-span-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Product Name</label>
                        <input value={item.product_name} onChange={e => updateItem(idx, 'product_name', e.target.value)}
                          placeholder="Name" required
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Qty</label>
                        <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Price (₹)</label>
                        <input type="number" value={item.purchase_price} onChange={e => updateItem(idx, 'purchase_price', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 font-semibold text-slate-800"
                        />
                      </div>
                      <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                        className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 disabled:opacity-30 self-end"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Notes (Optional)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="e.g. Payment terms: 15 days net"
                  className="w-full px-4 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowSendModal(false)}>Cancel</Button>
                <Button type="submit" disabled={sending} className="bg-blue-600 text-white border-none hover:bg-blue-700 font-bold flex items-center gap-2">
                  {sending ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Invoice</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
