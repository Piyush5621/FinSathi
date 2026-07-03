import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Zap, Landmark, Lightbulb, TrendingUp, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import SectionHeader from './components/SectionHeader';
import NetworkTabs from './components/NetworkTabs';
import AIBanner from './components/AIBanner';
import { LAYOUT, TYPOGRAPHY, BUTTONS } from './utils/networkConstants';
import API from '../../../services/apiClient';
import Skeleton from '../../../components/ui/Skeleton';

const TABS = [
  { id: 'insights', label: 'AI Insights', icon: Lightbulb },
  { id: 'schemes', label: 'Govt Schemes', icon: Landmark },
  { id: 'lending', label: 'Lending & Credit', icon: TrendingUp },
];

export default function GrowthCenter() {
  const [activeTab, setActiveTab] = useState('insights');
  const [insights, setInsights] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [lending, setLending] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'insights') {
        const res = await API.get('/api/network/growth/recommendations');
        if (res.data?.success) setInsights(res.data.data.data || []);
      } else if (activeTab === 'schemes') {
        const res = await API.get('/api/network/growth/schemes');
        if (res.data?.success) setSchemes(res.data.data);
      } else if (activeTab === 'lending') {
        const res = await API.get('/api/network/growth/funding');
        if (res.data?.success) setLending(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={LAYOUT.container}>
      <SectionHeader 
        title="Growth Center"
        subtitle="AI-driven insights, government schemes, and financial services to grow your business."
        icon={Zap}
        action={
          <button className={BUTTONS.secondary}>
            Update Profile to get better matches
          </button>
        }
      />

      <NetworkTabs 
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <AIBanner message="Your business profile is 85% complete. Add GST details to unlock 3 more schemes." type="warning" />

      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className={`${LAYOUT.card} h-[160px] animate-pulse bg-slate-50`} />
            ))
          ) : insights.map(insight => (
            <Card key={insight.id} className={`${LAYOUT.card} border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 group`}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                  <Lightbulb size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className={`${TYPOGRAPHY.cardTitle} mb-2`}>{insight.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{insight.description}</p>
                  <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 focus-visible:outline-none focus-visible:underline">
                    Take Action <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'schemes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className={`${LAYOUT.card} h-[240px] animate-pulse bg-slate-50`} />
            ))
          ) : schemes.map(scheme => (
            <Card key={scheme.id} className={`${LAYOUT.card} flex flex-col h-full hover:border-emerald-200 transition-colors`}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Landmark size={18} aria-hidden="true" />
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck size={12} aria-hidden="true" /> Eligible
                </span>
              </div>
              
              <h3 className={`${TYPOGRAPHY.cardTitle} mb-2`}>{scheme.name}</h3>
              <p className="text-xs text-slate-500 font-medium mb-2">Govt Scheme</p>
              <p className={`${TYPOGRAPHY.body} mb-5 flex-1`}>{scheme.description}</p>
              
              <button className={`${BUTTONS.primary} w-full text-xs py-2 min-h-[36px] bg-emerald-600 hover:bg-emerald-700`}>
                Apply Now
              </button>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'lending' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className={`${LAYOUT.card} h-[160px] animate-pulse bg-slate-50`} />
            ))
          ) : lending.map(offer => (
            <Card key={offer.id} className={`${LAYOUT.card} hover:border-indigo-100 transition-colors`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`${TYPOGRAPHY.cardTitle}`}>{offer.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">{offer.provider}</p>
                </div>
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Pre-Approved
                </span>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Max Amount</p>
                  <p className="text-lg font-black text-slate-900">{offer.max_amount || '₹50,00,000'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Interest Rate</p>
                  <p className="text-sm font-black text-emerald-600">{offer.interest_rate || '1.2%'}</p>
                </div>
              </div>
              
              <button className={`${BUTTONS.primary} w-full text-xs py-2 min-h-[36px]`}>
                Apply Now <ExternalLink size={14} className="ml-1" aria-hidden="true" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
