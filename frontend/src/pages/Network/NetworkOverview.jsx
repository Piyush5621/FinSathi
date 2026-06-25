import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import {
  Globe, Users2, Inbox, TrendingUp, ArrowRight, Star,
  Package, Send, Clock, CheckCircle2, RefreshCw, Bell, Wifi
} from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const StatCard = ({ label, value, sub, icon: Icon, color, link }) => (
  <Link to={link || '#'} className="block group">
    <Card className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 group-hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`text-2xl font-black mt-1 ${color || 'text-slate-900'}`}>{value}</p>
          {sub && <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color ? color.replace('text-', 'bg-').replace('600', '100').replace('500', '100') : 'bg-slate-100'}`}>
          <Icon size={18} className={color || 'text-slate-600'} />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
        View details <ArrowRight size={10} />
      </div>
    </Card>
  </Link>
);

export default function NetworkOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topPartners, setTopPartners] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, inboxRes, outboxRes] = await Promise.all([
        API.get('/network/overview').catch(() => ({ data: { data: null } })),
        API.get('/trade/inbox').catch(() => ({ data: { data: [] } })),
        API.get('/trade/outbox').catch(() => ({ data: { data: [] } })),
      ]);

      setStats(overviewRes.data?.data || {
        activeConnections: 0, pendingRequests: 0, pendingPurchases: 0, monthlyTradeVolume: 0
      });

      // Merge inbox + outbox for recent activity
      const inbox = (inboxRes.data?.data || []).map(t => ({ ...t, direction: 'received' }));
      const outbox = (outboxRes.data?.data || []).map(t => ({ ...t, direction: 'sent' }));
      const combined = [...inbox, ...outbox]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 8);
      setRecentActivity(combined);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load network data');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status) => {
    const map = {
      Pending: 'text-amber-600 bg-amber-50 border-amber-200',
      Viewed: 'text-blue-600 bg-blue-50 border-blue-200',
      Accepted: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      Imported: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      Rejected: 'text-rose-600 bg-rose-50 border-rose-200',
    };
    return map[status] || 'text-slate-500 bg-slate-50 border-slate-200';
  };

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-600">
              <Globe size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Business Network</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-0">
            Connect suppliers, exchange invoices, and auto-import inventory with zero data entry.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} height="110px" rounded="rounded-[20px]" />)}
          </div>
          <Skeleton height="300px" rounded="rounded-[24px]" />
        </div>
      ) : (
        <>
          {/* KPI Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Active Connections"
              value={stats?.activeConnections || 0}
              sub="Business partners"
              icon={Users2}
              color="text-indigo-600"
              link="/network/connections"
            />
            <StatCard
              label="Pending Requests"
              value={stats?.pendingRequests || 0}
              sub="Awaiting response"
              icon={Bell}
              color="text-amber-500"
              link="/network/connections"
            />
            <StatCard
              label="Pending Purchases"
              value={stats?.pendingPurchases || 0}
              sub="Invoices to review"
              icon={Inbox}
              color="text-emerald-600"
              link="/network/inbox"
            />
            <StatCard
              label="Total Trade Volume"
              value={`₹${((stats?.monthlyTradeVolume || 0) / 1000).toFixed(1)}K`}
              sub="All time via network"
              icon={TrendingUp}
              color="text-violet-600"
              link="/network/trade-history"
            />
          </div>

          {/* Quick Actions Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: '/network/connections', icon: Users2, label: 'Find & Connect', color: 'indigo', desc: 'Discover suppliers' },
              { to: '/network/inbox', icon: Inbox, label: 'Purchase Inbox', color: 'emerald', desc: 'Review invoices' },
              { to: '/network/outbox', icon: Send, label: 'Sales Outbox', color: 'blue', desc: 'Track sent invoices' },
              { to: '/network/partners', icon: Star, label: 'Product Partners', color: 'amber', desc: 'Preferred suppliers' },
            ].map(({ to, icon: Icon, label, color, desc }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:border-${color}-300 hover:shadow-sm group transition-all`}
              >
                <div className={`p-2 rounded-xl bg-${color}-50 group-hover:bg-${color}-100 transition-colors`}>
                  <Icon size={16} className={`text-${color}-600`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{label}</p>
                  <p className="text-[9px] text-slate-400 font-semibold">{desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Recent Trade Activity */}
          <Card className="p-6 rounded-[24px] border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-indigo-500" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Recent Trade Activity</h2>
              </div>
              <Link to="/network/trade-history" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                View All <ArrowRight size={11} />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                <Wifi size={40} />
                <p className="text-sm font-semibold text-slate-400">No trade activity yet</p>
                <p className="text-xs text-slate-300">Connect with suppliers and start exchanging invoices</p>
                <Link to="/network/connections" className="mt-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">
                  Find Connections
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:border-slate-200 hover:bg-slate-50/50 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${tx.direction === 'received' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                        {tx.direction === 'received'
                          ? <Inbox size={14} className="text-emerald-600" />
                          : <Send size={14} className="text-blue-600" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {tx.direction === 'received'
                            ? (tx.sender?.business_name || 'Supplier')
                            : (tx.receiver?.business_name || 'Buyer')}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {tx.direction === 'received' ? 'Sent you' : 'You sent'} Invoice #{tx.invoice_no}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-slate-800">
                        ₹{Number(tx.total_amount || 0).toLocaleString('en-IN')}
                      </span>
                      <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 ${statusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Getting Started Guide (shown when no connections) */}
          {(stats?.activeConnections || 0) === 0 && (
            <Card className="p-6 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[24px] border-none shadow-xl text-white">
              <h3 className="text-base font-black tracking-tight">Get Started with Business Network</h3>
              <p className="text-indigo-200 text-xs mt-1 mb-5">Follow these 3 steps to start trading digitally</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: '1', title: 'Connect a Supplier', desc: 'Search by phone, GST or business name', link: '/network/connections' },
                  { step: '2', title: 'Receive an Invoice', desc: 'Your supplier sends you a digital invoice', link: '/network/inbox' },
                  { step: '3', title: 'One-Click Import', desc: 'Products auto-added to your inventory', link: '/network/inbox' },
                ].map(({ step, title, desc, link }) => (
                  <Link key={step} to={link} className="p-4 bg-white/10 backdrop-blur rounded-2xl hover:bg-white/20 transition-all group">
                    <div className="w-7 h-7 rounded-full bg-white/20 text-white text-xs font-black flex items-center justify-center mb-2">
                      {step}
                    </div>
                    <p className="text-xs font-black text-white">{title}</p>
                    <p className="text-[10px] text-indigo-200 mt-0.5">{desc}</p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
