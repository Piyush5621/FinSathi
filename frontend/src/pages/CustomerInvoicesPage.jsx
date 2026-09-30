import { useEffect, useState } from 'react';
import { supabase } from "../lib/supabaseClient";
import API from "../services/apiClient";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Edit3, Printer, Trash2, Mail, Phone, MapPin, 
  CreditCard, DollarSign, Receipt, Plus, Search, CheckCircle2, 
  Clock, AlertCircle, Sparkles, Building2, User, Info, ExternalLink
} from 'lucide-react';
import toast from "react-hot-toast";
import InvoicePreviewModal from "../components/billing/InvoicePreviewModal";
import InvoiceEditorModal from "../pages/Billing/InvoiceEditorModal";
import CustomerEditModal from "../components/CustomerEditModal";
import AddPaymentModal from "../components/AddPaymentModal";
import { Card } from "../components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export default function CustomerInvoicesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices"); 

  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      
      const { data: custData } = await API.get(`/customers/${id}`);
      setCustomer(custData);

      const { data: invData } = await API.get(`/sales?customer_id=${id}`);
      const salesList = Array.isArray(invData) ? invData : (invData?.sales || []);
      setInvoices(salesList);

      const { data: payData } = await API.get(`/payments/${id}`);
      setPayments(payData || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load customer records");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!window.confirm("Delete this customer? This will remove the profile record.")) return;
    try {
      await API.delete(`/customers/${id}`);
      toast.success("Customer removed successfully");
      navigate("/customers");
    } catch (err) {
      toast.error("Failed to delete customer");
    }
  };

  const handleModifyInvoice = async (invoiceId) => {
    try {
      const { data } = await API.get(`/sales/${invoiceId}`);
      setEditingInvoice(data);
    } catch (err) {
      toast.error("Failed to load invoice details");
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    const reason = window.prompt("Cancel/Void this invoice? Product stock will be restored and customer balance reversed. Enter cancellation reason:", "Voided from customer ledger");
    if (reason === null) return;
    try {
      await API.post(`/sales/${invoiceId}/cancel`, { reason: reason || "Voided from customer ledger" });
      toast.success("Invoice cancelled and inventory restored");
      fetchCustomerData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel invoice");
    }
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const duesBalance = Number(customer?.outstanding_balance || 0);
  const paidAtCounter = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0);
  const khataRepayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalReceived = paidAtCounter + khataRepayments;

  const filteredInvoices = invoices.filter((inv) => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || 
      (inv.invoice_no && inv.invoice_no.toLowerCase().includes(q)) ||
      (inv.id && inv.id.toString().toLowerCase().includes(q)) || 
      (inv.total != null && inv.total.toString().includes(q));
    const mFilter = filterStatus === 'all' || 
      (filterStatus === 'paid' && inv.payment_status === 'paid') || 
      (filterStatus === 'unpaid' && (inv.payment_status === 'unpaid' || inv.payment_status === 'partial'));
    return mSearch && mFilter;
  });

  if (loading && !customer) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] gap-3">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        <p className="text-xs font-medium text-app-muted">Loading customer records & ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Back link */}
      <div>
        <button 
          onClick={() => navigate("/customers")} 
          className="inline-flex items-center gap-2 text-app-muted hover:text-app-text font-semibold text-xs transition-colors bg-app-surface hover:bg-app-hover border border-app-border px-3.5 py-2 rounded-xl shadow-2xs cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Customer Ledger
        </button>
      </div>

      {/* Customer Profile Header Card */}
      {customer && (
        <div className="bg-app-surface border border-app-border rounded-2xl p-5 shadow-2xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-black text-primary uppercase shrink-0">
              {customer.name.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-app-text tracking-tight">{customer.name}</h1>
                <Badge variant="gray" className="font-mono text-[10px]">ID #{customer.id}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-app-muted mt-1.5 font-medium">
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-app-muted" />{customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} className="text-app-muted" />{customer.email}
                  </span>
                )}
                {customer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-app-muted" />{customer.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ledger Financial Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-app-border">
            <div className="flex flex-col items-start lg:items-end p-2 bg-app-surface-subtle border border-app-border rounded-xl">
              <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider block">Total Billed</span>
              <span className="text-sm font-extrabold font-mono text-app-text mt-0.5 block">₹{totalBilled.toLocaleString('en-IN')}</span>
              <span className="text-[9px] text-app-muted">All Sales Value</span>
            </div>
            <div className="flex flex-col items-start lg:items-end p-2 bg-app-surface-subtle border border-app-border rounded-xl">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Paid at Counter</span>
              <span className="text-sm font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-0.5 block">₹{paidAtCounter.toLocaleString('en-IN')}</span>
              <span className="text-[9px] text-app-muted">POS Upfront</span>
            </div>
            <div className="flex flex-col items-start lg:items-end p-2 bg-app-surface-subtle border border-app-border rounded-xl">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Khata Repaid</span>
              <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">₹{khataRepayments.toLocaleString('en-IN')}</span>
              <span className="text-[9px] text-app-muted">Debt Cleared</span>
            </div>
            <div className="flex flex-col items-start lg:items-end p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">Total Received</span>
              <span className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block">₹{totalReceived.toLocaleString('en-IN')}</span>
              <span className="text-[9px] text-emerald-600/80">Counter + Repaid</span>
            </div>
            <div className="flex flex-col items-start lg:items-end p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl col-span-2 sm:col-span-4 lg:col-span-1">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Outstanding Due</span>
              <span className={`text-base font-extrabold font-mono mt-0.5 block ${duesBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-app-muted'}`}>
                ₹{duesBalance.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-rose-500 font-medium">Pending Debt</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-app-border">
            <Button 
              onClick={() => setShowPaymentModal(true)} 
              icon={<Plus size={15} />} 
              className="flex-1 lg:flex-none shadow-2xs font-semibold"
            >
              Record Payment
            </Button>
            <div className="flex gap-2 flex-1 lg:flex-none">
              <Button 
                variant="outline" 
                className="flex-1 py-1.5 text-xs font-medium" 
                onClick={() => setShowEditProfile(true)}
              >
                <Edit3 size={13} className="mr-1" /> Edit Profile
              </Button>
              <Button 
                variant="danger" 
                className="py-1.5 px-3 text-xs" 
                onClick={handleDeleteCustomer}
                title="Delete customer profile"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Understanding & Reconciliation Guide Banner */}
      <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <Info size={16} />
          </div>
          <div>
            <p className="font-bold text-app-text flex items-center gap-2">
              <span>Financial Ledger Reconciliation (पारदर्शी हिसाब-किताब)</span>
              <Badge variant="blue" className="text-[10px] font-normal">Customer Khata</Badge>
            </p>
            <p className="text-app-muted text-xs mt-0.5">
              <strong className="text-app-text">Total Billed</strong> (₹{totalBilled.toLocaleString('en-IN')}) − <strong className="text-emerald-600 dark:text-emerald-400">Total Received</strong> (₹{totalReceived.toLocaleString('en-IN')} [₹{paidAtCounter.toLocaleString('en-IN')} upfront at counter + ₹{khataRepayments.toLocaleString('en-IN')} repaid]) = <strong className="text-rose-600 dark:text-rose-400">₹{duesBalance.toLocaleString('en-IN')} Net Outstanding Due</strong>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/invoices')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-app-surface hover:bg-app-hover border border-app-border text-xs font-semibold text-app-text transition-colors cursor-pointer"
            title="Browse all bills in Invoices History"
          >
            <Receipt size={13} className="text-primary" />
            <span>Invoices History</span>
            <ExternalLink size={12} className="text-app-muted" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-app-border pb-px">
        <button 
          onClick={() => setActiveTab("invoices")} 
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "invoices" 
              ? "border-primary text-primary" 
              : "border-transparent text-app-muted hover:text-app-text"
          }`}
        >
          <CreditCard size={15} /> Invoices & Orders ({invoices.length})
        </button>
        <button 
          onClick={() => setActiveTab("payments")} 
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "payments" 
              ? "border-primary text-primary" 
              : "border-transparent text-app-muted hover:text-app-text"
          }`}
        >
          <DollarSign size={15} /> Payment History ({payments.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-app-surface border border-app-border rounded-2xl overflow-hidden shadow-2xs">
        {activeTab === "invoices" && (
          <div>
            <div className="p-4 border-b border-app-border flex flex-col sm:flex-row justify-between items-center gap-3 bg-app-subtle/30">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-primary" />
                <h3 className="font-bold text-app-text text-sm">Issued Sales Invoices</h3>
                <span className="text-xs text-app-muted font-mono">({filteredInvoices.length})</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)} 
                  className="bg-app-surface border border-app-border rounded-xl px-3 py-1.5 text-xs font-semibold text-app-text outline-none focus:border-primary/50 transition-colors shadow-2xs"
                >
                  <option value="all">All Invoices</option>
                  <option value="paid">Settled / Paid</option>
                  <option value="unpaid">Pending / Partial</option>
                </select>
                <div className="relative flex-1 sm:w-52">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-app-muted" />
                  <input 
                    placeholder="Search invoice # or total..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    className="w-full pl-8 pr-3 py-1.5 bg-app-surface border border-app-border rounded-xl text-xs text-app-text outline-none focus:border-primary/50 shadow-2xs" 
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>Invoice #</Th>
                    <Th>Issue Date</Th>
                    <Th className="text-right">Billed Total</Th>
                    <Th className="text-right">Paid Amount</Th>
                    <Th className="text-right">Balance Due</Th>
                    <Th className="text-center">Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {filteredInvoices.length === 0 ? (
                    <Tr>
                      <Td colSpan="7" className="text-center py-12 text-app-muted text-xs">
                        No invoices found matching the current search criteria.
                      </Td>
                    </Tr>
                  ) : filteredInvoices.map(inv => {
                    const paid = inv.amount_paid || 0;
                    const balance = (inv.total || 0) - paid;
                    return (
                      <Tr key={inv.id} className="border-b border-app-border/40 hover:bg-app-hover/50 transition-colors">
                        <Td className="font-mono text-primary font-bold text-xs">{inv.invoice_no || `INV-${String(inv.id).slice(0, 8).toUpperCase()}`}</Td>
                        <Td className="text-app-muted text-xs font-medium">
                          {new Date(inv.date || inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Td>
                        <Td className="text-right font-mono font-bold text-app-text text-xs">₹{inv.total?.toLocaleString('en-IN')}</Td>
                        <Td className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-xs">₹{paid.toLocaleString('en-IN')}</Td>
                        <Td className="text-right font-mono font-bold text-xs">
                          {balance > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">₹{balance.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-app-muted">—</span>
                          )}
                        </Td>
                        <Td className="text-center">
                          <Badge variant={inv.payment_status === "paid" ? "success" : inv.payment_status === "partial" ? "warning" : "danger"}>
                            {inv.payment_status?.toUpperCase() || "UNPAID"}
                          </Badge>
                        </Td>
                        <Td className="text-right">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => handleModifyInvoice(inv.id)} 
                              className="p-1.5 text-app-muted hover:text-primary transition-colors hover:bg-app-hover rounded-lg cursor-pointer" 
                              title="Edit invoice"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => setPreviewInvoice(inv)} 
                              className="p-1.5 text-app-muted hover:text-primary transition-colors hover:bg-app-hover rounded-lg cursor-pointer" 
                              title="Preview & Print"
                            >
                              <Printer size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteInvoice(inv.id)} 
                              className="p-1.5 text-app-muted hover:text-rose-600 transition-colors hover:bg-rose-500/10 rounded-lg cursor-pointer" 
                              title="Delete transaction and restore inventory"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div>
            <div className="p-4 border-b border-app-border bg-app-subtle/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-500" />
                <h3 className="font-bold text-app-text text-sm">Customer Payment Receipts</h3>
                <span className="text-xs text-app-muted font-mono">({payments.length})</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>Payment Date</Th>
                    <Th>Reference ID</Th>
                    <Th>Payment Mode</Th>
                    <Th className="text-right">Amount Received</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {payments.length === 0 ? (
                    <Tr>
                      <Td colSpan="4" className="text-center py-12 text-app-muted text-xs">
                        No payment receipts logged for this customer yet.
                      </Td>
                    </Tr>
                  ) : payments.map(pay => (
                    <Tr key={pay.id} className="border-b border-app-border/40 hover:bg-app-hover/50 transition-colors">
                      <Td className="text-app-text font-medium text-xs">
                        {new Date(pay.date || pay.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Td>
                      <Td className="text-app-muted font-mono text-xs">{pay.reference || '—'}</Td>
                      <Td>
                        <Badge variant="gray" className="font-mono uppercase tracking-wider text-[10px]">
                          {pay.payment_mode || "CASH"}
                        </Badge>
                      </Td>
                      <Td className="text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                        ₹{pay.amount?.toLocaleString('en-IN')}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      {previewInvoice && <InvoicePreviewModal invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}
      {editingInvoice && <InvoiceEditorModal invoice={editingInvoice} onClose={() => setEditingInvoice(null)} onSaved={fetchCustomerData} />}
      {showEditProfile && customer && <CustomerEditModal customer={customer} onClose={() => setShowEditProfile(false)} onSaved={() => { fetchCustomerData(); setShowEditProfile(false); }} />}
      {showPaymentModal && (
        <AddPaymentModal 
          customerId={id} 
          customerName={customer?.name}
          customerPhone={customer?.phone}
          outstandingDue={duesBalance}
          onClose={() => setShowPaymentModal(false)} 
          onPaymentAdded={fetchCustomerData} 
        />
      )}
    </div>
  );
}
