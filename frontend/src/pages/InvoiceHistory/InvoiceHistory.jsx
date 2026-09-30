import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Printer, Ban, MessageCircle, Plus, Edit,
  FileText, Download, RotateCcw, ChevronLeft, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../services/apiClient';
import InvoicePreviewModal from '../../components/billing/InvoicePreviewModal';
import InvoiceEditorModal from '../Billing/InvoiceEditorModal';
import SalesReturnModal from '../../components/billing/SalesReturnModal';
import Skeleton from '../../components/ui/Skeleton';
import logoImg from '../../assets/logo.svg';

const STATUS_TABS = ['All', 'Paid', 'Partial', 'Unpaid', 'Overdue', 'Cancelled'];

function getStatusConfig(status) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return { label: 'Paid', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' };
    case 'partial':
      return { label: 'Partial', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' };
    case 'overdue':
      return { label: 'Overdue', bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' };
    case 'cancelled':
      return { label: 'Cancelled', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' };
    case 'returned':
      return { label: 'Returned', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' };
    default:
      return { label: 'Unpaid', bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' };
  }
}

function resolveStatus(inv) {
  if (inv.payment_status === 'cancelled') return 'cancelled';
  if (inv.payment_status === 'returned') return 'returned';
  if (inv.payment_status === 'paid') return 'paid';
  if (inv.payment_status === 'partial') return 'partial';
  if (inv.payment_status !== 'paid') {
    const invDate = new Date(inv.date || inv.created_at);
    const daysDiff = (Date.now() - invDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) return 'overdue';
  }
  return inv.payment_status || 'unpaid';
}

function parseItems(rawItems) {
  if (!rawItems) return [];
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function InvoiceHistory() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({ totalBilled: 0, totalPaid: 0, pendingDue: 0 });

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [returnModalInvoice, setReturnModalInvoice] = useState(null);
  const [cancellingInvoice, setCancellingInvoice] = useState(null);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(null);

  const fetchInvoices = useCallback(async (targetPage = page, querySearch = search, tab = activeTab) => {
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit,
        search: querySearch.trim() || undefined,
        status: tab !== 'All' ? tab.toLowerCase() : undefined,
        paginated: 'true'
      };

      const res = await API.get('/sales', { params });
      const data = res.data;

      let list = [];
      if (data && Array.isArray(data.sales)) {
        list = data.sales;
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
        if (data.summary) {
          setSummary({
            totalBilled: Number(data.summary.totalBilled || 0),
            totalPaid: Number(data.summary.totalPaid || 0),
            pendingDue: Number(data.summary.pendingDue || 0)
          });
        }
      } else if (Array.isArray(data)) {
        list = data;
        setTotalCount(data.length);
        setTotalPages(Math.ceil(data.length / limit) || 1);
      }

      const enriched = list.map(inv => ({ ...inv, resolvedStatus: resolveStatus(inv) }));
      setInvoices(enriched);

      if (enriched.length > 0) {
        setSelectedInvoice(prev => {
          if (!prev) return enriched[0];
          const stillExists = enriched.find(i => i.id === prev.id);
          return stillExists || enriched[0];
        });
      } else {
        setSelectedInvoice(null);
      }
    } catch (err) {
      console.error("fetchInvoices error:", err);
      toast.error('Failed to fetch sales invoices');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, activeTab]);

  useEffect(() => {
    fetchInvoices(page, search, activeTab);
  }, [page, activeTab]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setPage(1);
    fetchInvoices(1, search, activeTab);
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSendWhatsApp = async (inv) => {
    const phone = inv.customers?.phone;
    if (!phone) return toast.error('Customer has no phone number on file');
    try {
      setSendingWhatsapp(inv.id);
      await API.post('/reminders/send-whatsapp', { saleId: inv.id });
      toast.success('WhatsApp receipt sent successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send WhatsApp bill');
    } finally {
      setSendingWhatsapp(null);
    }
  };

  const handleCancelInvoice = async (inv, e) => {
    e?.stopPropagation();
    if (inv.payment_status === 'cancelled') {
      return toast.error("This invoice has already been cancelled.");
    }

    const reason = window.prompt(
      `Cancel/Void Invoice #${inv.invoice_no || inv.id}?\n\nThis will restore all item quantities back to inventory and reverse customer debt. Please enter a cancellation reason:`,
      "Voided by merchant"
    );

    if (reason === null) return; // User cancelled prompt

    try {
      setCancellingInvoice(inv.id);
      await API.post(`/sales/${inv.id}/cancel`, { reason: reason || "Voided by merchant" });
      toast.success('Invoice cancelled and stock restored!');
      fetchInvoices(page, search, activeTab);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel invoice');
    } finally {
      setCancellingInvoice(null);
    }
  };

  const selectedItems = useMemo(() => {
    if (!selectedInvoice) return [];
    return parseItems(selectedInvoice.items);
  }, [selectedInvoice]);

  const selectedReturns = useMemo(() => {
    if (!selectedInvoice || !Array.isArray(selectedInvoice.returns)) return [];
    return selectedInvoice.returns;
  }, [selectedInvoice]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16 animate-fade-in-up">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-app-text tracking-tight flex items-center gap-2">
            <FileText size={22} className="text-primary" />
            Invoices & Sales History
          </h1>
          <p className="text-xs text-app-muted font-medium mt-1">
            Browse, search, edit, print, void, and process returns for all sales transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/billing')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} /> New POS Bill
          </button>
        </div>
      </div>

      {/* ─── Main Two-Column Layout ─── */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

        {/* ═══ LEFT PANEL: Invoice Table ═══ */}
        <div className="flex-1 min-w-0 bg-app-surface rounded-2xl border border-app-border shadow-2xs flex flex-col overflow-hidden">
          
          {/* Search + Filter Bar */}
          <div className="p-4 border-b border-app-border flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-app-subtle/30">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
              <input
                type="text"
                placeholder="Search invoice #, customer name, phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onBlur={() => { setPage(1); fetchInvoices(1, search, activeTab); }}
                className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-app-surface border border-app-border rounded-xl focus:outline-none focus:border-primary/50 text-app-text transition-all"
              />
            </form>

            {/* Status Filter Tabs */}
            <div className="flex items-center bg-app-subtle p-1 rounded-xl gap-0.5 shrink-0 overflow-x-auto max-w-full">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-app-surface text-app-text shadow-xs'
                      : 'text-app-muted hover:text-app-text'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-app-subtle/50 border-b border-app-border">
            {['Invoice #', 'Customer', 'Date', 'Amount', 'Status', 'Actions'].map(h => (
              <span key={h} className="text-[10px] font-bold text-app-muted uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {/* Invoice Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-app-border/40">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} height="56px" rounded="rounded-xl" />)}
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText size={40} className="text-app-muted/40 mb-3" />
                <p className="text-sm font-bold text-app-text">No invoices found</p>
                <p className="text-xs text-app-muted mt-1">Try adjusting your search query or status filter.</p>
              </div>
            ) : (
              invoices.map((inv) => {
                const statusCfg = getStatusConfig(inv.resolvedStatus);
                const isSelected = selectedInvoice?.id === inv.id;
                const isCancelled = inv.payment_status === 'cancelled';
                const itemsCount = parseItems(inv.items).length;

                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`grid md:grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-app-hover/50 cursor-pointer transition-all ${
                      isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                    } ${isCancelled ? 'opacity-70' : ''}`}
                  >
                    {/* Invoice # */}
                    <div>
                      <span className={`text-xs font-black font-mono flex items-center gap-1 ${isCancelled ? 'line-through text-app-muted' : 'text-primary'}`}>
                        #{inv.invoice_no || `INV-${inv.id.slice(0, 8)}`}
                      </span>
                      {inv.store_id && (
                        <span className="text-[9px] text-app-muted block">Store Bill</span>
                      )}
                    </div>

                    {/* Customer */}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-app-text truncate">{inv.customers?.name || 'Walk-in Customer'}</p>
                      {inv.customers?.phone && (
                        <p className="text-[10px] text-app-muted font-medium mt-0.5">{inv.customers.phone}</p>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <p className="text-xs font-semibold text-app-text">
                        {new Date(inv.date || inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-app-muted">
                        {new Date(inv.date || inv.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Amount */}
                    <div>
                      <p className={`text-xs font-extrabold font-mono ${inv.resolvedStatus === 'overdue' ? 'text-rose-600' : 'text-app-text'}`}>
                        ₹{Number(inv.total || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-app-muted font-medium">
                        {itemsCount} item{itemsCount === 1 ? '' : 's'} • {(inv.payment_method || 'CASH').toUpperCase()}
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setPreviewInvoice(inv)}
                        title="Print / PDF Invoice"
                        className="p-1.5 rounded-lg text-app-muted hover:text-app-text hover:bg-app-hover transition-all cursor-pointer"
                      >
                        <Printer size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingInvoice(inv)}
                        disabled={isCancelled}
                        title={isCancelled ? "Cannot edit cancelled invoice" : "Edit Invoice"}
                        className="p-1.5 rounded-lg text-app-muted hover:text-app-text hover:bg-app-hover transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCancelInvoice(inv, e)}
                        disabled={isCancelled || cancellingInvoice === inv.id}
                        title={isCancelled ? "Already cancelled" : "Cancel / Void Invoice"}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Ban size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Table Pagination Footer */}
          <div className="p-3.5 border-t border-app-border flex items-center justify-between bg-app-subtle/30 text-xs">
            <span className="text-app-muted font-medium">
              Showing {invoices.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount} invoices
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1.5 rounded-lg border border-app-border bg-app-surface text-app-text font-bold text-xs hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="font-bold text-app-text px-2">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1.5 rounded-lg border border-app-border bg-app-surface text-app-text font-bold text-xs hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>

        </div>

        {/* ═══ RIGHT PANEL: Invoice Detail Preview ═══ */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-4">
          
          <div className="bg-app-surface rounded-2xl border border-app-border shadow-2xs overflow-hidden flex flex-col">
            {selectedInvoice ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-subtle/50">
                  <div>
                    <span className="text-[9px] font-bold text-app-muted uppercase tracking-widest">Selected Invoice</span>
                    <h2 className="text-sm font-black text-app-text font-mono mt-0.5">
                      #{selectedInvoice.invoice_no || `INV-${selectedInvoice.id.slice(0, 8)}`}
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold text-app-muted bg-app-surface border border-app-border px-2.5 py-1 rounded-lg">
                    {new Date(selectedInvoice.date || selectedInvoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>

                {/* Cancelled Notice Banner */}
                {selectedInvoice.payment_status === 'cancelled' && (
                  <div className="bg-rose-500/10 border-b border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400">
                    <div className="flex items-center gap-1.5 font-bold">
                      <XCircle size={15} /> Invoice Voided / Cancelled
                    </div>
                    <p className="text-[11px] mt-1 text-app-text-secondary">
                      Reason: {selectedInvoice.cancellation?.reason || "Merchant Voided"}
                    </p>
                  </div>
                )}

                {/* Mini Receipt Preview */}
                <div className="p-4">
                  <div className="bg-app-subtle/50 rounded-xl p-3.5 border border-dashed border-app-border font-mono text-xs">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-app-border">
                      <img src={logoImg} alt="Logo" className="w-4 h-4 object-contain" />
                      <span className="text-[10px] font-black text-app-text tracking-wider uppercase">Tax Invoice Breakdown</span>
                    </div>

                    {/* Customer Info */}
                    <div className="flex justify-between text-[10px] text-app-muted font-medium mb-3">
                      <span>Customer: <strong className="text-app-text font-bold">{selectedInvoice.customers?.name || 'Walk-in'}</strong></span>
                      <span>{selectedInvoice.customers?.phone || ''}</span>
                    </div>

                    {/* Line Items */}
                    <div className="border-t border-app-border pt-2.5 mb-2.5 space-y-1.5">
                      <div className="flex justify-between text-[9px] font-black text-app-muted uppercase tracking-wider">
                        <span>Item</span>
                        <span className="text-right">Qty × Rate = Amt</span>
                      </div>
                      {selectedItems.map((item, i) => {
                        const price = Number(item.price || item.unit_price || 0);
                        const qty = Number(item.quantity || 1);
                        const lineAmt = price * qty;
                        return (
                          <div key={i} className="flex justify-between text-[11px] text-app-text font-medium">
                            <span className="truncate max-w-[130px]">{item.product_name || item.name || `Item ${i + 1}`}</span>
                            <span className="text-right font-bold">
                              {qty} × ₹{price.toFixed(0)} = ₹{lineAmt.toFixed(0)}
                            </span>
                          </div>
                        );
                      })}
                      {selectedItems.length === 0 && (
                        <p className="text-[10px] text-app-muted italic py-1">No items details available.</p>
                      )}
                    </div>

                    {/* Totals Summary */}
                    <div className="border-t border-app-border pt-2 space-y-1 text-[11px]">
                      <div className="flex justify-between text-app-muted">
                        <span>Subtotal:</span>
                        <span>₹{Number(selectedInvoice.subtotal || selectedInvoice.total || 0).toFixed(2)}</span>
                      </div>
                      {Number(selectedInvoice.tax_amount || 0) > 0 && (
                        <div className="flex justify-between text-app-muted">
                          <span>Tax / GST:</span>
                          <span>₹{Number(selectedInvoice.tax_amount).toFixed(2)}</span>
                        </div>
                      )}
                      {Number(selectedInvoice.discount_percent || 0) > 0 && (
                        <div className="flex justify-between text-rose-500 font-bold">
                          <span>Discount ({selectedInvoice.discount_percent}%):</span>
                          <span>-₹{((Number(selectedInvoice.subtotal || selectedInvoice.total || 0) * Number(selectedInvoice.discount_percent)) / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-xs font-black text-app-text pt-1.5 border-t border-app-border">
                        <span>Total:</span>
                        <span className="text-sm font-black">₹{Number(selectedInvoice.total || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-app-muted pt-0.5">
                        <span>Paid: ₹{Number(selectedInvoice.amount_paid || 0).toLocaleString('en-IN')}</span>
                        {Number(selectedInvoice.total || 0) > Number(selectedInvoice.amount_paid || 0) && selectedInvoice.payment_status !== 'cancelled' ? (
                          <span className="text-rose-600 font-bold">
                            Due: ₹{(Number(selectedInvoice.total || 0) - Number(selectedInvoice.amount_paid || 0)).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Settled</span>
                        )}
                      </div>
                    </div>

                    {/* Returns History if any */}
                    {selectedReturns.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-dashed border-app-border">
                        <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest block mb-1">
                          Returns Processed ({selectedReturns.length})
                        </span>
                        {selectedReturns.map((ret, rIdx) => (
                          <div key={rIdx} className="text-[10px] text-app-muted flex justify-between py-0.5">
                            <span>{ret.return_id} ({ret.items?.length || 0} items)</span>
                            <span className="text-purple-600 dark:text-purple-400 font-bold">-₹{Number(ret.total_refund_amount || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewInvoice(selectedInvoice)}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-app-text bg-app-subtle border border-app-border rounded-xl hover:bg-app-hover transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    Print / PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(selectedInvoice)}
                    disabled={!selectedInvoice.customers?.phone || sendingWhatsapp === selectedInvoice.id}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <MessageCircle size={13} />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnModalInvoice(selectedInvoice)}
                    disabled={selectedInvoice.payment_status === 'cancelled'}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title={selectedInvoice.payment_status === 'cancelled' ? "Cannot return cancelled sale" : "Process Sales Return"}
                  >
                    <RotateCcw size={13} />
                    Return
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 flex flex-col items-center text-center text-app-muted">
                <FileText size={32} className="text-app-muted/30 mb-2" />
                <p className="text-xs font-semibold">Select an invoice from the table to preview details</p>
              </div>
            )}
          </div>

          {/* Financial Overview Stats */}
          <div className="bg-app-surface rounded-2xl border border-app-border shadow-2xs p-4 space-y-3">
            <h3 className="text-[10px] font-bold text-app-muted uppercase tracking-wider">Store Sales Summary</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-app-muted font-medium">Total Billed:</span>
                <span className="font-extrabold font-mono text-app-text">₹{summary.totalBilled.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Total Collected:</span>
                <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400">₹{summary.totalPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-rose-600 dark:text-rose-400 font-medium">Pending Debt:</span>
                <span className="font-extrabold font-mono text-rose-600 dark:text-rose-400">₹{summary.pendingDue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onNewSale={() => navigate('/billing')}
        />
      )}

      {/* Invoice Editor Modal */}
      {editingInvoice && (
        <InvoiceEditorModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={() => fetchInvoices(page, search, activeTab)}
        />
      )}

      {/* Sales Return Modal */}
      {returnModalInvoice && (
        <SalesReturnModal
          invoice={returnModalInvoice}
          sale={returnModalInvoice}
          isOpen={!!returnModalInvoice}
          onClose={() => setReturnModalInvoice(null)}
          onReturnSuccess={() => {
            setReturnModalInvoice(null);
            fetchInvoices(page, search, activeTab);
          }}
        />
      )}

    </div>
  );
}
