import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Printer, Trash2, MessageCircle, Plus, Edit,
  FileText, Download, Mail, Clock, ChevronRight, Filter, RotateCcw,
  Globe, Share2, Building2, Send, Sparkles, Check, X, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../services/apiClient';
import InvoicePreviewModal from '../../components/billing/InvoicePreviewModal';
import InvoiceEditorModal from '../Billing/InvoiceEditorModal';
import SalesReturnModal from '../../components/billing/SalesReturnModal';
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
  const [returnModalInvoice, setReturnModalInvoice] = useState(null);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(null);

  // Business Network Send Modal State
  const [networkModalInvoice, setNetworkModalInvoice] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [selectedReceiverId, setSelectedReceiverId] = useState('');
  const [networkNotes, setNetworkNotes] = useState('');
  const [sendingNetwork, setSendingNetwork] = useState(false);

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
    if (!window.confirm('Delete this invoice? Stock will be restored.')) return;
    try {
      await API.delete(`/sales/${invoiceId}`);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete invoice');
    }
  };

  // Open Network Send Modal
  const handleOpenSendNetwork = async (inv, e) => {
    if (e) e.stopPropagation();
    setNetworkModalInvoice(inv);
    setSelectedReceiverId('');
    setNetworkNotes('');
    setLoadingConnections(true);
    try {
      const res = await API.get('/network/connections');
      const conns = res.data?.data || [];
      const accepted = conns.filter(c => c.status === 'accepted');
      setConnections(accepted);

      // Auto-select if customer name matches connected partner
      if (inv.customers?.name && accepted.length > 0) {
        const match = accepted.find(c => {
          const pName = (c.partner?.business_name || c.receiver?.business_name || c.requester?.business_name || '').toLowerCase();
          return pName.includes(inv.customers.name.toLowerCase()) || inv.customers.name.toLowerCase().includes(pName);
        });
        if (match) {
          const partnerId = match.partner_id || (match.requester_id === inv.user_id ? match.receiver_id : match.requester_id);
          setSelectedReceiverId(partnerId || match.receiver_id || match.requester_id);
        } else if (accepted.length === 1) {
          const pId = accepted[0].partner_id || accepted[0].receiver_id || accepted[0].requester_id;
          setSelectedReceiverId(pId);
        }
      } else if (accepted.length === 1) {
        const pId = accepted[0].partner_id || accepted[0].receiver_id || accepted[0].requester_id;
        setSelectedReceiverId(pId);
      }
    } catch {
      toast.error('Failed to load connected business partners');
    } finally {
      setLoadingConnections(false);
    }
  };

  // Submit Send to Network
  const handleSendToNetwork = async (e) => {
    e.preventDefault();
    if (!selectedReceiverId) {
      return toast.error('Please select a connected business partner');
    }
    if (!networkModalInvoice) return;

    setSendingNetwork(true);
    try {
      const res = await API.post('/network/trade/send-sale', {
        sale_id: networkModalInvoice.id,
        receiver_id: selectedReceiverId,
        notes: networkNotes
      });

      const partner = connections.find(c => (c.partner_id || c.receiver_id || c.requester_id) === selectedReceiverId);
      const partnerName = partner?.partner?.business_name || partner?.receiver?.business_name || partner?.requester?.business_name || 'Partner';

      toast.success(`🎉 Invoice #${networkModalInvoice.invoice_no || networkModalInvoice.id} sent to ${partnerName}!`, { duration: 5000 });
      setNetworkModalInvoice(null);
    } catch (err) {
      toast.error(err.response?.data?.summary || err.response?.data?.message || err.response?.data?.error || 'Failed to send invoice via Business Network');
    } finally {
      setSendingNetwork(false);
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
    paid: invoices.filter(i => i.resolvedStatus === 'paid').length,
    unpaid: invoices.filter(i => i.resolvedStatus === 'unpaid').length,
    overdue: invoices.filter(i => i.resolvedStatus === 'overdue').length,
  }), [invoices]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText size={22} className="text-indigo-600" />
            Invoice History & Ledger
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Track, export, return, and transmit sales invoices across all branches & B2B network.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/billing')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus size={14} /> New POS Bill
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
                      {inv.payment_method && (
                        <p className="text-[9px] text-slate-400 uppercase font-semibold mt-0.5">{inv.payment_method}</p>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenSendNetwork(inv)}
                        title="Send to Business Network Partner"
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all cursor-pointer"
                      >
                        <Globe size={14} />
                      </button>
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        title="Download / View PDF"
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => setEditingInvoice(inv)}
                        title="Edit Invoice"
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteInvoice(inv.id, e)}
                        title="Delete Invoice"
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* ═══ RIGHT PANEL: Invoice Detail Preview ═══ */}
        <div className="w-full lg:w-[360px] shrink-0 space-y-4">
          
          <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            {selectedInvoice ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selected Invoice</span>
                    <h2 className="text-sm font-black text-slate-900 mt-0.5">
                      #{(selectedInvoice.invoice_no || `FS-${selectedInvoice.id}`).replace(/^FS-/, 'INV-')}
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                    {new Date(selectedInvoice.date || selectedInvoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>

                {/* Mini Receipt Preview */}
                <div className="p-4">
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-dashed border-slate-200 font-mono">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                      <img src={logoImg} alt="Logo" className="w-4 h-4 object-contain" />
                      <span className="text-[10px] font-black text-slate-800 tracking-wider">OFFICIAL TAX INVOICE</span>
                    </div>

                    {/* Bill info */}
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold mb-3">
                      <span>Bill To: <span className="text-slate-700 font-bold">{selectedInvoice.customers?.name || '—'}</span></span>
                      <div className="text-right">
                        <div>Date: {new Date(selectedInvoice.date || selectedInvoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </div>
                    </div>

                    {/* Items list */}
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
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOpenSendNetwork(selectedInvoice)}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all cursor-pointer"
                    title="Transmit to Connected Business Buyer"
                  >
                    <Globe size={13} />
                    Send to Network
                  </button>
                  <button
                    onClick={() => setPreviewInvoice(selectedInvoice)}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    PDF
                  </button>
                  <button
                    onClick={() => handleSendWhatsApp(selectedInvoice)}
                    disabled={!selectedInvoice.customers?.phone}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <MessageCircle size={13} />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setReturnModalInvoice(selectedInvoice)}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all cursor-pointer"
                    title="Process Sales Return"
                  >
                    <RotateCcw size={13} />
                    Return
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

      {/* ─── MODALS ─── */}

      {/* Send to Business Network Partner Modal */}
      {networkModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Send to Business Network</h3>
                  <p className="text-xs text-slate-500 font-medium">Transmit existing invoice directly to buyer's Trade Inbox</p>
                </div>
              </div>
              <button
                onClick={() => setNetworkModalInvoice(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSendToNetwork} className="p-6 space-y-5">
              {/* Invoice Summary Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Invoice Number:</span>
                  <span className="font-mono font-black text-indigo-600">
                    #{(networkModalInvoice.invoice_no || `FS-${networkModalInvoice.id}`).replace(/^FS-/, 'INV-')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Customer / Billed To:</span>
                  <span className="font-bold text-slate-800">{networkModalInvoice.customers?.name || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Invoice Date:</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(networkModalInvoice.date || networkModalInvoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Total Invoice Amount:</span>
                  <span className="text-sm font-black text-slate-900">
                    ₹{Number(networkModalInvoice.total || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Connected Buyer Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Select Connected Business Partner *</span>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    {connections.length} connected partners
                  </span>
                </label>
                {loadingConnections ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-600" /> Loading connected partners...
                  </div>
                ) : connections.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-2">
                    <p className="font-bold">No accepted Business Network connections found.</p>
                    <p className="text-[11px] text-amber-700">
                      Connect with buyers first in <span className="font-bold">Business Network → Partners</span> to transmit digital invoices.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedReceiverId}
                    onChange={e => setSelectedReceiverId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                  >
                    <option value="">-- Choose connected partner --</option>
                    {connections.map(c => {
                      const partner = c.partner || (c.requester_id === networkModalInvoice.user_id ? c.receiver : c.requester) || c.receiver || c.requester;
                      const partnerId = c.partner_id || (c.requester_id === networkModalInvoice.user_id ? c.receiver_id : c.requester_id) || c.receiver_id || c.requester_id;
                      return (
                        <option key={c.id} value={partnerId}>
                          {partner?.business_name || 'Business Partner'} {partner?.city ? `(${partner.city})` : ''} • {c.connection_type || 'Partner'}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Delivery / Dispatch Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dispatch Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched via APMC tempo #44, driver contact: 98111..."
                  value={networkNotes}
                  onChange={e => setNetworkNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 text-slate-800"
                />
              </div>

              {/* Footer CTA */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setNetworkModalInvoice(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingNetwork || connections.length === 0 || !selectedReceiverId}
                  className="flex-2 flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {sendingNetwork ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Transmitting Invoice...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Send Existing Invoice
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

      {/* Invoice Editor Modal */}
      {editingInvoice && (
        <InvoiceEditorModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={fetchInvoices}
        />
      )}

      {/* Sales Return Modal */}
      {returnModalInvoice && (
        <SalesReturnModal
          sale={returnModalInvoice}
          isOpen={!!returnModalInvoice}
          onClose={() => setReturnModalInvoice(null)}
          onReturnSuccess={() => {
            setReturnModalInvoice(null);
            fetchInvoices();
          }}
        />
      )}

    </div>
  );
}
