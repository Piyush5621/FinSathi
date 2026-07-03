import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import Skeleton from '../../../components/ui/Skeleton';
import {
  Inbox, Send, CreditCard, RotateCcw, Clock, Plus,
  Download, Search, Filter, AlertTriangle
} from 'lucide-react';
import API from '../../../services/apiClient';
import toast from 'react-hot-toast';

import ProductReviewModal from '../ProductReviewModal';
import NetworkTabs from './components/NetworkTabs';
import AIBanner from './components/AIBanner';
import SectionHeader from './components/SectionHeader';
import EmptyState from './components/EmptyState';
import StatusBadge from './components/StatusBadge';
import SetCreditModal from './modals/SetCreditModal';
import SendInvoiceModal from './modals/SendInvoiceModal';

import { LAYOUT, TYPOGRAPHY, BUTTONS } from './utils/networkConstants';

const TABS = [
  { id: 'inbox', label: 'Purchase Inbox', icon: Inbox, count: 0, color: 'emerald' },
  { id: 'outbox', label: 'Sales Outbox', icon: Send, count: 0, color: 'blue' },
  { id: 'credits', label: 'Trade Credits', icon: CreditCard, count: 0, color: 'violet' },
  { id: 'returns', label: 'Trade Returns', icon: RotateCcw, count: 0, color: 'rose' },
  { id: 'history', label: 'Trade History', icon: Clock, count: 0, color: 'slate' }
];

