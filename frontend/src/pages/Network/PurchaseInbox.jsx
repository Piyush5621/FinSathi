import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import {
  Inbox, Package, CheckCircle2, XCircle, Clock, Eye, Download,
  ChevronRight, Filter, ArrowRight, Sparkles
} from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';
import ProductReviewModal from './ProductReviewModal';

const STATUS_TABS = ['All', 'Pending', 'Viewed', 'Accepted', 'Imported', 'Rejected'];

const statusStyles = {
  Pending: 'text-amber-600 bg-amber-50 border-amber-200',
  Viewed: 'text-blue-600 bg-blue-50 border-blue-200',
  Accepted: 'text-sky-600 bg-sky-50 border-sky-200',
  Imported: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  Rejected: 'text-rose-600 bg-rose-50 border-rose-200',
};

export default function PurchaseInbox() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [reviewTransaction, setReviewTransaction] = useState(null);

  useEffect(() => { fetchInbox(); }, []);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await API.get('/trade/inbox');
      setTransactions(res.data?.data || []);
    } catch {
      toast.error('Failed to load purchase inbox');
    } finally {
      setLoading(false);
    }
  };

  const filtered = activeTab === 'All'
    ? transactions
    : transactions.filter(t => t.status === activeTab);

  const handleImportDone = () => {
    setReviewTransaction(null);
    fetchInbox();
    toast.success('🎉 Products imported into your inventory!', { duration: 4000 });
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Inbox size={22} className="text-emerald-600" />
            Purchase Inbox
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Review supplier invoices and import products into your inventory automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {transactions.filter(t => t.status === 'Pending').length > 0 && (
            <span className="px-3 py-1 text-xs font-bold text-white bg-amber-500 rounded-full">
              {transactions.filter(t => t.status === 'Pending').length} Pending
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
              activeTab === tab
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {tab}
            {tab !== 'All' && (
              <span className="ml-1 opacity-70">
                ({transactions.filter(t => t.status === tab).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} height="120px" rounded="rounded-[20px]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center rounded-[24px] border-slate-100 bg-white shadow-sm">
          <Inbox size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold text-sm">No invoices in {activeTab === 'All' ? 'inbox' : activeTab}</p>
          <p className="text-slate-300 text-xs mt-1">Invoices sent by your connected suppliers will appear here</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(tx => (
            <Card key={tx.id} className="p-5 bg-white border-slate-100 rounded-[20px] shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Supplier Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {(tx.sender?.business_name || '?')[0].toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{tx.sender?.business_name || 'Unknown Supplier'}</p>
                      <span className={`text-[9px] font-black border rounded-full px-2 py-0.5 ${statusStyles[tx.status] || 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Invoice #{tx.invoice_no} · {new Date(tx.invoice_date || tx.created_at).toLocaleDateString('en-IN')}
                    </p>
                    {tx.notes && (
                      <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-1">"{tx.notes}"</p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-slate-900">₹{Number(tx.total_amount || 0).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    GST: ₹{Number(tx.tax_amount || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                {(tx.status === 'Pending' || tx.status === 'Viewed' || tx.status === 'Accepted') && (
                  <Button
                    onClick={() => setReviewTransaction(tx)}
                    className="flex items-center gap-2 text-xs font-bold bg-indigo-600 text-white border-none hover:bg-indigo-700 py-2 px-4"
                  >
                    <Sparkles size={13} />
                    Review & Import
                  </Button>
                )}
                {tx.status === 'Imported' && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                    <CheckCircle2 size={14} className="text-indigo-500" />
                    Already imported to inventory
                  </div>
                )}
                {tx.status === 'Rejected' && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
                    <XCircle size={14} />
                    Invoice was rejected
                  </div>
                )}
                <div className="ml-auto text-[10px] text-slate-400 font-semibold">
                  {new Date(tx.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Product Review Modal */}
      {reviewTransaction && (
        <ProductReviewModal
          transaction={reviewTransaction}
          onClose={() => setReviewTransaction(null)}
          onImportDone={handleImportDone}
        />
      )}
    </div>
  );
}
