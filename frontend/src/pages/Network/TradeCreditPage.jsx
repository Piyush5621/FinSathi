import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import {
  CreditCard, AlertTriangle, CheckCircle2, TrendingUp, Plus, X, Loader2
} from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

export default function TradeCreditPage() {
  const [loading, setLoading] = useState(true);
  const [creditData, setCreditData] = useState({ creditGiven: [], creditReceived: [] });
  const [connections, setConnections] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ buyer_id: '', credit_limit: '', due_date: '', notes: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [creditRes, connRes] = await Promise.all([
        API.get('/trade-credit'),
        API.get('/network/connections')
      ]);
      setCreditData(creditRes.data?.data || { creditGiven: [], creditReceived: [] });
      setConnections(connRes.data?.data || []);
    } catch { toast.error('Failed to load credit data'); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.buyer_id || !form.credit_limit) return toast.error('Buyer and credit limit are required');
    setSaving(true);
    try {
      await API.post('/trade-credit', { ...form, credit_limit: Number(form.credit_limit) });
      toast.success('Credit account saved!');
      setShowModal(false);
      setForm({ buyer_id: '', credit_limit: '', due_date: '', notes: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to save credit');
    } finally { setSaving(false); }
  };

  const getUtilizationColor = (utilized, limit) => {
    const pct = limit > 0 ? (utilized / limit) * 100 : 0;
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 75) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (status) => {
    const map = {
      Active: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      Overdue: 'text-rose-600 bg-rose-50 border-rose-200',
      Suspended: 'text-amber-600 bg-amber-50 border-amber-200',
      Closed: 'text-slate-500 bg-slate-50 border-slate-200',
    };
    return map[status] || map.Active;
  };

  const CreditCard2 = ({ credit, role }) => {
    const partner = role === 'given' ? credit.buyer : credit.supplier;
    const utilized = Number(credit.utilized_amount || 0);
    const limit = Number(credit.credit_limit || 0);
    const outstanding = Number(credit.outstanding_amount || 0);
    const pct = limit > 0 ? Math.min((utilized / limit) * 100, 100) : 0;

    return (
      <div className="p-5 border border-slate-100 rounded-[20px] bg-white hover:border-indigo-100 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">
              {(partner?.business_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{partner?.business_name || 'Unknown'}</p>
              <p className="text-[10px] text-slate-400 font-semibold">{role === 'given' ? 'Credit Extended' : 'Credit Received'}</p>
            </div>
          </div>
          <span className={`text-[9px] font-black border rounded-full px-2 py-0.5 ${getStatusBadge(credit.status)}`}>
            {credit.status}
          </span>
        </div>

        {/* Utilization bar */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[9px] font-bold text-slate-400">Credit Used</span>
            <span className="text-[9px] font-black text-slate-700">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getUtilizationColor(utilized, limit)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-slate-50 rounded-xl">
            <p className="text-sm font-black text-slate-800">₹{(limit / 1000).toFixed(0)}K</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Limit</p>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-xl">
            <p className="text-sm font-black text-indigo-600">₹{(utilized / 1000).toFixed(0)}K</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Used</p>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-xl">
            <p className={`text-sm font-black ${outstanding > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
              ₹{(outstanding / 1000).toFixed(0)}K
            </p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Outstanding</p>
          </div>
        </div>

        {credit.due_date && (
          <p className={`text-[10px] font-bold mt-3 flex items-center gap-1 ${new Date(credit.due_date) < new Date() ? 'text-rose-500' : 'text-slate-400'}`}>
            <AlertTriangle size={10} /> Due: {new Date(credit.due_date).toLocaleDateString('en-IN')}
          </p>
        )}

        {pct >= 80 && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-bold text-amber-700 flex items-center gap-1">
            <AlertTriangle size={10} /> Credit utilization at {pct.toFixed(0)}% — approaching limit
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard size={22} className="text-violet-600" /> Trade Credits
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage B2B credit accounts with your connected trading partners.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-violet-600 text-white border-none hover:bg-violet-700 font-bold flex items-center gap-2">
          <Plus size={15} /> Set Credit Limit
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} height="200px" rounded="rounded-[20px]" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {creditData.creditGiven?.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
                <TrendingUp size={12} /> Credit Extended to Buyers ({creditData.creditGiven.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditData.creditGiven.map(credit => (
                  <CreditCard2 key={credit.id} credit={credit} role="given" />
                ))}
              </div>
            </div>
          )}

          {creditData.creditReceived?.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                Credit Received from Suppliers ({creditData.creditReceived.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditData.creditReceived.map(credit => (
                  <CreditCard2 key={credit.id} credit={credit} role="received" />
                ))}
              </div>
            </div>
          )}

          {creditData.creditGiven?.length === 0 && creditData.creditReceived?.length === 0 && (
            <Card className="p-16 text-center rounded-[24px] border-slate-100 shadow-sm">
              <CreditCard size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">No credit accounts yet</p>
              <p className="text-slate-300 text-xs mt-1">Set credit limits for your connected buyers</p>
              <Button onClick={() => setShowModal(true)} className="mt-4 bg-violet-600 text-white border-none font-bold">
                Set Credit Limit
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-7">
            <div className="flex justify-between mb-5">
              <div>
                <h2 className="text-base font-black text-slate-900">Set Credit Limit</h2>
                <p className="text-xs text-slate-400 font-semibold">Grant trade credit to a connected buyer</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-xl">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Buyer *</label>
                <select value={form.buyer_id} onChange={e => setForm({ ...form, buyer_id: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500" required>
                  <option value="">-- Select Buyer --</option>
                  {connections.map(conn => (
                    <option key={conn.partner?.id} value={conn.partner?.id}>{conn.partner?.business_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Credit Limit (₹) *</label>
                <input type="number" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500"
                  placeholder="e.g. 50000" required />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full px-4 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 font-semibold resize-none"
                  placeholder="e.g. 30-day net payment terms" />
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-violet-600 text-white border-none hover:bg-violet-700 font-bold flex items-center gap-2">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Credit Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
