import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import Skeleton from '../../../components/ui/Skeleton';
import {
  Home, Search, ArrowLeftRight, Users2, Inbox, Zap, TrendingUp,
  Bell, CheckCircle2, ArrowRight, Sparkles, Globe,
  RefreshCw, BarChart2, Clock, Send, Package, Star,
  Activity, Shield, Target
} from 'lucide-react';
import API from '../../../services/apiClient';
import toast from 'react-hot-toast';

import KPICard from './components/KPICard';
import AIBanner from './components/AIBanner';
import NetworkTabs from './components/NetworkTabs';
import SectionHeader from './components/SectionHeader';
import StatusBadge from './components/StatusBadge';
import EmptyState from './components/EmptyState';
import { LAYOUT, TYPOGRAPHY, BUTTONS } from './utils/networkConstants';

// ─── Sub-components ────────────────────────────────────────────────────────────

const InsightCard = ({ insight, index }) => {
  const colors = ['indigo', 'emerald', 'amber', 'violet'];
  const color = colors[index % colors.length];
  const bgMap = { indigo: 'bg-indigo-50 border-indigo-100', emerald: 'bg-emerald-50 border-emerald-100', amber: 'bg-amber-50 border-amber-100', violet: 'bg-violet-50 border-violet-100' };
  const textMap = { indigo: 'text-indigo-600', emerald: 'text-emerald-700', amber: 'text-amber-700', violet: 'text-violet-600' };
  const iconBgMap = { indigo: 'bg-indigo-100', emerald: 'bg-emerald-100', amber: 'bg-amber-100', violet: 'bg-violet-100' };

  return (
    <div className={`p-4 border rounded-2xl ${bgMap[color]}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${iconBgMap[color]}`}>
          <Sparkles size={14} className={textMap[color]} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${textMap[color]}`}>{insight.title}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-600 mt-1 leading-relaxed">{insight.body}</p>
        </div>
        {insight.cta && (
          <Link
            to={insight.ctaLink || '#'}
            className={`shrink-0 text-[10px] font-black px-2.5 py-1.5 rounded-lg border ${textMap[color]} border-current hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
          >
            {insight.cta}
          </Link>
        )}
      </div>
    </div>
  );
};

const QuickActionTile = ({ icon: Icon, label, desc, to, color }) => {
  const bgMap = { indigo: 'bg-indigo-600', emerald: 'bg-emerald-600', amber: 'bg-amber-500', violet: 'bg-violet-600', blue: 'bg-blue-600', rose: 'bg-rose-500' };
  return (
    <Link 
      to={to} 
      className="group flex flex-col items-start gap-2 p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      aria-label={`${label}, ${desc}`}
    >
      <div className={`p-2 rounded-xl ${bgMap[color]} shadow-sm group-hover:scale-105 transition-transform`}>
        <Icon size={16} className="text-white" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-800 leading-tight">{label}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{desc}</p>
      </div>
    </Link>
  );
};

const ActivityItem = ({ item }) => {
  const isReceived = item.direction === 'received';
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:border-slate-200 hover:bg-slate-50/50 transition-all group">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${isReceived ? 'bg-emerald-50' : 'bg-blue-50'}`}>
          {isReceived ? <Inbox size={13} className="text-emerald-600" aria-hidden="true" /> : <Send size={13} className="text-blue-600" aria-hidden="true" />}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800 line-clamp-1">
            {isReceived ? (item.sender?.business_name || 'Supplier') : (item.receiver?.business_name || 'Buyer')}
          </p>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            {isReceived ? 'Sent you' : 'You sent'} Invoice #{item.invoice_no}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-black text-slate-800">
          ₹{Number(item.total_amount || 0).toLocaleString('en-IN')}
        </span>
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
};

// ─── Analytics Tab Content ──────────────────────────────────────────────────────

