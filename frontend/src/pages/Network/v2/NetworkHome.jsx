import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import Skeleton from '../../../components/ui/Skeleton';
import {
  Users2, Inbox, Send, CreditCard, Award, 
  Plus, CheckCircle2, Clock, RotateCcw, AlertTriangle,
  Search, ArrowRight, ShieldCheck, RefreshCw, FileText,
  ExternalLink, Sparkles
} from 'lucide-react';
import API from '../../../services/apiClient';
import toast from 'react-hot-toast';

import PartnersTab from './components/PartnersTab';
import ReputationScoreCard from './components/ReputationScoreCard';
import ProductReviewModal from '../ProductReviewModal';
import SendInvoiceModal from './modals/SendInvoiceModal';
import SetCreditModal from './modals/SetCreditModal';
import EmptyState from './components/EmptyState';
import StatusBadge from './components/StatusBadge';
import { LAYOUT, TYPOGRAPHY, BUTTONS } from './utils/networkConstants';

const TABS = [
  { id: 'partners', label: 'Partners', icon: Users2, color: 'indigo' },
  { id: 'inbox', label: 'Trade Inbox', icon: Inbox, color: 'emerald' },
  { id: 'outbox', label: 'Trade Outbox', icon: Send, color: 'blue' },
  { id: 'credits', label: 'Trade Credit', icon: CreditCard, color: 'violet' },
  { id: 'trust', label: 'Trust Score', icon: Award, color: 'amber' }
];

