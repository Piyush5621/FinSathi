import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import { History, Filter, ChevronDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  Pending: 'text-amber-600 bg-amber-50 border-amber-200',
  Viewed: 'text-blue-600 bg-blue-50 border-blue-200',
  Accepted: 'text-sky-600 bg-sky-50 border-sky-200',
  Imported: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  Rejected: 'text-rose-600 bg-rose-50 border-rose-200',
};

export default function TradeHistory() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState({ status: '', from_date: '', to_date: '' });

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      const res = await API.get(`/trade/history?${params.toString()}`);
      setHistory(res.data?.data || []);
    } catch { toast.error('Failed to load trade history'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <History size={22} className="text-slate-600" /> Trade History
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Full audit trail of all sent and received trade invoices.</p>
      </div>

      {/* Filters */}
      <Card className="p-4 rounded-[20px] border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
            <Filter size={12} /> Filters
          </div>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400">
            <option value="">All Status</option>
            {['Pending', 'Viewed', 'Accepted', 'Imported', 'Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" value={filters.from_date} onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          <span className="text-slate-300 text-xs">to</span>
          <input type="date" value={filters.to_date} onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          <button onClick={fetchHistory} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all">
            Apply
          </button>
          <button onClick={() => { setFilters({ status: '', from_date: '', to_date: '' }); fetchHistory(); }}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all">
            Clear
          </button>
        </div>
      </Card>

      {/* Summary */}
      {!loading && history.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Transactions', value: history.length },
            { label: 'Total Volume', value: `₹${(history.reduce((s, t) => s + Number(t.total_amount || 0), 0) / 1000).toFixed(1)}K` },
            { label: 'Imported', value: history.filter(t => t.status === 'Imported').length },
            { label: 'Pending', value: history.filter(t => t.status === 'Pending').length },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-white border border-slate-100 rounded-xl text-center">
              <p className="text-lg font-black text-slate-800">{value}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} height="70px" rounded="rounded-xl" />)}</div>
      ) : history.length === 0 ? (
        <Card className="p-16 text-center rounded-[24px] border-slate-100 shadow-sm">
          <History size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No trade history found</p>
          <p className="text-slate-300 text-xs mt-1">Your invoice transactions will appear here</p>
        </Card>
      ) : (
        <Card className="rounded-[20px] border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Direction', 'Partner', 'Invoice #', 'Date', 'Amount', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map(tx => {
                  const userId = localStorage.getItem('userId');
                  const isSender = tx.sender_id === userId;
                  const partner = isSender ? tx.receiver : tx.sender;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 text-[9px] font-bold ${isSender ? 'text-blue-600' : 'text-emerald-600'}`}>
                          {isSender ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                          {isSender ? 'Sent' : 'Received'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{partner?.business_name || '—'}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{tx.invoice_no || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(tx.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 font-black text-slate-800">₹{Number(tx.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-black border rounded-full px-2 py-0.5 ${STATUS_COLORS[tx.status] || 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
