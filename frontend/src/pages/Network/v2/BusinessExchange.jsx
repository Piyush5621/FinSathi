import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  ArrowLeftRight, ShoppingCart, Package, Truck, Building2, Store,
  Warehouse, AlertTriangle, FileText, Search, Filter, Clock, Plus, X
} from 'lucide-react';
import toast from 'react-hot-toast';

import NetworkTabs from './components/NetworkTabs';
import AIBanner from './components/AIBanner';
import SectionHeader from './components/SectionHeader';
import EmptyState from './components/EmptyState';
import PostListingModal from './modals/PostListingModal';
import { LAYOUT, TYPOGRAPHY, BUTTONS } from './utils/networkConstants';
import API from '../../../services/apiClient';
import { TrendingUp } from 'lucide-react';

const TABS = [
  { id: 'buy-requests', label: 'Buy Requests', icon: ShoppingCart, color: 'blue' },
  { id: 'sell-listings', label: 'Sell Listings', icon: Package, color: 'emerald' },
  { id: 'supplier-needs', label: 'Supplier Needs', icon: Building2, color: 'violet' },
  { id: 'distributor', label: 'Distributor Search', icon: TrendingUp, color: 'indigo' },
  { id: 'franchise', label: 'Franchise', icon: Store, color: 'amber' },
  { id: 'logistics', label: 'Logistics', icon: Truck, color: 'sky' },
  { id: 'warehouse', label: 'Warehouse', icon: Warehouse, color: 'teal' },
  { id: 'dead-stock', label: 'Dead Stock', icon: AlertTriangle, color: 'rose' },
  { id: 'tenders', label: 'Tenders', icon: FileText, color: 'slate' },
];

export default function BusinessExchange() {
  const [activeTab, setActiveTab] = useState('buy-requests');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [respondMessage, setRespondMessage] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchListings();
  }, [activeTab]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      // Map frontend tab IDs to backend types if needed, or just send the category
      const res = await API.get(`/api/network/marketplace/search?category=${activeTab}`);
      if (res.data?.success) {
        setListings(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return listings;
    return listings.filter(item => 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.postedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [listings, searchQuery]);

  const handleRespondSubmit = (e) => {
    e.preventDefault();
    if (!respondMessage.trim()) return toast.error('Please enter a message');
    toast.success('Response sent successfully!');
    setShowRespondModal(null);
    setRespondMessage('');
  };

  const getAIBannerMsg = () => {
    switch (activeTab) {
      case 'buy-requests': return "📊 3 sellers in your area match your category";
      case 'dead-stock': return "⚡ Your inventory may have slow-moving items — scan & post in 1 tap";
      case 'warehouse': return "🏢 Share unused warehouse space to reduce operational costs by up to 40%";
      default: return "💡 Enhance your listing with pictures and clear specs to get 3x more responses";
    }
  };

  return (
    <div className={LAYOUT.container}>
      <SectionHeader 
        title="Business Exchange"
        subtitle="Post requirements · Find suppliers · Liquidate dead stock · Discover opportunities"
        icon={ArrowLeftRight}
        action={
          <button 
            onClick={() => setShowPostModal(true)} 
            className={BUTTONS.primary}
            aria-label="Post a new listing"
          >
            <Plus size={16} aria-hidden="true" /> <span className="hidden sm:inline">Post Listing</span>
          </button>
        }
      />

      <NetworkTabs 
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="outline"
      />

      <AIBanner message={getAIBannerMsg()} type={activeTab === 'dead-stock' ? 'warning' : 'default'} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="search-exchange" className="sr-only">Search listings</label>
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="search-exchange"
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
          />
        </div>
        <select aria-label="Filter by location" className="px-3 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all">
          <option>All Locations</option>
          <option>Delhi NCR</option>
          <option>Maharashtra</option>
          <option>Gujarat</option>
          <option>Karnataka</option>
        </select>
        <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <Filter size={14} aria-hidden="true" /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className={`${LAYOUT.card} h-[240px] animate-pulse bg-slate-50`} />
          ))
        ) : filteredData.length === 0 ? (
          <div className="col-span-full">
            <EmptyState 
              icon={Search}
              title="No listings found"
              description="There are currently no listings matching your search in this category."
              actionLabel="Post a Requirement"
              onAction={() => setShowPostModal(true)}
            />
          </div>
        ) : (
          filteredData.map((item) => (
            <Card key={item.id} className={`${LAYOUT.card} flex flex-col h-full ${activeTab === 'dead-stock' ? 'border-rose-100 hover:border-rose-200' : 'hover:border-indigo-100'}`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${activeTab === 'dead-stock' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                  {TABS.find(t => t.id === activeTab)?.label}
                </span>
                {item.urgent && (
                  <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full"><Clock size={10} aria-hidden="true" /> Urgent</span>
                )}
              </div>
              
              <h3 className={`${TYPOGRAPHY.cardTitle} mb-1.5 line-clamp-2`}>{item.title}</h3>
              <p className={`${TYPOGRAPHY.body} mb-4 line-clamp-2`}>{item.specs}</p>
              
              <div className="space-y-2 mb-5 flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Quantity</span>
                  <span className="font-bold text-slate-800">{item.quantity}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">{item.price ? 'Price' : 'Budget'}</span>
                  <span className="font-bold text-emerald-600">{item.price || item.budget}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Location</span>
                  <span className="font-bold text-slate-800">{item.location}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0" aria-hidden="true">
                    {item.postedBy[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{item.postedBy}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{item.postedAt} • {item.responses} responses</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <button 
                  onClick={() => setShowRespondModal(item)} 
                  className={`${BUTTONS.primary} flex-1 text-[11px] py-2 min-h-[36px]`}
                >
                  Respond
                </button>
                <button 
                  className={`${BUTTONS.secondary} text-[11px] py-2 min-h-[36px]`}
                >
                  Save
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      <PostListingModal 
        isOpen={showPostModal} 
        onClose={() => setShowPostModal(false)} 
        tabs={TABS} 
        onSuccess={() => setShowPostModal(false)} 
      />

      {showRespondModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="respond-modal-title"
        >
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-6 focus:outline-none" tabIndex="-1">
            <div className="flex justify-between items-center mb-5">
              <h2 id="respond-modal-title" className="text-lg font-black text-slate-900">Respond to Listing</h2>
              <button 
                onClick={() => setShowRespondModal(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                aria-label="Close modal"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            
            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl mb-5">
              <p className="text-xs font-bold text-slate-900">{showRespondModal.title}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium">Posted by {showRespondModal.postedBy}</p>
            </div>

            <form onSubmit={handleRespondSubmit}>
              <div className="mb-5">
                <label htmlFor="respond-msg" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Your Message <span className="text-rose-500">*</span></label>
                <textarea 
                  id="respond-msg"
                  rows="4" 
                  className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" 
                  placeholder="Introduce your business and propose your terms..."
                  value={respondMessage}
                  onChange={e => setRespondMessage(e.target.value)}
                  required
                ></textarea>
              </div>
              <div className="text-[11px] text-slate-500 mb-5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                Your business profile and contact details will be shared automatically.
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setShowRespondModal(null)} className={BUTTONS.ghost}>
                  Cancel
                </button>
                <button type="submit" className={BUTTONS.primary}>
                  Send Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