export default function NetworkHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'partners';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(true);
  const [inboxData, setInboxData] = useState([]);
  const [outboxData, setOutboxData] = useState([]);
  const [creditData, setCreditData] = useState({ creditGiven: [], creditReceived: [] });
  const [inboxFilter, setInboxFilter] = useState('all');

  // Modals
  const [reviewTransaction, setReviewTransaction] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedPartnerForCredit, setSelectedPartnerForCredit] = useState(null);

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      const [inboxRes, outboxRes, creditRes] = await Promise.all([
        API.get('/api/network/trade/inbox').catch(() => ({ data: { data: [] } })),
        API.get('/api/network/trade/outbox').catch(() => ({ data: { data: [] } })),
        API.get('/api/network/trade/credit').catch(() => ({ data: { data: { creditGiven: [], creditReceived: [] } } }))
      ]);

      setInboxData(inboxRes.data?.data || []);
      setOutboxData(outboxRes.data?.data || []);
      setCreditData(creditRes.data?.data || { creditGiven: [], creditReceived: [] });
    } catch (err) {
      console.warn('Failed to load network data:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingInboxCount = inboxData.filter(i => i.status === 'Pending').length;

  const filteredInbox = useMemo(() => {
    if (inboxFilter === 'all') return inboxData;
    if (inboxFilter === 'pending') return inboxData.filter(i => i.status === 'Pending');
    if (inboxFilter === 'imported') return inboxData.filter(i => i.status === 'Imported');
    if (inboxFilter === 'rejected') return inboxData.filter(i => i.status === 'Rejected');
    return inboxData;
  }, [inboxData, inboxFilter]);

  const handlePartnerSelectAction = (partner, targetTab) => {
    if (targetTab === 'outbox') {
      setSelectedPartnerForCredit(partner);
      setShowSendModal(true);
    } else if (targetTab === 'credits') {
      setSelectedPartnerForCredit(partner);
      setShowCreditModal(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  return (
    <div className={LAYOUT.container}>
      {/* ─── Top Master Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Business Network</h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
              B2B Hub
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Connect with verified suppliers & buyers · Exchange electronic bills · Auto-import stock · Manage credit terms
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setSelectedPartnerForCredit(null);
              setShowSendModal(true);
            }}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Send size={14} /> Send Bill
          </button>
        </div>
      </div>

      {/* ─── 5-Pillar Navigation Tabs ─── */}
      <div className="flex gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.id === 'inbox' && pendingInboxCount > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingInboxCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Pillar 1: Partners ─── */}
      {activeTab === 'partners' && (
        <PartnersTab onSelectPartner={handlePartnerSelectAction} />
      )}

      {/* ─── Pillar 2: Trade Inbox ─── */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-1.5">
              {['all', 'pending', 'imported', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setInboxFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    inboxFilter === f
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f === 'all' ? `All Invoices (${inboxData.length})` : f}
                </button>
              ))}
            </div>
            <button
              onClick={fetchNetworkData}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              title="Refresh Inbox"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton height="90px" rounded="rounded-[20px]" />
              <Skeleton height="90px" rounded="rounded-[20px]" />
            </div>
          ) : filteredInbox.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No bills in Trade Inbox"
              description="When connected wholesale suppliers send you digital invoices, they will appear here for 1-click stock import."
            />
          ) : (
            <div className="space-y-3">
              {filteredInbox.map((tx) => (
                <Card
                  key={tx.id}
                  className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm hover:border-emerald-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 font-black text-lg flex items-center justify-center border border-emerald-100 shrink-0">
                      {(tx.sender?.business_name || 'S')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{tx.sender?.business_name || 'Wholesale Supplier'}</h4>
                        <StatusBadge status={tx.status} />
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Invoice #{tx.invoice_no} • {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Total Amount</p>
                      <p className="text-base font-black text-slate-900">₹{Number(tx.total_amount || 0).toLocaleString('en-IN')}</p>
                    </div>

                    {tx.status === 'Pending' ? (
                      <button
                        onClick={() => setReviewTransaction(tx)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Sparkles size={13} /> Review & Import
                      </button>
                    ) : tx.status === 'Imported' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                        <CheckCircle2 size={13} /> Stock Synced
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-bold px-3 py-1.5 bg-slate-50 rounded-xl">
                        {tx.status}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Pillar 3: Trade Outbox ─── */}
      {activeTab === 'outbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dispatched Invoices ({outboxData.length})</h3>
            <button
              onClick={() => {
                setSelectedPartnerForCredit(null);
                setShowSendModal(true);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus size={13} /> Send New Bill
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton height="90px" rounded="rounded-[20px]" />
            </div>
          ) : outboxData.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No dispatched invoices"
              description="Dispatch digital tax invoices to connected retail buyers to allow them 1-click inventory stocking."
              actionLabel="Send First Bill"
              onAction={() => setShowSendModal(true)}
            />
          ) : (
            <div className="space-y-3">
              {outboxData.map((tx) => (
                <Card
                  key={tx.id}
                  className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm hover:border-blue-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 font-black text-lg flex items-center justify-center border border-blue-100 shrink-0">
                      {(tx.receiver?.business_name || 'B')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{tx.receiver?.business_name || 'Retail Buyer'}</h4>
                        <StatusBadge status={tx.status} />
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Invoice #{tx.invoice_no} • {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Dispatched Amount</p>
                      <p className="text-base font-black text-slate-900">₹{Number(tx.total_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                      {tx.status === 'Imported' ? '✓ Accepted by Buyer' : tx.status === 'Viewed' ? '👁 Viewed' : '⏳ Dispatched'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Pillar 4: Trade Credit ─── */}
      {activeTab === 'credits' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">B2B Trade Credit Ledgers</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Mutual credit terms, payables, and receivables between businesses.</p>
            </div>
            <button
              onClick={() => {
                setSelectedPartnerForCredit(null);
                setShowCreditModal(true);
              }}
              className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus size={13} /> Set Credit Limit
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Credit Given (Receivables from Buyers) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Credit Given (To Buyers)</span>
                <span className="text-xs text-slate-500 font-bold">{creditData.creditGiven?.length || 0} Accounts</span>
              </div>

              {!creditData.creditGiven || creditData.creditGiven.length === 0 ? (
                <Card className="p-6 text-center border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
                  <p className="text-xs text-slate-500 font-medium">No active credit extended to buyers.</p>
                </Card>
              ) : (
                creditData.creditGiven.map((c) => {
                  const util = Number(c.amount_utilized || c.outstanding_amount || 0);
                  const lim = Number(c.credit_limit || 1);
                  const pct = Math.min(Math.round((util / lim) * 100), 100);

                  return (
                    <Card key={c.id} className="p-5 bg-white border-slate-100 rounded-2xl shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{c.receiver?.business_name || c.buyer?.business_name || 'Buyer Store'}</h4>
                          <p className="text-[11px] text-slate-500">Terms: Net {c.payment_terms_days || 30} Days</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedPartnerForCredit(c);
                            setShowCreditModal(true);
                          }}
                          className="text-xs font-bold text-indigo-600 hover:underline"
                        >
                          Adjust Terms
                        </button>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-500">Outstanding: ₹{util.toLocaleString('en-IN')}</span>
                          <span className="text-slate-900">Ceiling: ₹{lim.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${pct > 85 ? 'bg-rose-500' : 'bg-indigo-600'} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Credit Received (Payables to Suppliers) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Credit Received (From Suppliers)</span>
                <span className="text-xs text-slate-500 font-bold">{creditData.creditReceived?.length || 0} Accounts</span>
              </div>

              {!creditData.creditReceived || creditData.creditReceived.length === 0 ? (
                <Card className="p-6 text-center border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
                  <p className="text-xs text-slate-500 font-medium">No supplier credit accounts recorded yet.</p>
                </Card>
              ) : (
                creditData.creditReceived.map((c) => {
                  const util = Number(c.amount_utilized || c.outstanding_amount || 0);
                  const lim = Number(c.credit_limit || 1);
                  const pct = Math.min(Math.round((util / lim) * 100), 100);

                  return (
                    <Card key={c.id} className="p-5 bg-white border-slate-100 rounded-2xl shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{c.sender?.business_name || c.supplier?.business_name || 'Wholesale Supplier'}</h4>
                          <p className="text-[11px] text-slate-500">Net Terms: {c.payment_terms_days || 30} Days</p>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Active Credit
                        </span>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-500">Due: ₹{util.toLocaleString('en-IN')}</span>
                          <span className="text-slate-900">Total Limit: ₹{lim.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Pillar 5: Trust Score ─── */}
      {activeTab === 'trust' && (
        <ReputationScoreCard />
      )}

      {/* ─── Review & Import Modal (Connected to StockService) ─── */}
      {reviewTransaction && (
        <ProductReviewModal
          transaction={reviewTransaction}
          onClose={() => setReviewTransaction(null)}
          onImportDone={() => {
            setReviewTransaction(null);
            fetchNetworkData();
          }}
        />
      )}

      {/* ─── Send Invoice Modal ─── */}
      {showSendModal && (
        <SendInvoiceModal
          isOpen={showSendModal}
          initialPartner={selectedPartnerForCredit}
          onClose={() => setShowSendModal(false)}
          onSuccess={fetchNetworkData}
        />
      )}

      {/* ─── Set Credit Limit Modal ─── */}
      {showCreditModal && (
        <SetCreditModal
          isOpen={showCreditModal}
          partner={selectedPartnerForCredit}
          onClose={() => setShowCreditModal(false)}
          onSuccess={fetchNetworkData}
        />
      )}
    </div>
  );
}
