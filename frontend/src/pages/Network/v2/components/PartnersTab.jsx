import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../../components/ui/Card';
import { 
  Users2, Shield, UserPlus, Search, Filter, MapPin, 
  Star, ShieldCheck, Check, X, Phone, Building2, 
  Send, ExternalLink, ArrowRight, TrendingUp, CreditCard 
} from 'lucide-react';
import API from '../../../../services/apiClient';
import toast from 'react-hot-toast';
import Skeleton from '../../../../components/ui/Skeleton';
import EmptyState from './EmptyState';
import StatusBadge from './StatusBadge';
import { LAYOUT, TYPOGRAPHY, BUTTONS } from '../utils/networkConstants';

const CATEGORIES = [
  { id: 'all', label: 'All Businesses' },
  { id: 'wholesale', label: 'Wholesalers & Distributors' },
  { id: 'retail', label: 'Retailers & Kiranas' },
  { id: 'manufacturing', label: 'Manufacturers' },
];

export default function PartnersTab({ onSelectPartner, defaultSubTab = 'partners' }) {
  const [subTab, setSubTab] = useState(defaultSubTab); // 'partners' | 'pending' | 'discover'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  
  const [partners, setPartners] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Connection Request Modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [connectionType, setConnectionType] = useState('Supplier');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (subTab === 'discover' && searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        performSearch(searchQuery.trim());
      }, 300);
      return () => clearTimeout(timer);
    } else if (searchQuery.trim().length < 2) {
      setDirectory([]);
      setSearching(false);
    }
  }, [searchQuery, subTab]);

  const performSearch = async (term) => {
    if (!term || term.length < 2) {
      setDirectory([]);
      return;
    }
    setSearching(true);
    try {
      const res = await API.get(`/network/search?q=${encodeURIComponent(term)}`);
      const rawDir = res.data?.data;
      setDirectory(Array.isArray(rawDir) ? rawDir : Array.isArray(rawDir?.data) ? rawDir.data : []);
    } catch (err) {
      console.warn('Search failed:', err);
      setDirectory([]);
    } finally {
      setSearching(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [connRes, pendRes] = await Promise.all([
        API.get('/network/connections').catch(() => ({ data: { data: [] } })),
        API.get('/network/connections/pending').catch(() => ({ data: { data: [] } }))
      ]);

      const rawPartners = connRes.data?.data;
      setPartners(Array.isArray(rawPartners) ? rawPartners : Array.isArray(rawPartners?.data) ? rawPartners.data : []);

      const rawPending = pendRes.data?.data;
      setPendingRequests(Array.isArray(rawPending) ? rawPending : Array.isArray(rawPending?.data) ? rawPending.data : []);
    } catch (err) {
      console.warn('Error loading partners data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (connectionId, status) => {
    try {
      await API.put(`/network/connections/${connectionId}/respond`, { status });
      toast.success(status === 'accepted' ? 'Connection accepted!' : 'Connection declined');
      fetchData();
    } catch (err) {
      toast.error('Failed to respond to request');
    }
  };

  const handleSendRequest = async () => {
    if (!selectedTarget) return;
    setConnecting(true);
    try {
      await API.post('/network/connections/request', {
        receiver_id: selectedTarget.id || selectedTarget.user_id,
        connection_type: connectionType
      });
      toast.success(`Connection request sent to ${selectedTarget.business_name || selectedTarget.name}`);
      setShowConnectModal(false);
      setSelectedTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.summary || err.response?.data?.error || 'Failed to send request');
    } finally {
      setConnecting(false);
    }
  };

  const filteredPartners = useMemo(() => {
    const list = Array.isArray(partners) ? partners : [];
    return list.filter(p => {
      const name = (p.partner?.business_name || p.business_name || '').toLowerCase();
      const city = (p.partner?.city || p.city || '').toLowerCase();
      return name.includes(searchQuery.toLowerCase()) || city.includes(searchQuery.toLowerCase());
    });
  }, [partners, searchQuery]);

  const filteredDirectory = useMemo(() => {
    const list = Array.isArray(directory) ? directory : [];
    return list.filter(d => {
      const name = (d.business_name || d.name || '').toLowerCase();
      const type = (d.business_type || d.type || '').toLowerCase();
      const city = (d.city || d.location || '').toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || city.includes(searchQuery.toLowerCase());
      const matchesCat = activeCategory === 'all' || type.includes(activeCategory);
      return matchesSearch && matchesCat;
    });
  }, [directory, searchQuery, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Sub-tabs header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('partners')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'partners' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users2 size={14} />
            Connected ({partners.length})
          </button>
          <button
            onClick={() => setSubTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
              subTab === 'pending' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield size={14} />
            Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-black animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab('discover')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'discover' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search size={14} />
            Find Businesses
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={subTab === 'discover' ? "Search GSTIN, name, phone (min 2 chars)..." : "Filter partners..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* ─── 1. Connected Partners View ─── */}
      {subTab === 'partners' && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton height="200px" rounded="rounded-[20px]" />
              <Skeleton height="200px" rounded="rounded-[20px]" />
              <Skeleton height="200px" rounded="rounded-[20px]" />
            </div>
          ) : filteredPartners.length === 0 ? (
            <EmptyState
              icon={Users2}
              title="No connected partners found"
              description={searchQuery ? `No partners matched "${searchQuery}".` : "You have not connected with any suppliers or buyers yet."}
              action={
                <button
                  onClick={() => setSubTab('discover')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <UserPlus size={14} /> Find & Connect Businesses
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPartners.map((p) => {
                const partnerObj = p.partner || p;
                return (
                  <Card key={p.id} className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 font-black text-lg flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
                            {(partnerObj.business_name || 'B')[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {partnerObj.business_name || 'Verified Merchant'}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <MapPin size={11} className="text-slate-400" />
                              {partnerObj.city || 'India'}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={p.status || 'Connected'} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Role</span>
                          <strong className="text-slate-700 font-semibold">{p.connection_type || 'Trade Partner'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Trust Score</span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Star size={11} className="fill-emerald-500" /> 88/100
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => onSelectPartner?.(partnerObj, 'outbox')}
                        className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <Send size={12} /> Send Bill
                      </button>
                      <button
                        onClick={() => onSelectPartner?.(partnerObj, 'credits')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                        title="Manage Trade Credit"
                      >
                        <CreditCard size={13} />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 2. Pending Requests View ─── */}
      {subTab === 'pending' && (
        <div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton height="80px" rounded="rounded-[20px]" />
              <Skeleton height="80px" rounded="rounded-[20px]" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No pending requests"
              description="You have no incoming connection requests awaiting your approval."
            />
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <Card key={req.id} className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 font-black text-lg flex items-center justify-center border border-amber-100">
                      {(req.requester?.business_name || 'B')[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{req.requester?.business_name || 'Merchant'}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Wants to connect as <strong className="text-slate-800">{req.connection_type || 'Partner'}</strong> • {req.requester?.city || 'India'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleRespond(req.id, 'declined')}
                      className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleRespond(req.id, 'accepted')}
                      className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Accept & Connect
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── 3. Discover Directory View ─── */}
      {subTab === 'discover' && (
        <div className="space-y-4">
          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  activeCategory === cat.id
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {searching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton height="180px" rounded="rounded-[20px]" />
              <Skeleton height="180px" rounded="rounded-[20px]" />
              <Skeleton height="180px" rounded="rounded-[20px]" />
            </div>
          ) : searchQuery.trim().length < 2 ? (
            <EmptyState
              icon={Search}
              title="Search Business Directory"
              description="Enter at least 2 characters in the search box above to find verified suppliers, manufacturers, and retailers across India."
            />
          ) : filteredDirectory.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No businesses found"
              description={`No businesses matched "${searchQuery}". Try searching by phone, GSTIN, or business name.`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDirectory.map((b) => (
                <Card key={b.id || b.user_id} className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-all">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center">
                        {(b.business_name || b.name || 'B')[0].toUpperCase()}
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <ShieldCheck size={11} /> GST Verified
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">{b.business_name || b.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{b.business_type || b.type || 'Wholesaler / Retailer'}</p>
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                      <MapPin size={11} /> {b.city || b.location || 'India'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => {
                        setSelectedTarget(b);
                        setShowConnectModal(true);
                      }}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <UserPlus size={13} />
                      Connect Business
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Connect Request Modal ─── */}
      {showConnectModal && selectedTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Connect with Business</h3>
              <button
                onClick={() => { setShowConnectModal(false); setSelectedTarget(null); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-sm">
                {(selectedTarget.business_name || selectedTarget.name || 'B')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{selectedTarget.business_name || selectedTarget.name}</p>
                <p className="text-[11px] text-slate-500">{selectedTarget.city || 'India'} • GST Verified</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-slate-700">How do you want to connect?</label>
              <div className="grid grid-cols-2 gap-2">
                {['Supplier', 'Buyer'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setConnectionType(type)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      connectionType === type
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    I am their {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowConnectModal(false); setSelectedTarget(null); }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={connecting}
                onClick={handleSendRequest}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                {connecting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
