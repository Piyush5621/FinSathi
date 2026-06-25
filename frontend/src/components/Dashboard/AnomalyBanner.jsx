import { useState, useEffect } from 'react';
import API from '../../services/apiClient';
import { AlertTriangle, X, ShieldCheck, RefreshCw } from 'lucide-react';

const SEVERITY_STYLES = {
  warning: {
    bg: 'bg-amber-50/50',
    border: 'border-amber-100/80',
    text: 'text-amber-700',
    icon: 'text-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  info: {
    bg: 'bg-blue-50/50',
    border: 'border-blue-100/80',
    text: 'text-blue-700',
    icon: 'text-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  danger: {
    bg: 'bg-rose-50/50',
    border: 'border-rose-100/80',
    text: 'text-rose-700',
    icon: 'text-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-100',
  }
};

const TYPE_LABELS = {
  DUPLICATE_INVOICE: 'Duplicate Invoice',
  LARGE_DISCOUNT: 'Large Discount',
  OFF_HOURS_BILLING: 'Off-Hours Billing',
};

export default function AnomalyBanner({ onScanRequest }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      setLoading(true);
      const res = await API.get('/intelligence/anomalies');
      setFlags(res.data.data || []);
    } catch (err) {
      setFlags([]);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    try {
      setScanning(true);
      await API.post('/intelligence/anomalies/scan');
      await loadFlags();
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  const dismissFlag = async (id) => {
    try {
      await API.patch(`/intelligence/anomalies/${id}/dismiss`);
      setFlags(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Dismiss failed:', err);
    }
  };

  if (loading || flags.length === 0) {
    if (loading) return null;
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-semibold shadow-sm">
        <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
        <span>No anomalies detected. Your billing looks clean!</span>
        <button onClick={runScan} disabled={scanning} className="ml-auto text-emerald-600 hover:text-emerald-800 transition-all flex items-center gap-1 cursor-pointer">
          <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
          <span>{scanning ? 'Scanning...' : 'Scan'}</span>
        </button>
      </div>
    );
  }

  const visibleFlags = expanded ? flags : flags.slice(0, 2);

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/30 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-100 bg-amber-50/80">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <span className="text-xs font-bold text-amber-800 tracking-tight">
            {flags.length} Anomal{flags.length === 1 ? 'y' : 'ies'} Detected
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={runScan} disabled={scanning} className="text-xs text-amber-600 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer">
            <RefreshCw size={11} className={scanning ? 'animate-spin' : ''} />
            <span>{scanning ? 'Scanning...' : 'Re-scan'}</span>
          </button>
          {flags.length > 2 && (
            <button onClick={() => setExpanded(v => !v)} className="text-xs text-amber-600 hover:text-amber-800 font-bold cursor-pointer">
              {expanded ? 'Show less' : `+${flags.length - 2} more`}
            </button>
          )}
        </div>
      </div>

      {/* Flag list */}
      <div className="divide-y divide-amber-100 bg-white">
        {visibleFlags.map((flag) => {
          const severity = flag.severity || 'info';
          const styles = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
          return (
            <div key={flag.id} className="flex items-start gap-3 px-4 py-3">
              <AlertTriangle size={14} className={`${styles.icon} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded-lg uppercase tracking-wider ${styles.badge}`}>
                    {TYPE_LABELS[flag.type] || flag.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-normal font-medium">{flag.message}</p>
              </div>
              <button
                onClick={() => dismissFlag(flag.id)}
                className="text-slate-400 hover:text-rose-500 transition-all shrink-0 mt-0.5 cursor-pointer"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
