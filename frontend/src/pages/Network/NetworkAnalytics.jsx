import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { BarChart2, TrendingUp, Users2, Package, Zap, Clock } from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

export default function NetworkAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [connections, setConnections] = useState([]);
  const [imports, setImports] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, historyRes, connRes, importsRes] = await Promise.all([
        API.get('/network/overview'),
        API.get('/trade/history'),
        API.get('/network/connections'),
        API.get('/imports/history')
      ]);
      setStats(overviewRes.data?.data || {});
      setHistory(historyRes.data?.data || []);
      setConnections(connRes.data?.data || []);
      setImports(importsRes.data?.data || []);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  // Compute analytics
  const totalVolume = history.reduce((s, t) => s + Number(t.total_amount || 0), 0);
  const importedCount = history.filter(t => t.status === 'Imported').length;
  const importRate = history.length > 0 ? ((importedCount / history.length) * 100).toFixed(0) : 0;
  const hoursaved = imports.filter(i => i.status === 'Completed').reduce((s, i) => s + (i.items_created || 0) + (i.items_matched || 0), 0) * 0.1; // ~6 min per product
  const totalProductsImported = imports.reduce((s, i) => s + (i.items_created || 0) + (i.items_matched || 0), 0);

  // Top partners by trade volume (compute from connections)
  const topPartners = connections
    .sort((a, b) => Number(b.trade_volume || 0) - Number(a.trade_volume || 0))
    .slice(0, 5);

  // Trade volume by month (last 6 months)
  const monthlyData = (() => {
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('en-IN', { month: 'short' });
      months[key] = 0;
    }
    history.forEach(tx => {
      const monthKey = new Date(tx.created_at).toLocaleString('en-IN', { month: 'short' });
      if (monthKey in months) {
        months[monthKey] += Number(tx.total_amount || 0);
      }
    });
    return Object.entries(months).map(([month, vol]) => ({ month, vol }));
  })();

  const maxVol = Math.max(...monthlyData.map(m => m.vol), 1);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart2 size={22} className="text-indigo-600" /> Network Analytics
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Performance metrics and insights for your business network.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Connections', value: stats?.activeConnections || 0, icon: Users2, color: 'indigo', sub: 'Business partners' },
          { label: 'Trade Volume', value: `₹${(totalVolume / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'emerald', sub: 'All time' },
          { label: 'Products Imported', value: totalProductsImported, icon: Package, color: 'violet', sub: 'Auto-imported' },
          { label: 'Hours Saved', value: `${hoursaved.toFixed(1)}h`, icon: Clock, color: 'amber', sub: 'vs manual entry' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <Card key={label} className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                <p className={`text-2xl font-black mt-1 text-${color}-600`}>{value}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{sub}</p>
              </div>
              <div className={`p-2.5 rounded-xl bg-${color}-50`}>
                <Icon size={18} className={`text-${color}-600`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trade Growth Bar Chart */}
        <Card className="p-6 rounded-[24px] border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-indigo-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Trade Growth</h3>
          </div>
          {loading ? (
            <div className="flex items-end gap-3 h-40">
              {[...Array(6)].map((_, i) => <div key={i} className="flex-1 bg-slate-100 rounded-t-xl animate-pulse" style={{ height: `${20 + Math.random() * 80}%` }} />)}
            </div>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {monthlyData.map(({ month, vol }) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative group">
                    <div
                      className="w-full bg-indigo-500 rounded-t-xl hover:bg-indigo-600 transition-colors cursor-pointer"
                      style={{ height: `${Math.max((vol / maxVol) * 120, vol > 0 ? 4 : 2)}px` }}
                    />
                    {vol > 0 && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ₹{(vol / 1000).toFixed(1)}K
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">{month}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Import Success Stats */}
        <Card className="p-6 rounded-[24px] border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Zap size={16} className="text-amber-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Import Performance</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Import Success Rate', value: `${importRate}%`, pct: Number(importRate), color: 'indigo' },
              { label: 'Invoices Received', value: history.filter(t => t.receiver_id).length, pct: 100, color: 'emerald' },
              { label: 'Invoices Sent', value: history.filter(t => t.sender_id).length, pct: 100, color: 'blue' },
            ].map(({ label, value, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-600">{label}</span>
                  <span className={`text-[10px] font-black text-${color}-600`}>{value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-${color}-500 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Partners */}
      {topPartners.length > 0 && (
        <Card className="p-6 rounded-[24px] border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Users2 size={16} className="text-violet-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Top Partners by Trade Volume</h3>
          </div>
          <div className="space-y-3">
            {topPartners.map((conn, idx) => {
              const vol = Number(conn.trade_volume || 0);
              const maxConnVol = Number(topPartners[0]?.trade_volume || 1);
              return (
                <div key={conn.id} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 w-4">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                    {(conn.partner?.business_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">{conn.partner?.business_name}</span>
                      <span className="text-xs font-black text-indigo-600">₹{(vol / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(vol / maxConnVol) * 100}%` }} />
                    </div>
                  </div>
                  <span className={`text-[9px] font-black border rounded-full px-2 py-0.5 ${conn.connection_type === 'Supplier' ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
                    {conn.connection_type}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