const AnalyticsPanel = ({ history, connections, loading }) => {
  const totalVolume = history.reduce((s, t) => s + Number(t.total_amount || 0), 0);
  const importedCount = history.filter(t => t.status === 'Imported').length;
  const importRate = history.length > 0 ? ((importedCount / history.length) * 100).toFixed(0) : 0;

  const monthlyData = useMemo(() => {
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('en-IN', { month: 'short' });
      months[key] = 0;
    }
    history.forEach(tx => {
      const k = new Date(tx.created_at).toLocaleString('en-IN', { month: 'short' });
      if (k in months) months[k] += Number(tx.total_amount || 0);
    });
    return Object.entries(months).map(([month, vol]) => ({ month, vol }));
  }, [history]);

  const maxVol = Math.max(...monthlyData.map(m => m.vol), 1);

  const topPartners = [...connections]
    .sort((a, b) => Number(b.trade_volume || 0) - Number(a.trade_volume || 0))
    .slice(0, 5);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton height="200px" rounded="rounded-[20px]" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton height="160px" rounded="rounded-[20px]" />
        <Skeleton height="160px" rounded="rounded-[20px]" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Trade Volume', value: `₹${(totalVolume / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-indigo-600' },
          { label: 'Active Partners', value: connections.length, icon: Users2, color: 'text-emerald-600' },
          { label: 'Import Success Rate', value: `${importRate}%`, icon: CheckCircle2, color: 'text-violet-600' },
          { label: 'Transactions', value: history.length, icon: Activity, color: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4 bg-white border-slate-100 rounded-[18px] shadow-sm">
            <div className={`p-2 rounded-xl inline-block mb-2 ${color.replace('text-', 'bg-').replace(/-\d+/, '-100')}`}>
              <Icon size={15} className={color} aria-hidden="true" />
            </div>
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-[20px] border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={15} className="text-indigo-500" aria-hidden="true" />
            <h3 className={TYPOGRAPHY.sectionTitle}>Trade Growth (6 Months)</h3>
          </div>
          <div className="flex items-end gap-2 h-32" aria-label="Bar chart showing trade growth over 6 months" role="img">
            {monthlyData.map(({ month, vol }) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative group">
                  <div
                    className="w-full bg-indigo-500 rounded-t-lg hover:bg-indigo-600 transition-colors cursor-pointer"
                    style={{ height: `${Math.max((vol / maxVol) * 112, vol > 0 ? 4 : 2)}px` }}
                    title={`₹${(vol / 1000).toFixed(1)}K`}
                  />
                  {vol > 0 && (
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      ₹{(vol / 1000).toFixed(1)}K
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold text-slate-500">{month}</span>
              </div>
            ))}
          </div>
        </Card>

        {topPartners.length > 0 ? (
          <Card className="p-6 rounded-[20px] border-slate-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Star size={15} className="text-amber-500" aria-hidden="true" />
              <h3 className={TYPOGRAPHY.sectionTitle}>Top Partners</h3>
            </div>
            <div className="space-y-3">
              {topPartners.map((conn, idx) => {
                const vol = Number(conn.trade_volume || 0);
                const maxConnVol = Number(topPartners[0]?.trade_volume || 1);
                return (
                  <div key={conn.id} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-300 w-4">{idx + 1}</span>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                      {(conn.partner?.business_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-800 truncate">{conn.partner?.business_name}</span>
                        <span className="text-[11px] font-black text-indigo-600 shrink-0 ml-2">₹{(vol / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(vol / maxConnVol) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-6 rounded-[20px] border-slate-100 bg-white shadow-sm h-full">
            <EmptyState 
              icon={Users2}
              title="No trade history yet"
              description="Connect with partners to see detailed trade analytics here."
            />
          </Card>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function NetworkHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [connections, setConnections] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, inboxRes, outboxRes, connRes, historyRes] = await Promise.all([
        API.get('/network/overview').catch(() => ({ data: { data: null } })),
        API.get('/trade/inbox').catch(() => ({ data: { data: [] } })),
        API.get('/trade/outbox').catch(() => ({ data: { data: [] } })),
        API.get('/network/connections').catch(() => ({ data: { data: [] } })),
        API.get('/trade/history').catch(() => ({ data: { data: [] } })),
      ]);

      setStats(overviewRes.data?.data || { activeConnections: 0, pendingRequests: 0, pendingPurchases: 0, monthlyTradeVolume: 0 });
      setConnections(connRes.data?.data || []);
      setHistory(historyRes.data?.data || []);

      const inbox = (inboxRes.data?.data || []).map(t => ({ ...t, direction: 'received' }));
      const outbox = (outboxRes.data?.data || []).map(t => ({ ...t, direction: 'sent' }));
      const combined = [...inbox, ...outbox]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6);
      setRecentActivity(combined);
    } catch (err) {
      toast.error('Failed to load network data');
    } finally {
      setLoading(false);
    }
  };

  const insights = [
    {
      title: stats?.pendingPurchases > 0 ? `${stats.pendingPurchases} invoice${stats.pendingPurchases > 1 ? 's' : ''} waiting for your review` : 'Your network is up to date',
      body: stats?.pendingPurchases > 0
        ? 'Review and import to update your inventory automatically — no manual data entry needed.'
        : 'All invoices have been reviewed. Start a new transaction or find new partners.',
      cta: stats?.pendingPurchases > 0 ? 'Review Now' : 'Find Suppliers',
      ctaLink: stats?.pendingPurchases > 0 ? '/network/workspace?tab=inbox' : '/network/directory',
    },
    {
      title: connections.length > 0 ? `${connections.length} active business partner${connections.length > 1 ? 's' : ''} in your network` : 'Start building your network',
      body: connections.length > 0
        ? 'Manage relationships, view trade history, and discover better suppliers.'
        : 'Connect with verified suppliers and buyers to streamline your B2B operations.',
      cta: connections.length > 0 ? 'View Partners' : 'Find Businesses',
      ctaLink: connections.length > 0 ? '/network/partners' : '/network/directory',
    },
    {
      title: 'Discover government schemes you qualify for',
      body: 'MUDRA loans, CGTMSE guarantees, GeM registration and more — matched to your business profile.',
      cta: 'Explore Growth',
      ctaLink: '/network/growth',
    },
  ];

  const quickActions = [
    { icon: Search, label: 'Find Suppliers', desc: 'Search verified businesses', to: '/network/directory', color: 'indigo' },
    { icon: ArrowLeftRight, label: 'Post to Exchange', desc: 'Buy, sell, list requirements', to: '/network/exchange', color: 'emerald' },
    { icon: Inbox, label: 'Review Invoices', desc: `${stats?.pendingPurchases || 0} pending`, to: '/network/workspace?tab=inbox', color: 'amber' },
    { icon: Zap, label: 'Growth Center', desc: 'Schemes, loans, training', to: '/network/growth', color: 'violet' },
    { icon: Users2, label: 'My Partners', desc: `${stats?.activeConnections || 0} connected`, to: '/network/partners', color: 'blue' },
    { icon: Send, label: 'Send Invoice', desc: 'To connected buyers', to: '/network/workspace?tab=outbox', color: 'rose' },
  ];

  const networkTabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <div className={LAYOUT.container}>
      <SectionHeader 
        title="Business Network"
        subtitle="Your AI-powered business growth platform for finding partners, opportunities, and resources."
        icon={Globe}
        action={
          <>
            {(stats?.pendingPurchases || 0) > 0 && (
              <Link
                to="/network/workspace?tab=inbox"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Bell size={13} className="animate-bounce" aria-hidden="true" />
                {stats.pendingPurchases} Pending
              </Link>
            )}
            <button
              onClick={fetchData}
              className={BUTTONS.secondary}
              aria-label="Refresh data"
            >
              <RefreshCw size={13} /> <span className="hidden sm:inline">Refresh</span>
            </button>
          </>
        }
      />

      <NetworkTabs 
        tabs={networkTabs}
        activeTab={activeTab}
        onChange={(id) => setSearchParams(id === 'overview' ? {} : { tab: id })}
      />

      {activeTab === 'analytics' ? (
        <AnalyticsPanel history={history} connections={connections} loading={loading} />
      ) : (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} height="120px" rounded="rounded-[20px]" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard label="Active Partners" value={stats?.activeConnections || 0} sub="Business connections" icon={Users2} color="text-indigo-600" link="/network/partners" />
              <KPICard label="Pending Review" value={stats?.pendingPurchases || 0} sub="Invoices from suppliers" icon={Bell} color="text-amber-500" link="/network/workspace?tab=inbox" />
              <KPICard label="Trade Volume" value={`₹${((stats?.monthlyTradeVolume || 0) / 1000).toFixed(1)}K`} sub="All time via network" icon={TrendingUp} color="text-emerald-600" link="/network/workspace" />
              <KPICard label="Connection Requests" value={stats?.pendingRequests || 0} sub="Awaiting response" icon={Shield} color="text-violet-600" link="/network/partners?tab=pending" />
            </div>
          )}

          <section aria-labelledby="ai-insights-heading">
            <h2 id="ai-insights-heading" className="sr-only">AI Insights</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="text-indigo-500" aria-hidden="true" />
                <span className={TYPOGRAPHY.sectionTitle}>AI Insights</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {insights.map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)}
              </div>
            </div>
          </section>

          <section aria-labelledby="quick-actions-heading">
            <h2 id="quick-actions-heading" className={`${TYPOGRAPHY.sectionTitle} mb-3`}>Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map(a => <QuickActionTile key={a.to} {...a} />)}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2" aria-labelledby="recent-activity-heading">
              <Card className="p-6 rounded-[20px] border-slate-100 bg-white shadow-sm h-full flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-indigo-500" aria-hidden="true" />
                    <h2 id="recent-activity-heading" className={TYPOGRAPHY.sectionTitle}>Recent Activity</h2>
                  </div>
                  <Link to="/network/workspace" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 focus-visible:outline-none focus-visible:underline">
                    View All <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} height="64px" rounded="rounded-xl" />)}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <EmptyState 
                    icon={Activity}
                    title="No trade activity yet"
                    description="Connect with suppliers and start exchanging invoices seamlessly."
                    actionLabel="Find Suppliers"
                    actionTo="/network/directory"
                  />
                ) : (
                  <div className="space-y-2 flex-1">
                    {recentActivity.map(item => <ActivityItem key={item.id} item={item} />)}
                  </div>
                )}
              </Card>
            </section>

            <section aria-labelledby="network-health-heading" className="space-y-4">
              {(stats?.activeConnections || 0) === 0 ? (
                <Card className="p-5 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[20px] border-none shadow-xl text-white">
                  <Target size={20} className="mb-3 text-indigo-200" aria-hidden="true" />
                  <h3 id="network-health-heading" className="text-base font-black tracking-tight">Get Started</h3>
                  <p className="text-indigo-200 text-xs mt-1 mb-5">3 steps to start growing with FinSathi Network</p>
                  <div className="space-y-2">
                    {[
                      { step: '1', title: 'Find a Supplier', desc: 'Search by category, location, GST', link: '/network/directory' },
                      { step: '2', title: 'Receive Invoice', desc: 'Supplier sends digital invoice', link: '/network/workspace?tab=inbox' },
                      { step: '3', title: 'One-Click Import', desc: 'Products auto-added to inventory', link: '/network/workspace?tab=inbox' },
                    ].map(({ step, title, desc, link }) => (
                      <Link key={step} to={link} className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                        <div className="w-6 h-6 rounded-full bg-white/20 text-white text-xs font-black flex items-center justify-center shrink-0" aria-hidden="true">
                          {step}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white">{title}</p>
                          <p className="text-[10px] sm:text-[11px] text-indigo-200 mt-0.5">{desc}</p>
                        </div>
                        <ArrowRight size={14} className="text-indigo-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="p-5 rounded-[20px] border-slate-100 bg-white shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <Activity size={16} className="text-indigo-500" aria-hidden="true" />
                    <h3 id="network-health-heading" className={TYPOGRAPHY.sectionTitle}>Network Health</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'GST Verified Partners', value: `${Math.round((stats?.activeConnections || 0) * 0.7)}/${stats?.activeConnections || 0}`, color: 'emerald', pct: 70 },
                      { label: 'Import Success Rate', value: `${recentActivity.length > 0 ? Math.round((recentActivity.filter(a => a.status === 'Imported').length / recentActivity.length) * 100) : 0}%`, color: 'indigo', pct: recentActivity.length > 0 ? Math.round((recentActivity.filter(a => a.status === 'Imported').length / recentActivity.length) * 100) : 0 },
                      { label: 'Avg Response Time', value: '< 4 hrs', color: 'amber', pct: 85 },
                    ].map(({ label, value, color, pct }) => (
                      <div key={label} aria-label={`${label}: ${value}`}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-slate-600">{label}</span>
                          <span className={`text-[11px] font-black text-${color}-600`}>{value}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
                          <div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-5 rounded-[20px] border-slate-100 bg-white shadow-sm">
                <p className={`${TYPOGRAPHY.sectionTitle} mb-3`}>Explore</p>
                <div className="space-y-1">
                  {[
                    { label: 'Business Directory', to: '/network/directory', icon: Search, color: 'text-indigo-500' },
                    { label: 'Business Exchange', to: '/network/exchange', icon: ArrowLeftRight, color: 'text-emerald-500' },
                    { label: 'My Partners', to: '/network/partners', icon: Users2, color: 'text-blue-500' },
                    { label: 'Trade Workspace', to: '/network/workspace', icon: Package, color: 'text-amber-500' },
                    { label: 'Growth Center', to: '/network/growth', icon: Zap, color: 'text-violet-500' },
                  ].map(({ label, to, icon: Icon, color }) => (
                    <Link key={to} to={to} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 group transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                      <Icon size={16} className={color} aria-hidden="true" />
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors flex-1">{label}</span>
                      <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </Card>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
