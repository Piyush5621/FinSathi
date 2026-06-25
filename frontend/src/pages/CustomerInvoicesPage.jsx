import { useEffect, useState } from 'react';
import { supabase } from "../lib/supabaseClient";
import API from "../services/apiClient";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit3, Printer, Trash2, Mail, Phone, MapPin, CreditCard, DollarSign, Receipt, Plus } from 'lucide-react';
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
      setInvoices(invData || []);

      const { data: payData } = await API.get(`/payments/${id}`);
      setPayments(payData || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!window.confirm("Delete this customer? This cannot be undone.")) return;
    try {
      await API.delete(`/customers/${id}`);
      toast.success("Customer deleted successfully");
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
    if (!window.confirm("Are you sure you want to delete this invoice? This action will restore inventory stock.")) return;
    try {
      await API.delete(`/sales/${invoiceId}`);
      toast.success("Invoice deleted successfully");
      fetchCustomerData();
    } catch (err) {
      toast.error("Failed to delete invoice");
    }
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const pendingAmount = invoices.reduce((sum, inv) => {
    if (inv.payment_status === 'paid') return sum;
    const due = (inv.total || 0) - (inv.amount_paid || 0);
    return sum + (due > 0 ? due : 0);
  }, 0);
  const totalPaidInvoices = totalBilled - pendingAmount;

  const filteredInvoices = invoices.filter((inv) => {
    const mSearch = inv.id.toString().includes(search) || (inv.total && inv.total.toString().includes(search));
    const mFilter = filterStatus === 'all' || (filterStatus === 'paid' && inv.payment_status === 'paid') || (filterStatus === 'unpaid' && (inv.payment_status === 'unpaid' || inv.payment_status === 'partial'));
    return mSearch && mFilter;
  });

  if (loading && !customer) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-b-2 border-[#3B82F6] rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-[32px] animate-fade-in-up pb-[40px]">
      {/* Back link */}
      <button 
        onClick={() => navigate("/customers")} 
        className="flex items-center gap-[8px] text-slate-500 hover:text-slate-900 font-semibold text-xs transition-colors bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm"
      >
        <ArrowLeft size={14} /> Back to Customer Directory
      </button>

      {/* Customer Profile Summary */}
      {customer && (
        <Card className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-[24px] border border-slate-150 relative overflow-hidden">
          <div className="flex items-center gap-[20px]">
            <div className="w-[64px] h-[64px] rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[24px] font-black text-slate-700 uppercase shrink-0">
              {customer.name.substring(0, 2)}
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-[#0F172A] tracking-tight">{customer.name}</h1>
              <div className="flex flex-wrap gap-[12px] text-xs text-[#64748B] mt-1.5 font-medium">
                {customer.email && <span className="flex items-center gap-[4px]"><Mail size={12} className="text-slate-400" />{customer.email}</span>}
                {customer.phone && <span className="flex items-center gap-[4px]"><Phone size={12} className="text-slate-400" />{customer.phone}</span>}
                {customer.city && <span className="flex items-center gap-[4px]"><MapPin size={12} className="text-slate-400" />{customer.city}</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-[16px] w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
             <div className="flex flex-col items-start lg:items-end">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Total Billed</span>
                <span className="text-[18px] font-extrabold text-slate-900 mt-1 block">₹{totalBilled.toLocaleString('en-IN')}</span>
             </div>
             <div className="flex flex-col items-start lg:items-end">
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Total Paid</span>
                <span className="text-[18px] font-extrabold text-emerald-600 mt-1 block">₹{totalPaidInvoices.toLocaleString('en-IN')}</span>
             </div>
             <div className="flex flex-col items-start lg:items-end">
                <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block">Outstanding</span>
                <span className="text-[18px] font-extrabold text-red-600 mt-1 block">₹{pendingAmount.toLocaleString('en-IN')}</span>
             </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-[8px] w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
             <Button onClick={() => setShowPaymentModal(true)} icon={<Plus size={16} />} className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-700">Record Payment</Button>
             <div className="flex gap-[8px] flex-1 lg:flex-none">
               <Button variant="outline" className="flex-1 py-1.5" onClick={() => setShowEditProfile(true)}><Edit3 size={14} /></Button>
               <Button variant="danger" className="flex-1 py-1.5" onClick={handleDeleteCustomer}><Trash2 size={14} /></Button>
             </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-[24px] border-b border-[#E2E8F0] pb-px">
        <button 
          onClick={() => setActiveTab("invoices")} 
          className={`pb-[12px] text-sm font-bold border-b-2 transition-all flex items-center gap-[8px] ${activeTab === "invoices" ? "border-[#3B82F6] text-[#3B82F6]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}
        >
          <CreditCard size={16} /> Invoices & Transactions
        </button>
        <button 
          onClick={() => setActiveTab("payments")} 
          className={`pb-[12px] text-sm font-bold border-b-2 transition-all flex items-center gap-[8px] ${activeTab === "payments" ? "border-[#3B82F6] text-[#3B82F6]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}
        >
          <DollarSign size={16} /> Incoming Payments Ledger
        </button>
      </div>

      <Card noPadding className="border border-slate-150 overflow-hidden">
        {activeTab === "invoices" && (
          <div>
            <div className="p-[20px] border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-[16px] bg-slate-50/50">
               <h3 className="font-bold text-[#0F172A] text-sm flex items-center gap-[8px]"><Receipt size={16} className="text-[#3B82F6]" /> Client Invoices</h3>
               <div className="flex items-center gap-[12px] w-full sm:w-auto shrink-0">
                  <select 
                     value={filterStatus} 
                     onChange={(e) => setFilterStatus(e.target.value)} 
                     className="bg-white border border-slate-200 rounded-lg px-[12px] py-[8px] text-[13px] font-semibold text-slate-700 outline-none focus:border-slate-350 transition-colors shadow-sm"
                  >
                     <option value="all">All Status</option>
                     <option value="paid">Paid Only</option>
                     <option value="unpaid">Unpaid / Partial</option>
                  </select>
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-[12px] top-[10px] h-[14px] w-[14px] text-slate-400" />
                    <Input 
                      placeholder="Search invoice ID..." 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                      className="pl-[32px] w-full py-1.5 text-xs" 
                    />
                  </div>
               </div>
            </div>
            <Table>
              <Thead>
                <tr>
                  <Th>Invoice ID</Th>
                  <Th>Issue Date</Th>
                  <Th className="text-right">Billed Amount</Th>
                  <Th className="text-right">Paid Amount</Th>
                  <Th className="text-right">Outstanding Balance</Th>
                  <Th className="text-center">Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {filteredInvoices.length === 0 ? (
                  <Tr><Td colSpan="7" className="text-center py-10 text-slate-400">No invoices match your filters.</Td></Tr>
                ) : filteredInvoices.map(inv => {
                  const paid = inv.amount_paid || 0;
                  const balance = (inv.total || 0) - paid;
                  return (
                    <Tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/30">
                       <Td className="font-mono text-[#3B82F6] font-bold text-xs">FS-{inv.id}</Td>
                       <Td className="text-slate-600 font-medium">{new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Td>
                       <Td className="text-right font-bold text-slate-900">₹{inv.total?.toLocaleString('en-IN')}</Td>
                       <Td className="text-right font-semibold text-emerald-600">₹{paid.toLocaleString('en-IN')}</Td>
                       <Td className="text-right font-bold text-red-600">{balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : '—'}</Td>
                       <Td className="text-center">
                         <Badge variant={inv.payment_status === "paid" ? "success" : inv.payment_status === "partial" ? "warning" : "danger"}>
                           {inv.payment_status?.toUpperCase() || "UNPAID"}
                         </Badge>
                       </Td>
                       <Td className="text-right">
                          <div className="flex justify-end gap-[6px]">
                            <button onClick={() => handleModifyInvoice(inv.id)} className="p-[6px] text-slate-400 hover:text-[#3B82F6] transition-colors hover:bg-slate-100 rounded-lg" title="Edit invoice"><Edit3 size={14} /></button>
                            <button onClick={() => setPreviewInvoice(inv)} className="p-[6px] text-slate-400 hover:text-[#3B82F6] transition-colors hover:bg-slate-100 rounded-lg" title="Preview & Print"><Printer size={14} /></button>
                            <button onClick={() => handleDeleteInvoice(inv.id)} className="p-[6px] text-slate-400 hover:text-red-600 transition-colors hover:bg-slate-100 rounded-lg" title="Delete transaction"><Trash2 size={14} /></button>
                          </div>
                       </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </div>
        )}

        {activeTab === "payments" && (
          <div>
            <div className="p-[20px] border-b border-slate-100 bg-slate-50/50">
               <h3 className="font-bold text-[#0F172A] text-sm flex items-center gap-[8px]"><DollarSign size={16} className="text-[#3B82F6]" /> Incoming Payments History</h3>
            </div>
            <Table>
               <Thead>
                 <tr>
                   <Th>Payment Date</Th>
                   <Th>Reference ID</Th>
                   <Th>Payment Mode</Th>
                   <Th className="text-right">Received Amount</Th>
                 </tr>
               </Thead>
               <Tbody>
                 {payments.length === 0 ? (
                   <Tr><Td colSpan="4" className="text-center py-10 text-slate-400">No payment receipts found.</Td></Tr>
                 ) : payments.map(pay => (
                   <Tr key={pay.id} className="border-b border-slate-100 hover:bg-slate-50/30">
                     <Td className="text-slate-900 font-semibold">{new Date(pay.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Td>
                     <Td className="text-slate-500 font-mono text-xs">{pay.reference || '—'}</Td>
                     <Td>
                       <Badge variant="gray" className="font-bold uppercase tracking-wider text-[10px]">
                         {pay.payment_mode || "CASH"}
                       </Badge>
                     </Td>
                     <Td className="text-right font-extrabold text-emerald-600">₹{pay.amount?.toLocaleString('en-IN')}</Td>
                   </Tr>
                 ))}
               </Tbody>
            </Table>
          </div>
        )}
      </Card>

      {previewInvoice && <InvoicePreviewModal invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}
      {editingInvoice && <InvoiceEditorModal invoice={editingInvoice} onClose={() => setEditingInvoice(null)} onSaved={fetchCustomerData} />}
      {showEditProfile && customer && <CustomerEditModal customer={customer} onClose={() => setShowEditProfile(false)} onSaved={() => { fetchCustomerData(); setShowEditProfile(false); }} />}
      {showPaymentModal && <AddPaymentModal customerId={id} onClose={() => setShowPaymentModal(false)} onPaymentAdded={fetchCustomerData} />}
    </div>
  );
}
