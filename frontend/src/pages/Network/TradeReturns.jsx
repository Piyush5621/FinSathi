import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { RotateCcw, Plus, X, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle } from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  Requested: 'text-amber-600 bg-amber-50 border-amber-200',
  Approved: 'text-sky-600 bg-sky-50 border-sky-200',
  Rejected: 'text-rose-600 bg-rose-50 border-rose-200',
  'Picked Up': 'text-indigo-600 bg-indigo-50 border-indigo-200',
  Completed: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

const RETURN_REASONS = ['Damaged', 'Wrong Item', 'Expired', 'Quality Issue', 'Other'];

export default function TradeReturns() {
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState([]);
  const [outboxReturns, setOutboxReturns] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [returnDetail, setReturnDetail] = useState(null);
  const [activeRole, setActiveRole] = useState('buyer');

  const [form, setForm] = useState({ supplier_id: '', reason: '', notes: '' });
  const [items, setItems] = useState([{ product_name: '', quantity: 1, unit_price: 0, reason: 'Damaged' }]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [buyerRes, supplierRes, connRes] = await Promise.all([
        API.get('/trade-returns?role=buyer'),
        API.get('/trade-returns?role=supplier'),
        API.get('/network/connections')
      ]);
      setReturns(buyerRes.data?.data || []);
      setOutboxReturns(supplierRes.data?.data || []);
      setConnections(connRes.data?.data || []);
    } catch { toast.error('Failed to load returns'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id || items.length === 0 || !items[0].product_name) {
      return toast.error('Supplier and at least one product required');
    }
    setSubmitting(true);
    try {
      await API.post('/trade-returns', { ...form, items });
      toast.success('Return request submitted!');
      setShowModal(false);
      setForm({ supplier_id: '', reason: '', notes: '' });
      setItems([{ product_name: '', quantity: 1, unit_price: 0, reason: 'Damaged' }]);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to submit return');
    } finally { setSubmitting(false); }
  };

  const handleStatusUpdate = async (returnId, status, creditAmount) => {
    try {
      await API.put(`/trade-returns/${returnId}/status`, { status, credit_note_amount: creditAmount });
      toast.success(`Return ${status}`);
      fetchData();
      if (returnDetail?.id === returnId) {
        setReturnDetail(prev => ({ ...prev, status }));
      }
    } catch { toast.error('Failed to update status'); }
  };

  const openDetail = async (ret) => {
    setSelectedReturn(ret);
    try {
      const res = await API.get(`/trade-returns/${ret.id}`);
      setReturnDetail(res.data?.data || null);
    } catch { setReturnDetail(null); }
  };

  const displayReturns = activeRole === 'buyer' ? returns : outboxReturns;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <RotateCcw size={22} className="text-rose-600" /> Trade Returns
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage product returns, damaged goods, and credit notes.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-rose-600 text-white border-none hover:bg-rose-700 font-bold flex items-center gap-2">
          <Plus size={15} /> Request Return
        </Button>
      </div>

      {/* Role Toggle */}
      <div className="flex gap-2">
        {[{ key: 'buyer', label: `My Requests (${returns.length})` }, { key: 'supplier', label: `To Approve (${outboxReturns.length})` }].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveRole(key)}
            className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${activeRole === key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} height="100px" rounded="rounded-[20px]" />)}</div>
      ) : displayReturns.length === 0 ? (
        <Card className="p-16 text-center rounded-[24px] border-slate-100 shadow-sm">
          <RotateCcw size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No {activeRole === 'buyer' ? 'return requests' : 'pending approvals'}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayReturns.map(ret => (
            <div key={ret.id} className="p-5 bg-white border border-slate-100 rounded-[20px] shadow-sm hover:border-indigo-100 hover:shadow-md cursor-pointer transition-all"
              onClick={() => openDetail(ret)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-black text-sm">
                    {((activeRole === 'buyer' ? ret.supplier?.business_name : ret.buyer?.business_name) || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {activeRole === 'buyer' ? ret.supplier?.business_name : ret.buyer?.business_name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">Return #{ret.return_no}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">₹{Number(ret.total_value || 0).toLocaleString('en-IN')}</p>
                    <p className="text-[9px] text-slate-400">Value</p>
                  </div>
                  <span className={`text-[9px] font-black border rounded-full px-2 py-0.5 ${STATUS_COLORS[ret.status] || STATUS_COLORS.Requested}`}>
                    {ret.status}
                  </span>
                </div>
              </div>
              {ret.reason && <p className="text-[10px] text-slate-400 mt-2 italic">Reason: {ret.reason}</p>}

              {/* Supplier actions */}
              {activeRole === 'supplier' && ret.status === 'Requested' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleStatusUpdate(ret.id, 'Approved', ret.total_value)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100">
                    <CheckCircle2 size={11} /> Approve
                  </button>
                  <button onClick={() => handleStatusUpdate(ret.id, 'Rejected')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100">
                    <XCircle size={11} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Return Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900">Request Product Return</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-xl"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Return To (Supplier) *</label>
                <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400" required>
                  <option value="">-- Select Supplier --</option>
                  {connections.map(c => <option key={c.partner?.id} value={c.partner?.id}>{c.partner?.business_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Overall Reason</label>
                <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g. Damaged goods received" className="w-full px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Products to Return *</label>
                  <button type="button" onClick={() => setItems(prev => [...prev, { product_name: '', quantity: 1, unit_price: 0, reason: 'Damaged' }])}
                    className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5"><Plus size={10} /> Add</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 p-3 border border-slate-100 rounded-xl">
                      <div className="col-span-2">
                        <input value={item.product_name} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, product_name: e.target.value } : it))}
                          placeholder="Product name" required
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 font-semibold text-slate-800" />
                      </div>
                      <input type="number" value={item.quantity} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))}
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 font-semibold text-slate-800" />
                      <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} disabled={items.length === 1}
                        className="flex items-center justify-center text-rose-400 hover:text-rose-600 disabled:opacity-30"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-rose-600 text-white border-none hover:bg-rose-700 font-bold flex items-center gap-2">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  {submitting ? 'Submitting...' : 'Submit Return'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
