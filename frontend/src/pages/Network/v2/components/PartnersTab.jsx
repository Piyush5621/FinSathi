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

  // Connection Request Modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [connectionType, setConnectionType] = useState('Supplier');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [connRes, pendRes, dirRes] = await Promise.all([
        API.get('/api/network/connections').catch(() => ({ data: { data: [] } })),
        API.get('/api/network/connections/pending').catch(() => ({ data: { data: [] } })),
        API.get('/api/network/search?query=').catch(() => ({ data: { data: [] } }))
      ]);

      setPartners(connRes.data?.data || []);
      setPendingRequests(pendRes.data?.data || []);
      setDirectory(dirRes.data?.data || []);
    } catch (err) {
      console.warn('Error loading partners data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (connectionId, status) => {
    try {
      await API.put(`/api/network/connections/${connectionId}/respond`, { status });
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
      await API.post('/api/network/connections/request', {
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
    return partners.filter(p => {
      const name = (p.partner?.business_name || p.business_name || '').toLowerCase();
      const city = (p.partner?.city || p.city || '').toLowerCase();
      return name.includes(searchQuery.toLowerCase()) || city.includes(searchQuery.toLowerCase());
    });
  }, [partners, searchQuery]);

  const filteredDirectory = useMemo(() => {
    return directory.filter(d => {
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
            <span>Connected Partners ({partners.length})</span>
          </button>
          <button
            onClick={() => setSubTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield size={14} />
            <span>Pending Requests</span>
            {pendingRequests.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab('discover')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'discover' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus size={14} />
            <span>Discover Directory</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={subTab === 'discover' ? 'Search by name, city, GST...' : 'Search partners...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ─── 1. Connected Partners View ─── */}
      {subTab === 'partners' && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton height="180px" rounded="rounded-[20px]" />
              <Skeleton height="180px" rounded="rounded-[20px]" />
              <Skeleton height="180px" rounded="rounded-[20px]" />
            </div>
          ) : filteredPartners.length === 0 ? (
            <EmptyState
              icon={Users2}
              title="No connected partners found"
              description="Connect with suppliers, distributors, or retail buyers on Karobar Network to exchange invoices seamlessly."
              actionLabel="Discover Suppliers & Buyers"
              onAction={() => setSubTab('discover')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPartners.map((conn) => {
                const partnerName = conn.partner?.business_name || conn.business_name || 'Business Partner';
                const partnerType = conn.connection_type || conn.partner?.business_type || 'Trader';
                const city = conn.partner?.city || conn.city || 'India';
                const volume = Number(conn.trade_volume || 0);

                return (
                  <Card key={conn.id} className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm hover:border-indigo-100 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-base flex items-center justify-center shadow-sm">
                            {partnerName[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{partnerName}</h3>
                            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <Building2 size={11} /> {partnerType} • {city}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status="connected" />
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs mb-4">
                        <div className="flex justify-between text-slate-500">
                          <span>Trade Volume</span>
                          <span className="font-black text-slate-900">₹{volume.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Connection</span>
                          <span className="font-semibold text-indigo-600">{conn.connection_type || 'Partner'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => onSelectPartner?.(conn, 'outbox')}
                        className="flex-1 py-2 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Send size={12} /> Send Bill
                      </button>
                      <button
                        onClick={() => onSelectPartner?.(conn, 'credits')}
                        className="flex-1 py-2 px-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <CreditCard size={12} /> Credit Terms
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
            <Skeleton height="140px" rounded="rounded-[20px]" />
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

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton height="180px" rounded="rounded-[20px]" />
              <Skeleton height="180px" rounded="rounded-[20px]" />
              <Skeleton height="180px" rounded="rounded-[20px]" />
            </div>
          ) : filteredDirectory.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No businesses found in directory"
              description="Try adjusting your search criteria or category filter."
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
                      className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <UserPlus size={13} /> Connect Partner
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Connect with Business</h3>
              <button onClick={() => setShowConnectModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-sm font-bold text-slate-900">{selectedTarget.business_name || selectedTarget.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{selectedTarget.business_type || 'Merchant'} • {selectedTarget.city || 'India'}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">How do you trade with this business?</label>
              <select
                value={connectionType}
                onChange={(e) => setConnectionType(e.target.value)}
                className="w-full p-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Supplier">They are my Wholesale Supplier</option>
                <option value="Customer">They are my Retail Customer / Buyer</option>
                <option value="Distributor">They are my Regional Distributor</option>
                <option value="Partner">General Trade Partner</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConnectModal(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRequest}
                disabled={connecting}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {connecting ? 'Sending...' : <><Send size={13} /> Send Request</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
