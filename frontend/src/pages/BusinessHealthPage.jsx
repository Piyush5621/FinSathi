import { useEffect, useState } from 'react';
import API from '../services/apiClient';
import HealthScoreHero from '../components/Dashboard/HealthScoreHero';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import {
  RefreshCw, ShieldCheck, TrendingUp, TrendingDown, Wallet,
  Package, Users, Activity, ArrowRight, CheckCircle2, AlertTriangle, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function BusinessHealthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await API.get('/intelligence/health-score');
      if (res.data && res.data.success) {
        setData(res.data.data);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load health score');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getPriorityColor = (priority) => {
    if (priority === 'critical') return 'bg-rose-50 border-rose-100 text-rose-800';
    if (priority === 'high') return 'bg-amber-50 border-amber-100 text-amber-800';
    return 'bg-indigo-50 border-indigo-100 text-indigo-800';
  };
  const getPriorityIcon = (priority) => {
    if (priority === 'critical') return <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />;
    if (priority === 'high') return <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />;
    return <Sparkles size={14} className="text-indigo-500 shrink-0 mt-0.5" />;
  };

  return (
    <div className="space-y-8 pb-16 max-w-[1200px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Business Health Score</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time analysis of your business across 5 key dimensions
          </p>
        </div>
        <Button
          onClick={fetchData}
          disabled={loading}
          variant="secondary"
          className="flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Recalculate Score
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton height="240px" rounded="rounded-[24px]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} height="140px" rounded="rounded-[24px]" />)}
          </div>
          <Skeleton height="200px" rounded="rounded-[24px]" />
        </div>
      ) : !data ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center rounded-[24px]">
          <ShieldCheck size={48} className="text-slate-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-700">No health data yet</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            Add some sales, expenses, and inventory to generate your business health score.
          </p>
          <Button className="mt-6" onClick={fetchData}>
            Try Again
          </Button>
        </Card>
      ) : (
        <>
          {/* Hero Score Section */}
          <HealthScoreHero data={data} />

          {/* Component Breakdown Cards */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">
              Detailed Component Breakdown
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  label: 'Sales Activity',
                  icon: TrendingUp,
                  score: data.components.sales.score,
                  weight: '30%',
                  color: 'text-indigo-600',
                  bg: 'bg-indigo-50',
                  bar: 'bg-indigo-500',
                  detail: `₹${data.components.sales.details.currentPeriodSales.toLocaleString('en-IN')} this period`
                },
                {
                  label: 'Cash Flow',
                  icon: Wallet,
                  score: data.components.cashFlow.score,
                  weight: '25%',
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                  bar: 'bg-emerald-500',
                  detail: `Expense ratio: ${data.components.cashFlow.details.ratio * 100 | 0}%`
                },
                {
                  label: 'Inventory',
                  icon: Package,
                  score: data.components.inventory.score,
                  weight: '20%',
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                  bar: 'bg-amber-500',
                  detail: `${data.components.inventory.details.lowStockCount} low stock items`
                },
                {
                  label: 'Collections',
                  icon: Users,
                  score: data.components.collection.score,
                  weight: '15%',
                  color: 'text-rose-600',
                  bg: 'bg-rose-50',
                  bar: 'bg-rose-500',
                  detail: `${data.components.collection.details.rate}% collected`
                },
                {
                  label: 'Profile Setup',
                  icon: CheckCircle2,
                  score: data.components.profile.score,
                  weight: '10%',
                  color: 'text-purple-600',
                  bg: 'bg-purple-50',
                  bar: 'bg-purple-500',
                  detail: `${data.components.profile.details.completedFields}/${data.components.profile.details.totalFields} fields done`
                },
              ].map((comp) => {
                const Icon = comp.icon;
                return (
                  <Card key={comp.label} className="p-5 bg-white border border-slate-100 shadow-sm rounded-[20px] flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className={`p-2 rounded-lg ${comp.bg}`}>
                        <Icon size={15} className={comp.color} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded-lg">
                        {comp.weight}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{comp.label}</p>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{comp.score}<span className="text-base text-slate-400">/100</span></h3>
                    </div>
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${comp.bar} rounded-full`} style={{ width: `${comp.score}%` }} />
                      </div>
                      <p className="text-[9px] font-semibold text-slate-400">{comp.detail}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                Priority Action Items
              </h2>
              <div className="space-y-3">
                {data.recommendations.map((rec, i) => (
                  <div
                    key={rec.id || i}
                    className={`flex items-start gap-3 p-4 rounded-2xl border ${getPriorityColor(rec.priority)}`}
                  >
                    {getPriorityIcon(rec.priority)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-xs font-bold text-slate-800">{rec.title}</h4>
                        <Badge className={`text-[8px] uppercase tracking-wider py-0.5 px-1.5 ${rec.priority === 'critical' ? 'bg-rose-100 text-rose-700' : rec.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{rec.message}</p>
                    </div>
                    {rec.link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs shrink-0"
                        onClick={() => navigate(rec.link)}
                      >
                        <ArrowRight size={12} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score History */}
          {data.history && data.history.length > 1 && (
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                Score History
              </h2>
              <Card className="p-5 bg-white border border-slate-100 rounded-[24px]">
                <div className="flex gap-2 flex-wrap">
                  {data.history.map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 min-w-[48px]">
                      <div
                        className="w-10 rounded-full"
                        style={{
                          height: `${Math.max(8, (h.score / 100) * 80)}px`,
                          backgroundColor: h.score >= 80 ? '#10B981' : h.score >= 60 ? '#6366F1' : h.score >= 40 ? '#F59E0B' : '#EF4444',
                          opacity: 0.7 + (i / data.history.length) * 0.3
                        }}
                      />
                      <span className="text-[8px] font-bold text-slate-400">{h.date.slice(5)}</span>
                      <span className="text-[8px] font-black text-slate-700">{h.score}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
