import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Printer, Trash2, MessageCircle, Plus, Edit,
  FileText, Download, Mail, Clock, ChevronRight, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../services/apiClient';
import InvoicePreviewModal from '../../components/billing/InvoicePreviewModal';
import InvoiceEditorModal from '../Billing/InvoiceEditorModal';
import Skeleton from '../../components/ui/Skeleton';
import logoImg from '../../assets/logo.svg';

const STATUS_TABS = ['All', 'Paid', 'Unpaid', 'Overdue'];

function getStatusConfig(status) {
  switch (status) {
    case 'paid':
      return { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    case 'partial':
      return { label: 'Partial', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
    case 'overdue':
      return { label: 'Overdue', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
    default:
      return { label: 'Unpaid', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' };
  }
}

function isOverdue(inv) {
  if (inv.payment_status === 'paid') return false;
  const invDate = new Date(inv.date || inv.created_at);
  const daysDiff = (Date.now() - invDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff > 30;
}

function resolveStatus(inv) {
  if (inv.payment_status === 'paid') return 'paid';
  if (inv.payment_status === 'partial') return 'partial';
  if (isOverdue(inv)) return 'overdue';
  return 'unpaid';
}

export default function InvoiceHistory() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(null);

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/sales');
      const enriched = (data || []).map(inv => ({ ...inv, resolvedStatus: resolveStatus(inv) }));
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
    } catch {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async (inv) => {
    if (!inv.customers?.phone) return toast.error('Customer has no phone number');
    try {
      setSendingWhatsapp(inv.id);
      await API.post('/reminders/send-whatsapp', { saleId: inv.id });
      toast.success('WhatsApp reminder queued!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send WhatsApp');
    } finally {
      setSendingWhatsapp(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this invoice? Inventory stock will be restored.')) return;
    try {
      await API.delete(`/sales/${invoiceId}`);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete invoice');
    }
  };

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (search.trim()) {
      list = list.filter(inv =>
        inv.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
        inv.customers?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (activeTab !== 'All') {
      list = list.filter(inv => inv.resolvedStatus === activeTab.toLowerCase());
    }
    return list;
  }, [invoices, search, activeTab]);

  const stats = useMemo(() => ({
    total: invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0),
    paid: invoices.filter(inv => inv.resolvedStatus === 'paid').length,
    unpaid: invoices.filter(inv => inv.resolvedStatus === 'unpaid').length,
    overdue: invoices.filter(inv => inv.resolvedStatus === 'overdue').length,
  }), [invoices]);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Manage and track your billing operations.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats summary pills */}
          <div className="hidden sm:flex items-center gap-2">
            <StatPill label="Total" value={`₹${stats.total.toLocaleString('en-IN')}`} color="text-slate-700" />
            <StatPill label="Paid" value={stats.paid} color="text-emerald-600" />
            <StatPill label="Unpaid" value={stats.unpaid} color="text-amber-600" />
            {stats.overdue > 0 && <StatPill label="Overdue" value={stats.overdue} color="text-red-600" />}
          </div>
          <button
            onClick={() => navigate('/billing')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm shadow-indigo-600/25 cursor-pointer"
          >
            <Plus size={16} />
            New Invoice
          </button>
        </div>
      </div>

      {/* ─── Main Two-Column Layout ─── */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

        {/* ═══ LEFT PANEL: Invoice Table ═══ */}
        <div className="flex-1 min-w-0 bg-white rounded-[20px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          
          {/* Search + Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice # or customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 placeholder:text-slate-400 text-slate-800 transition-all"
              />
            </div>
            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-0.5 shrink-0">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab}
                  {tab !== 'All' && (
                    <span className={`ml-1.5 text-[9px] font-black px-1 py-0.5 rounded-md ${
                      activeTab === tab ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {tab === 'Paid' ? stats.paid : tab === 'Unpaid' ? stats.unpaid : stats.overdue}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50/60 border-b border-slate-100">
            {['Invoice #', 'Customer', 'Date', 'Amount', 'Status', 'Actions'].map(h => (
              <span key={h} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
            ))}
          </div>

          {/* Invoice Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} height="56px" rounded="rounded-xl" />)}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText size={36} className="text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-400">No invoices found</p>
                <p className="text-xs text-slate-300 mt-1">Try a different search or filter</p>
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const statusCfg = getStatusConfig(inv.resolvedStatus);
                const isSelected = selectedInvoice?.id === inv.id;
                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`grid md:grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-slate-50/60 cursor-pointer transition-all ${
                      isSelected ? 'bg-indigo-50/40 border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent'
                    }`}
                  >
                    {/* Invoice # */}
                    <div>
                      <span className="text-xs font-black text-indigo-600 font-mono hover:text-indigo-800 flex items-center gap-1">
                        #{(inv.invoice_no || `FS-${inv.id}`).replace(/^FS-/, 'INV-')}
                      </span>
                    </div>

                    {/* Customer */}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{inv.customers?.name || 'Unknown Customer'}</p>
                      {inv.customers?.phone && (
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{inv.customers.phone}</p>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <p className="text-xs font-semibold text-slate-600">
                        {new Date(inv.date || inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Amount */}
                    <div>
                      <p className={`text-xs font-extrabold ${inv.resolvedStatus === 'overdue' ? 'text-red-600' : 'text-slate-800'}`}>
                        ₹{Number(inv.total || 0).toLocaleString('en-IN')}
                      </p>
                      {inv.resolvedStatus === 'partial' && (
                        <p className="text-[9px] text-amber-600 font-bold mt-0.5">
                          Paid: ₹{Number(inv.amount_paid || 0).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {inv.payment_status !== 'paid' && (
                        <button
                          onClick={() => handleSendWhatsApp(inv)}
                          disabled={sendingWhatsapp === inv.id}
                          className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                          title="WhatsApp Reminder"
                        >
                          <MessageCircle size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingInvoice(inv)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                        title="Edit Invoice"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                        title="Print / Preview"
                      >
                        <Printer size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteInvoice(inv.id, e)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {filteredInvoices.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
              <span className="text-[10px] font-semibold text-slate-400">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </span>
              <span className="text-[10px] font-extrabold text-slate-700">
                Total: ₹{filteredInvoices.reduce((s, inv) => s + Number(inv.total || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div className="w-full lg:w-[300px] shrink-0 flex flex-col gap-4">

          {/* Latest Generated Preview */}
          <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Latest Generated</h3>
            </div>

            {selectedInvoice ? (
              <>
                {/* Mini Invoice Card */}
                <div className="p-4 flex-1">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[11px]">
                    {/* Mini header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center overflow-hidden">
                          <img src={logoImg} alt="FS" className="w-full h-full object-contain p-0.5" />
                        </div>
                        <span className="text-[10px] font-black text-slate-800">
                          {selectedInvoice.customers?.name || 'Customer'}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-500 font-mono">
                        #{(selectedInvoice.invoice_no || `FS-${selectedInvoice.id}`).replace(/^FS-/, 'INV-')}
                      </span>
                    </div>

                    {/* Bill info */}
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold mb-3">
                      <span>Bill To: <span className="text-slate-700 font-bold">{selectedInvoice.customers?.name || '—'}</span></span>
                      <div className="text-right">
                        <div>Date: {new Date(selectedInvoice.date || selectedInvoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </div>
                    </div>

                    {/* Items list (truncated) */}
                    <div className="border-t border-slate-200 pt-3 mb-3">
                      <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        <span>Item Description</span>
                        <span>Total</span>
                      </div>
                      {(selectedInvoice.sale_items || []).slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between text-[9px] text-slate-700 font-semibold py-0.5">
                          <span className="truncate max-w-[120px]">{item.products?.name || item.product_name || `Item ${i + 1}`}</span>
                          <span className="font-bold">₹{Number(item.total || item.amount || 0).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      {(selectedInvoice.sale_items || []).length === 0 && (
                        <p className="text-[9px] text-slate-400 italic">No item detail available</p>
                      )}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center border-t border-slate-200 pt-2.5">
                      <span className="text-[10px] font-black text-slate-700">Total Amount</span>
                      <span className="text-sm font-black text-slate-900">₹{Number(selectedInvoice.total || 0).toLocaleString('en-IN')}</span>
                    </div>

                    {/* Status */}
                    <div className="mt-2.5 flex justify-between items-center">
                      {(() => {
                        const cfg = getStatusConfig(selectedInvoice.resolvedStatus);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black rounded-lg ${cfg.bg} ${cfg.text}`}>
                            <span className={`w-1 h-1 rounded-full ${cfg.dot}`} /> {cfg.label}
                          </span>
                        );
                      })()}
                      <span className="text-[8px] text-slate-400 font-semibold">
                        {selectedInvoice.payment_method?.toUpperCase() || 'CASH'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => setPreviewInvoice(selectedInvoice)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    PDF
                  </button>
                  <button
                    onClick={() => handleSendWhatsApp(selectedInvoice)}
                    disabled={!selectedInvoice.customers?.phone}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <MessageCircle size={13} />
                    WhatsApp
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 flex flex-col items-center text-center text-slate-400">
                <FileText size={28} className="text-slate-200 mb-2" />
                <p className="text-xs font-semibold">Select an invoice to preview</p>
              </div>
            )}
          </div>

          {/* Quick Create Invoice CTA */}
          <div
            onClick={() => navigate('/billing')}
            className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[20px] p-5 text-white cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20 transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-black tracking-tight">New Invoice</h3>
                <p className="text-[10px] text-indigo-200 mt-0.5 font-semibold">POS Billing Terminal</p>
              </div>
              <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all">
                <Plus size={16} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-200 group-hover:text-white transition-colors">
              Open Billing <ChevronRight size={14} />
            </div>
          </div>

          {/* Recent Stats */}
          <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-4">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Paid
                </span>
                <span className="text-xs font-black text-slate-800">{stats.paid}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" /> Unpaid
                </span>
                <span className="text-xs font-black text-slate-800">{stats.unpaid}</span>
              </div>
              {stats.overdue > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Overdue
                  </span>
                  <span className="text-xs font-black text-red-600">{stats.overdue}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Total Volume</span>
                <span className="text-sm font-black text-slate-900">₹{stats.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}
      {editingInvoice && (
        <InvoiceEditorModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={fetchInvoices}
        />
      )}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-xl">
      <span className="text-[9px] font-bold text-slate-400 uppercase">{label}</span>
      <span className={`text-xs font-black ${color}`}>{value}</span>
    </div>
  );
}