export default function TradeWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'inbox';
  const setActiveTab = (tab) => setSearchParams({ tab });

  const [loading, setLoading] = useState(true);
  const [inboxData, setInboxData] = useState([]);
  const [outboxData, setOutboxData] = useState([]);
  const [creditData, setCreditData] = useState({ creditGiven: [], creditReceived: [] });
  const [historyData, setHistoryData] = useState([]);
  const [returnsData, setReturnsData] = useState([]);
  
  const [reviewTransaction, setReviewTransaction] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [inboxRes, outboxRes, creditRes, historyRes, returnsRes] = await Promise.all([
          API.get('/api/network/trade/inbox').catch(() => ({ data: { data: [] } })),
          API.get('/api/network/trade/outbox').catch(() => ({ data: { data: [] } })),
          API.get('/api/network/trade/credit').catch(() => ({ data: { data: { creditGiven: [], creditReceived: [] } } })),
          API.get('/api/network/trade/history').catch(() => ({ data: { data: [] } })),
          API.get('/api/network/trade/returns').catch(() => ({ data: { data: [] } }))
        ]);
        setInboxData(inboxRes.data?.data || []);
        setOutboxData(outboxRes.data?.data || []);
        setCreditData(creditRes.data?.data || { creditGiven: [], creditReceived: [] });
        setHistoryData(historyRes.data?.data || []);
        setReturnsData(returnsRes.data?.data || []);
      } catch (err) {
        toast.error('Failed to load workspace data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const pendingInboxCount = inboxData.filter(i => i.status === 'Pending').length;
  
  const updatedTabs = TABS.map(tab => ({
    ...tab,
    count: tab.id === 'inbox' ? pendingInboxCount : 0
  }));

  const getAIBannerMsg = () => {
    switch(activeTab) {
      case 'inbox': return pendingInboxCount > 0 ? `You have ${pendingInboxCount} invoices pending review.` : 'No pending invoices.';
      case 'outbox': return '2 invoices not yet viewed by buyer.';
      case 'credits': return '1 credit account near limit, 0 overdue.';
      default: return null;
    }
  };

  const renderHeaderAction = () => {
    switch (activeTab) {
      case 'outbox':
        return (
          <button onClick={() => setShowSendModal(true)} className={BUTTONS.primary}>
            <Plus size={16} /> <span className="hidden sm:inline">Send Invoice</span>
          </button>
        );
      case 'credits':
        return (
          <button onClick={() => { setSelectedPartner(null); setShowCreditModal(true); }} className={BUTTONS.primary}>
            <Plus size={16} /> <span className="hidden sm:inline">Set Credit Limit</span>
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className={LAYOUT.container}>
      <SectionHeader 
        title="Trade Workspace"
        subtitle="Invoices · Purchase Orders · Credits · Returns — all in one place"
        icon={Inbox}
        action={renderHeaderAction()}
      />

      <NetworkTabs 
        tabs={updatedTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {getAIBannerMsg() && <AIBanner message={getAIBannerMsg()} type={activeTab === 'returns' ? 'warning' : 'default'} />}

      {loading ? (
        <div className="space-y-4">
          <Skeleton height="150px" rounded="rounded-xl" />
          <Skeleton height="150px" rounded="rounded-xl" />
        </div>
      ) : (
        <div className="mt-6">
          {activeTab === 'inbox' && (
            <div className="space-y-4">
              {inboxData.length === 0 ? (
                <EmptyState 
                  icon={Inbox}
                  title="No purchase invoices"
                  description="When suppliers send you invoices, they will appear here for review."
                />
              ) : (
                inboxData.map(tx => (
                  <Card key={tx.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-100 bg-white shadow-sm hover:border-indigo-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-black text-xl shrink-0 border border-emerald-100">
                        {tx.sender?.business_name?.[0] || 'S'}
                      </div>
                      <div>
                        <p className={TYPOGRAPHY.cardTitle}>{tx.sender?.business_name || 'Supplier'}</p>
                        <p className="text-xs text-slate-500 font-medium">Inv: <span className="text-slate-700 font-bold">{tx.invoice_no}</span> • {new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">₹{Number(tx.total_amount).toLocaleString('en-IN')}</p>
                        <StatusBadge status={tx.status} className="mt-1 block w-fit ml-auto" />
                      </div>
                      {tx.status === 'Pending' && (
                        <button onClick={() => setReviewTransaction(tx)} className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[36px]">
                          Review
                        </button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'outbox' && (
            <div className="space-y-4">
              {outboxData.length === 0 ? (
                <EmptyState 
                  icon={Send}
                  title="No sent invoices"
                  description="Send invoices to your buyers seamlessly through the network."
                  actionLabel="Send Invoice"
                  onAction={() => setShowSendModal(true)}
                />
              ) : (
                outboxData.map(tx => (
                  <Card key={tx.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-100 bg-white shadow-sm hover:border-blue-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-xl shrink-0 border border-blue-100">
                        {tx.receiver?.business_name?.[0] || 'B'}
                      </div>
                      <div>
                        <p className={TYPOGRAPHY.cardTitle}>{tx.receiver?.business_name || 'Buyer'}</p>
                        <p className="text-xs text-slate-500 font-medium">Inv: <span className="text-slate-700 font-bold">{tx.invoice_no}</span> • {new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">₹{Number(tx.total_amount).toLocaleString('en-IN')}</p>
                        <StatusBadge status={tx.status} className="mt-1 block w-fit ml-auto" />
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'credits' && (
            <div className="space-y-6">
              <h3 className={TYPOGRAPHY.sectionTitle}>Credit Given</h3>
              {creditData.creditGiven.length === 0 ? (
                <EmptyState icon={CreditCard} title="No credit extended" description="You haven't extended credit to any buyers yet." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {creditData.creditGiven.map(c => (
                    <Card key={c.id} className="p-5 border-slate-100 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className={TYPOGRAPHY.cardTitle}>{c.receiver?.business_name}</p>
                          <StatusBadge status={c.status} className="mt-1 block" />
                        </div>
                        <button onClick={() => { setSelectedPartner({ name: c.receiver?.business_name }); setShowCreditModal(true); }} className="text-xs font-bold text-indigo-600 hover:underline">Edit</button>
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-500">Utilized: ₹{c.amount_utilized}</span>
                          <span className="text-slate-900">Limit: ₹{c.credit_limit}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${Number(c.amount_utilized) / Number(c.credit_limit) > 0.9 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(Number(c.amount_utilized) / Number(c.credit_limit)) * 100}%` }}></div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'returns' && (
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className={`${LAYOUT.card} h-[100px] animate-pulse bg-slate-50`} />
                ))
              ) : returnsData.length === 0 ? (
                <EmptyState icon={RotateCcw} title="No trade returns" description="There are no return requests to display." />
              ) : returnsData.map(r => (
                <Card key={r.id} className="p-5 border-slate-100 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={TYPOGRAPHY.cardTitle}>{r.partner}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Ref: <span className="font-bold text-slate-700">{r.invoiceRef}</span> • Reason: {r.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-rose-600">-₹{r.amount}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden overflow-x-auto shadow-sm">
              {historyData.length === 0 ? (
                <EmptyState icon={Clock} title="No trade history" description="Completed transactions will appear here." />
              ) : (
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase text-slate-500">Date</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase text-slate-500">Ref / Type</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase text-slate-500">Partner</th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyData.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-slate-600">{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-slate-800">{tx.invoice_no}</p>
                          <p className="text-[10px] font-semibold text-slate-400">{tx.sender_id === 1 /* mock current user id */ ? 'Sales' : 'Purchase'}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">
                          {tx.sender_id === 1 ? tx.receiver?.business_name : tx.sender?.business_name}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-black text-slate-900">₹{Number(tx.total_amount).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right"><StatusBadge status={tx.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {reviewTransaction && (
        <ProductReviewModal 
          isOpen={true} 
          onClose={() => setReviewTransaction(null)} 
          transaction={reviewTransaction} 
          onSuccess={() => {
            setReviewTransaction(null);
            // In a real app, refetch data here
          }} 
        />
      )}

      <SetCreditModal isOpen={showCreditModal} partner={selectedPartner} onClose={() => setShowCreditModal(false)} />
      <SendInvoiceModal isOpen={showSendModal} onClose={() => setShowSendModal(false)} />
    </div>
  );
}
