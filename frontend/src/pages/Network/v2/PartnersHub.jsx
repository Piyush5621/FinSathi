import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Users2, Shield, UserPlus, MoreVertical, Search, MessageSquare, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import SectionHeader from './components/SectionHeader';
import NetworkTabs from './components/NetworkTabs';
import StatusBadge from './components/StatusBadge';
import EmptyState from './components/EmptyState';
import AIBanner from './components/AIBanner';
import { LAYOUT, TYPOGRAPHY, BUTTONS } from './utils/networkConstants';
import API from '../../../services/apiClient';

export default function PartnersHub() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [partners, setPartners] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const [connRes, pendingRes] = await Promise.all([
        API.get('/api/network/partners'),
        API.get('/api/network/partners/pending')
      ]);
      if (connRes.data?.success) setPartners(connRes.data.data);
      if (pendingRes.data?.success) setPending(pendingRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: 'all', label: 'All Partners', icon: Users2, count: partners.length },
    { id: 'pending', label: 'Pending Requests', icon: Shield, count: pending.length, color: 'amber' },
    { id: 'discover', label: 'Suggested', icon: UserPlus, count: 0, color: 'emerald' },
  ];

  return (
    <div className={LAYOUT.container}>
      <SectionHeader 
        title="My Partners"
        subtitle="Manage your business connections, view credit limits, and track relationship health."
        icon={Users2}
        action={
          <Link to="/network/directory" className={BUTTONS.primary}>
            <UserPlus size={16} aria-hidden="true" /> Find New Partners
          </Link>
        }
      />

      <NetworkTabs 
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'pending' && pending.length > 0 && (
        <AIBanner message={`You have ${pending.length} connection request(s) awaiting approval.`} type="warning" />
      )}

      {activeTab === 'all' && (
        <>
          <div className="relative mb-6">
            <label htmlFor="search-partners" className="sr-only">Search partners</label>
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="search-partners"
              type="text"
              placeholder="Search connected partners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className={`${LAYOUT.card} h-[240px] animate-pulse bg-slate-50`} />
              ))
            ) : partners.length === 0 ? (
              <div className="col-span-full">
                <EmptyState 
                  icon={Users2}
                  title="No partners found"
                  description="You don't have any business partners yet."
                  actionLabel="Find Partners"
                />
              </div>
            ) : partners.map(partner => (
              <Card key={partner.id} className={`${LAYOUT.card} flex flex-col h-full hover:border-indigo-100`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xl border border-indigo-100 shrink-0">
                    {partner.business_name?.[0] || '?'}
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="More options">
                    <MoreVertical size={16} aria-hidden="true" />
                  </button>
                </div>
                
                <h3 className={`${TYPOGRAPHY.cardTitle} mb-1 line-clamp-1`}>{partner.business_name}</h3>
                <p className="text-xs text-slate-500 font-medium mb-4">{partner.business_type}</p>
                
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Trade Volume</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      ₹{(partner.tradeVolume / 100000).toFixed(2)}L
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Credit Limit</span>
                    <span className="font-bold text-slate-800">₹{(partner.creditLimit / 100000).toFixed(2)}L</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Status</span>
                    <StatusBadge status={partner.status} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button className={`${BUTTONS.primary} flex-1 text-xs py-2 min-h-[36px]`}>
                    <MessageSquare size={14} aria-hidden="true" /> Message
                  </button>
                  <Link to={`/network/workspace?tab=history&partner=${partner.id}`} className={`${BUTTONS.secondary} flex-1 text-xs py-2 min-h-[36px]`}>
                    <TrendingUp size={14} aria-hidden="true" /> Trade
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-4">
          {loading ? (
             Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className={`${LAYOUT.card} h-[120px] animate-pulse bg-slate-50`} />
              ))
          ) : pending.length === 0 ? (
            <EmptyState 
              icon={Shield}
              title="No pending requests"
              description="You have no connection requests awaiting your approval."
            />
          ) : pending.map(req => (
            <Card key={req.id} className={`${LAYOUT.card} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-100`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-black text-xl border border-amber-100 shrink-0">
                  {req.business_name?.[0] || '?'}
                </div>
                <div>
                  <h3 className={TYPOGRAPHY.cardTitle}>{req.business_name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{req.business_type}</p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button className={`${BUTTONS.secondary} flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300`}>
                  Decline
                </button>
                <button className={`${BUTTONS.primary} flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700`}>
                  Accept Partner
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'discover' && (
        <EmptyState 
          icon={UserPlus} 
          title="Discover new partners" 
          description="AI matches will appear here based on your trade patterns." 
          actionLabel="Browse Directory" 
          actionTo="/network/directory" 
        />
      )}
    </div>
  );
}
