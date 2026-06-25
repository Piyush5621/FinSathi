import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';
import {
  Users2, Search, UserPlus, CheckCircle2, XCircle, Clock,
  Building2, Phone, MapPin, X, ChevronRight, Star, Handshake
} from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

const ConnectionTypeBadge = ({ type }) => {
  const colors = {
    Supplier: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Customer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Distributor: 'bg-violet-50 text-violet-700 border-violet-200',
    Retailer: 'bg-amber-50 text-amber-700 border-amber-200',
    Partner: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={`text-[9px] font-black border rounded-full px-2 py-0.5 ${colors[type] || colors.Partner}`}>
      {type}
    </span>
  );
};

export default function NetworkConnections() {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(null);
  const [connectionType, setConnectionType] = useState('Supplier');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [connRes, reqRes] = await Promise.all([
        API.get('/network/connections'),
        API.get('/network/connections/pending')
      ]);
      setConnections(connRes.data?.data || []);
      setPendingRequests(reqRes.data?.data || []);
    } catch {
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await API.get(`/network/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data?.data || []);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (receiverId) => {
    setSendingRequest(receiverId);
    try {
      await API.post('/network/connections/request', {
        receiver_id: receiverId,
        connection_type: connectionType
      });
      toast.success('Connection request sent!');
      setSearchResults(prev => prev.map(r =>
        r.id === receiverId ? { ...r, connection: { status: 'pending' } } : r
      ));
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to send request');
    } finally {
      setSendingRequest(null);
    }
  };

  const handleRespond = async (connectionId, action) => {
    try {
      await API.put(`/network/connections/${connectionId}/respond`, { action });
      toast.success(`Request ${action === 'accept' ? 'accepted' : 'rejected'}`);
      fetchData();
    } catch {
      toast.error('Failed to respond');
    }
  };

  const handleOpenProfile = async (partner) => {
    setSelectedPartner(partner);
    try {
      const res = await API.get(`/network/connections/${partner.id}/profile`);
      setPartnerProfile(res.data?.data || null);
    } catch {
      setPartnerProfile(null);
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Users2 size={22} className="text-indigo-600" />
          Business Connections
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Connect with suppliers, distributors, and retailers on FinSathi network.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel: Search + Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search Box */}
          <Card className="p-5 rounded-[20px] border-slate-100 bg-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Find Business</p>
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, phone, GST..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="bg-indigo-600 text-white border-none hover:bg-indigo-700 px-3 py-2 shrink-0"
              >
                <Search size={15} />
              </Button>
            </div>

            <div className="flex gap-2 mt-3">
              <p className="text-[9px] font-bold text-slate-400 self-center">Connect as:</p>
              {['Supplier', 'Customer', 'Distributor', 'Partner'].map(type => (
                <button
                  key={type}
                  onClick={() => setConnectionType(type)}
                  className={`text-[9px] font-bold border rounded-full px-2 py-0.5 transition-colors ${connectionType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </p>
                {searchResults.map(biz => (
                  <div key={biz.id} className="p-3 border border-slate-100 rounded-xl flex items-start justify-between gap-2 hover:border-indigo-200 transition-all">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{biz.business_name || biz.name}</p>
                      <p className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                        <MapPin size={8} /> {biz.city || 'Unknown city'}
                      </p>
                      {biz.phone && (
                        <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone size={8} /> {biz.phone}
                        </p>
                      )}
                    </div>
                    {biz.connection?.status === 'accepted' ? (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0">Connected</span>
                    ) : biz.connection?.status === 'pending' ? (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">Pending</span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(biz.id)}
                        disabled={sendingRequest === biz.id}
                        className="flex items-center gap-1 text-[9px] font-bold text-white bg-indigo-600 rounded-full px-2 py-0.5 hover:bg-indigo-700 transition-all shrink-0"
                      >
                        <UserPlus size={9} />
                        {sendingRequest === biz.id ? '...' : 'Connect'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <Card className="p-5 rounded-[20px] border-amber-100 bg-amber-50/20 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-3 flex items-center gap-1">
                <Clock size={12} /> Pending Requests ({pendingRequests.length})
              </p>
              <div className="space-y-3">
                {pendingRequests.map(req => (
                  <div key={req.id} className="p-3 bg-white border border-amber-100 rounded-xl space-y-2">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{req.requester?.business_name || 'Unknown Business'}</p>
                      <p className="text-[9px] text-slate-400 flex items-center gap-1">
                        <MapPin size={8} /> {req.requester?.city || '—'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(req.id, 'accept')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
                      >
                        <CheckCircle2 size={11} /> Accept
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, 'reject')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
                      >
                        <XCircle size={11} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Panel: Active Connections */}
        <div className="lg:col-span-3">
          <Card className="p-5 rounded-[24px] border-slate-100 bg-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1">
              <Handshake size={12} /> Active Connections ({connections.length})
            </p>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} height="80px" rounded="rounded-xl" />)}
              </div>
            ) : connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                <Users2 size={40} />
                <p className="text-sm font-semibold text-slate-400">No connections yet</p>
                <p className="text-xs text-slate-300">Use the search panel to find and connect with businesses</p>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map(conn => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all group"
                    onClick={() => handleOpenProfile(conn.partner)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">
                        {(conn.partner?.business_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{conn.partner?.business_name || conn.partner?.name}</p>
                          <ConnectionTypeBadge type={conn.connection_type} />
                        </div>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={8} /> {conn.partner?.city || '—'} · Connected {new Date(conn.connected_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-black text-slate-800">₹{Number(conn.trade_volume || 0).toLocaleString('en-IN')}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">Trade volume</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Partner Profile Drawer */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => { setSelectedPartner(null); setPartnerProfile(null); }}>
          <div
            className="bg-white h-full w-full max-w-md shadow-2xl p-8 overflow-y-auto space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-lg mb-2">
                  {(selectedPartner?.business_name || '?')[0].toUpperCase()}
                </div>
                <h3 className="text-lg font-black text-slate-900">{selectedPartner?.business_name || selectedPartner?.name}</h3>
                <p className="text-xs text-slate-400 font-semibold">{selectedPartner?.business_type || 'Business'}</p>
              </div>
              <button onClick={() => { setSelectedPartner(null); setPartnerProfile(null); }} className="p-2 text-slate-300 hover:text-slate-600 rounded-xl hover:bg-slate-50">
                <X size={18} />
              </button>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl">
              {selectedPartner?.phone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone size={12} className="text-slate-400" />
                  <span className="text-slate-700 font-semibold">{selectedPartner.phone}</span>
                </div>
              )}
              {(selectedPartner?.city || selectedPartner?.state) && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin size={12} className="text-slate-400" />
                  <span className="text-slate-700 font-semibold">
                    {[selectedPartner.city, selectedPartner.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {selectedPartner?.gstin && (
                <div className="flex items-center gap-2 text-xs">
                  <Building2 size={12} className="text-slate-400" />
                  <span className="text-slate-700 font-semibold font-mono">{selectedPartner.gstin}</span>
                </div>
              )}
            </div>

            {/* Trade Stats */}
            {partnerProfile?.tradeStats && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Transactions', value: partnerProfile.tradeStats.totalTransactions },
                  { label: 'Trade Volume', value: `₹${Number(partnerProfile.tradeStats.tradeVolume || 0).toLocaleString('en-IN')}` },
                  { label: 'Imports Completed', value: partnerProfile.tradeStats.importedCount },
                  { label: 'Preferred Status', value: partnerProfile.isPreferred ? '⭐ Preferred' : 'Not marked' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-white border border-slate-100 rounded-xl">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {partnerProfile && !partnerProfile.isPreferred && (
                <Button
                  onClick={async () => {
                    try {
                      await API.post('/network/preferred', { supplier_id: selectedPartner.id });
                      toast.success('Marked as preferred supplier!');
                      setPartnerProfile(prev => ({ ...prev, isPreferred: true }));
                    } catch {
                      toast.error('Failed to mark as preferred');
                    }
                  }}
                  className="w-full bg-amber-500 text-white border-none hover:bg-amber-600 font-bold flex items-center justify-center gap-2"
                >
                  <Star size={14} /> Mark as Preferred Supplier
                </Button>
              )}
              {partnerProfile?.isPreferred && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
                  <Star size={14} className="fill-amber-400 text-amber-400" /> Preferred Supplier
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
