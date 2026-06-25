import { useState, useEffect } from 'react';
import API from '../../services/apiClient';
import { TrendingDown, TrendingUp, AlertTriangle, Zap, Loader2, RefreshCw } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, Cell, Tooltip, XAxis 
} from 'recharts';
import { Card } from '../ui/Card';

export default function CashFlowWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get('/intelligence/cashflow');
      setData(res.data.data);
    } catch (err) {
      setError("Could not load cash flow forecast.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="text-indigo-500" size={18} />
          <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">FinPredict — 14-Day Forecast</h3>
        </div>
        <div className="flex justify-center items-center h-28">
          <Loader2 className="animate-spin text-indigo-400" size={24} />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-rose-500 text-sm">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  const {
    dailyProjections,
    cashCrunchDetected,
    cashCrunchInDays,
    projectedBalance14Days,
    avgDailyRevenue,
    avgDailyExpense,
    minBalance,
    warningThreshold,
  } = data;

  const isCrunchSoon = cashCrunchDetected && cashCrunchInDays <= 7;

  return (
    <Card className={`relative overflow-hidden border-t-2 ${cashCrunchDetected ? 'border-t-amber-500' : 'border-t-emerald-500'} p-5`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Zap className={cashCrunchDetected ? 'text-amber-500' : 'text-emerald-500'} size={14} />
            <h3 className="font-bold text-xs text-slate-900 tracking-tight">FinPredict</h3>
            <span className="text-[9px] font-bold border border-slate-100 bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">14-Day Forecast</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Projected balance: <span className={`font-semibold ${projectedBalance14Days < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              ₹{Math.abs(projectedBalance14Days).toLocaleString('en-IN')}
            </span>
          </p>
        </div>
        <button onClick={fetch} className="text-slate-400 hover:text-brand-blue transition-colors cursor-pointer" title="Refresh forecast">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Cash Crunch Warning Banner */}
      {cashCrunchDetected && (
        <div className={`mb-4 rounded-xl p-3 flex items-start gap-2.5 ${isCrunchSoon ? 'bg-rose-50/50 border border-rose-100/60' : 'bg-amber-50/50 border border-amber-100/60'}`}>
          <AlertTriangle size={13} className={isCrunchSoon ? 'text-rose-500 mt-0.5 shrink-0' : 'text-amber-500 mt-0.5 shrink-0'} />
          <div>
            <p className={`text-xs font-semibold ${isCrunchSoon ? 'text-rose-800' : 'text-amber-800'} tracking-tight`}>
              {isCrunchSoon ? '⚠️ Cash Crunch Warning!' : '⚡ Low Balance Alert'}
            </p>
            <p className={`text-[10px] mt-0.5 leading-normal ${isCrunchSoon ? 'text-rose-600' : 'text-amber-600'}`}>
              Balance may drop below safe threshold in ~{cashCrunchInDays} days.
              Min projected: ₹{minBalance.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}

      {/* 14-Bar Sparkline Chart */}
      <div className="h-20 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyProjections} margin={{ top: 2, right: 0, left: -40, bottom: 0 }}>
            <XAxis 
              dataKey="dayLabel" 
              tick={{ fontSize: 8, fill: '#94a3b8' }} 
              tickLine={false} 
              axisLine={false}
              interval={2}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 10 }}
              formatter={(v, n, props) => [
                `₹${Math.abs(v).toLocaleString('en-IN')}`,
                props.payload.isCrunch ? '⚠️ Balance (Low)' : 'Balance'
              ]}
              labelStyle={{ fontWeight: 700, fontSize: 10, color: '#1e293b' }}
            />
            <Bar dataKey="balance" radius={[3, 3, 0, 0]} barSize={12}>
              {dailyProjections.map((entry, i) => (
                <Cell 
                  key={i} 
                  fill={entry.isCrunch ? '#ef4444' : '#2483F5'}
                  opacity={entry.isCrunch ? 1 : 0.6 + (i / dailyProjections.length) * 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom metrics */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100/80">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-emerald-50 rounded-lg">
            <TrendingUp size={12} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Daily In</p>
            <p className="text-xs font-semibold text-slate-800">₹{avgDailyRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1 bg-rose-50 rounded-lg">
            <TrendingDown size={12} className="text-rose-500" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Daily Out</p>
            <p className="text-xs font-semibold text-slate-800">₹{avgDailyExpense.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
