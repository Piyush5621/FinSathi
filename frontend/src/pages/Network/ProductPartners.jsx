import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import { Star, Package, TrendingUp, Clock, ChevronRight, MapPin, Users2, X, Phone } from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

export default function ProductPartners() {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [preferred, setPreferred] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [productLinks, setProductLinks] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [connRes, prefRes] = await Promise.all([
        API.get('/network/connections'),
        API.get('/network/preferred')
      ]);
      setConnections(connRes.data?.data || []);
      setPreferred((prefRes.data?.data || []).map(p => p.supplier_id));
    } catch { toast.error('Failed to load partners'); }
    finally { setLoading(false); }
  };

  const openPartner = async (partner) => {
    setSelectedPartner(partner);
    try {
      const [profileRes, linksRes] = await Promise.all([
        API.get(`/network/connections/${partner.id}/profile`),
        API.get(`/network/product-links?supplier_id=${partner.id}`)
      ]);
      setPartnerProfile(profileRes.data?.data || null);
      setProductLinks(linksRes.data?.data || []);
    } catch {
      setPartnerProfile(null);
    }
  };

  const togglePreferred = async (partnerId) => {
    const isPreferred = preferred.includes(partnerId);
    try {
      if (isPreferred) {
        await API.delete(`/network/preferred/${partnerId}`);
        setPreferred(prev => prev.filter(id => id !== partnerId));
        toast.success('Removed from preferred suppliers');
      } else {
        await API.post('/network/preferred', { supplier_id: partnerId });
        setPreferred(prev => [...prev, partnerId]);
        toast.success('Marked as preferred supplier! ⭐');
      }
      if (partnerProfile) {
        setPartnerProfile(prev => ({ ...prev, isPreferred: !isPreferred }));
      }
    } catch {
      toast.error('Failed to update preferred status');
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Star size={22} className="text-amber-500" /> Product Partners
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Manage your supplier relationships, preferred partners, and product links.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} height="160px" rounded="rounded-[20px]" />)}
        </div>
      ) : connections.length === 0 ? (
        <Card className="p-16 text-center rounded-[24px] border-slate-100 shadow-sm">
          <Users2 size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No connected partners yet</p>
          <p className="text-slate-300 text-xs mt-1">Connect with suppliers in Business Connections</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map(conn => {
            const partner = conn.partner;
            const isPref = preferred.includes(partner?.id);
            return (
              <Card
                key={conn.id}
                className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm hover:shadow-md hover:border-indigo-100 cursor-pointer transition-all group"
                onClick={() => openPartner(partner)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-lg">
                      {(partner?.business_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{partner?.business_name || partner?.name}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                        <MapPin size={8} /> {partner?.city || '—'}
                      </p>
                    </div>
                  </div>
                  {isPref && (
                    <Star size={16} className="text-amber-400 fill-amber-400 shrink-0" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 bg-slate-50 rounded-xl text-center">
                    <p className="text-sm font-black text-slate-800">₹{Number(conn.trade_volume || 0).toLocaleString('en-IN')}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Trade Vol</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl text-center">
                    <p className="text-sm font-black text-indigo-600">{conn.connection_type}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Type</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-semibold">
                    Since {new Date(conn.connected_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Partner Detail Drawer */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => { setSelectedPartner(null); setPartnerProfile(null); }}>
          <div className="bg-white h-full w-full max-w-md shadow-2xl p-6 overflow-y-auto space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xl">
                  {(selectedPartner?.business_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedPartner?.business_name}</h3>
                  <p className="text-xs text-slate-400 font-semibold">{selectedPartner?.business_type || 'Business Partner'}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedPartner(null); setPartnerProfile(null); }} className="p-2 text-slate-300 hover:text-slate-600 rounded-xl">
                <X size={18} />
              </button>
            </div>

            {/* Preferred Toggle */}
            <button
              onClick={() => togglePreferred(selectedPartner.id)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border font-bold text-sm transition-all ${
                preferred.includes(selectedPartner.id)
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
              }`}
            >
              <Star size={15} className={preferred.includes(selectedPartner.id) ? 'fill-amber-400 text-amber-400' : ''} />
              {preferred.includes(selectedPartner.id) ? 'Preferred Supplier ✓' : 'Mark as Preferred'}
            </button>

            {/* Trade Stats */}
            {partnerProfile?.tradeStats && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Invoices', value: partnerProfile.tradeStats.totalTransactions },
                  { label: 'Imported', value: partnerProfile.tradeStats.importedCount },
                  { label: 'Trade Vol', value: `₹${(Number(partnerProfile.tradeStats.tradeVolume || 0) / 1000).toFixed(1)}K` },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-slate-50 rounded-xl text-center">
                    <p className="text-sm font-black text-slate-800">{value}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Contact */}
            <div className="p-4 border border-slate-100 rounded-2xl space-y-2">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Contact Info</p>
              {selectedPartner?.phone && (
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <Phone size={12} className="text-slate-400" /> {selectedPartner.phone}
                </p>
              )}
              {selectedPartner?.gstin && (
                <p className="text-xs font-mono text-slate-500">{selectedPartner.gstin}</p>
              )}
            </div>

            {/* Product Links */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Saved Product Links ({productLinks.length})
              </p>
              {productLinks.length === 0 ? (
                <p className="text-xs text-slate-300 text-center py-4">No product links yet. Import an invoice to create automatic links.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {productLinks.map(link => (
                    <div key={link.id} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-xl">
                      <div>
                        <p className="text-[10px] font-bold text-slate-700">{link.supplier_product_name}</p>
                        <p className="text-[9px] text-slate-400">→ {link.inventory?.name || 'Unknown'}</p>
                      </div>
                      <span className={`text-[8px] font-black border rounded-full px-1.5 py-0.5 ${link.auto_import ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                        {link.auto_import ? 'Auto' : 'Manual'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
