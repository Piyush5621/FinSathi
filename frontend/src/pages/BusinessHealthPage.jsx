import { useEffect, useState } from 'react';
import API from '../services/apiClient';
import HealthScoreHero from '../components/Dashboard/HealthScoreHero';
import { Card, MetricCard, AlertCard, SectionCard } from '../components/ui';
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
            Add some sales, expenses, and inventory items to generate your business health score.
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
          <div className="space-y-3">
            <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary">
              Detailed Component Breakdown
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                title="Sales Activity"
                value={`${data.components.sales.score}/100`}
                badge="30% Weight"
                progress={data.components.sales.score}
                subtitle={`₹${data.components.sales.details.currentPeriodSales.toLocaleString('en-IN')} revenue`}
                icon={<TrendingUp size={20} />}
                iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              />

              <MetricCard
                title="Cash Flow"
                value={`${data.components.cashFlow.score}/100`}
                badge="25% Weight"
                progress={data.components.cashFlow.score}
                subtitle={`Expense ratio: ${data.components.cashFlow.details.ratio * 100 | 0}%`}
                icon={<Wallet size={20} />}
                iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
              />

              <MetricCard
                title="Inventory Health"
                value={`${data.components.inventory.score}/100`}
                badge="20% Weight"
                progress={data.components.inventory.score}
                subtitle={`${data.components.inventory.details.lowStockCount} low stock items`}
                icon={<Package size={20} />}
                iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
              />

              <MetricCard
                title="Collections"
                value={`${data.components.collection.score}/100`}
                badge="15% Weight"
                progress={data.components.collection.score}
                subtitle={`${data.components.collection.details.rate}% collected`}
                icon={<Users size={20} />}
                iconBg="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
              />

              <MetricCard
                title="Profile Setup"
                value={`${data.components.profile.score}/100`}
                badge="10% Weight"
                progress={data.components.profile.score}
                subtitle={`${data.components.profile.details.completedFields}/${data.components.profile.details.totalFields} fields done`}
                icon={<CheckCircle2 size={20} />}
                iconBg="bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
              />
            </div>
          </div>

          {/* Recommendations */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-micro font-black uppercase tracking-wider text-app-text-secondary">
                Priority Action Items
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {data.recommendations.map((rec, i) => (
                  <AlertCard
                    key={rec.id || i}
                    title={rec.title}
                    description={rec.message}
                    priority={rec.priority}
                    actionLabel="Take Action →"
                    onAction={rec.link ? () => navigate(rec.link) : undefined}
                  />
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
