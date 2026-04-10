import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import API from "../services/apiClient";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit3, Printer, Trash2, Mail, Phone, MapPin, CreditCard, DollarSign } from "lucide-react";
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
      const { data: custData, error: custError } = await supabase.from("customers").select("*").eq("id", id).single();
      if (custError) throw custError;
      setCustomer(custData);

      const { data: invData } = await supabase.from("sales").select("*").eq("customer_id", id).order("date", { ascending: false });
      setInvoices(invData || []);

      const { data: payData } = await supabase.from("payments").select("*").eq("customer_id", id).order("date", { ascending: false });
      setPayments(payData || []);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!window.confirm("Delete this customer? This cannot be undone.")) return;
    try {
      await supabase.from("customers").delete().eq("id", id);
      toast.success("Customer deleted successfully");
      navigate("/customers");
    } catch (err) {
      toast.error("Failed to delete customer");
    }
  };

  const handleModifyInvoice = async (invoiceId) => {
    try {
      const { data, error } = await supabase.from("sales").select("*").eq("id", invoiceId).single();
      if (error) throw error;
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
    return <div className="flex justify-center p-20"><div className="animate-spin h-8 w-8 border-b-2 border-[#3B82F6] rounded-full"></div></div>;
  }

  return (
    <div className="space-y-[32px] animate-fade-in-up">
      <button onClick={() => navigate("/customers")} className="flex items-center gap-[8px] text-[#64748B] hover:text-[#0F172A] font-medium transition-colors">
        <ArrowLeft size={18} /> Back to Customers
      </button>

      {customer && (
        <Card className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-[24px]">
          <div className="flex items-center gap-[24px]">
            <div className="w-[80px] h-[80px] rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[32px] font-bold text-[#1E3A8A]">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-[24px] font-bold text-[#0F172A]">{customer.name}</h1>
              <div className="flex gap-[16px] text-[13px] text-[#64748B] mt-[8px]">
                {customer.email && <span className="flex items-center gap-[4px]"><Mail size={14} />{customer.email}</span>}
                {customer.phone && <span className="flex items-center gap-[4px]"><Phone size={14} />{customer.phone}</span>}
                {customer.city && <span className="flex items-center gap-[4px]"><MapPin size={14} />{customer.city}</span>}
              </div>
            </div>
          </div>

          <div className="flex gap-[24px]">
             <div className="flex flex-col items-end">
                <span className="text-[11px] font-bold text-[#64748B] uppercase">Total Billed</span>
                <span className="text-[20px] font-bold text-[#0F172A]">₹{totalBilled.toLocaleString()}</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[11px] font-bold text-[#16A34A] uppercase">Total Paid</span>
                <span className="text-[20px] font-bold text-[#15803D]">₹{totalPaidInvoices.toLocaleString()}</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[11px] font-bold text-[#DC2626] uppercase">Pending Due</span>
                <span className="text-[20px] font-bold text-[#991B1B]">₹{pendingAmount.toLocaleString()}</span>
             </div>
          </div>

          <div className="flex flex-col gap-[8px] min-w-[150px]">
             <Button onClick={() => setShowPaymentModal(true)} icon={<DollarSign size={16} />}>Pay</Button>
             <div className="flex gap-[8px]">
               <Button variant="outline" className="flex-1" onClick={() => setShowEditProfile(true)}><Edit3 size={14} /></Button>
               <Button variant="danger" className="flex-1" onClick={handleDeleteCustomer}><Trash2 size={14} /></Button>
             </div>
          </div>
        </Card>
      )}

      {/* TABS */}
      <div className="flex gap-[24px] border-b border-[#E2E8F0]">
        <button onClick={() => setActiveTab("invoices")} className={`pb-[12px] text-[14px] font-semibold border-b-2 transition-all flex items-center gap-[8px] ${activeTab === "invoices" ? "border-[#3B82F6] text-[#3B82F6]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}>
            <CreditCard size={18} /> Invoices & Transactions
        </button>
        <button onClick={() => setActiveTab("payments")} className={`pb-[12px] text-[14px] font-semibold border-b-2 transition-all flex items-center gap-[8px] ${activeTab === "payments" ? "border-[#3B82F6] text-[#3B82F6]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}>
            <DollarSign size={18} /> Payment History
        </button>
      </div>

      <Card noPadding>
        {activeTab === "invoices" && (
          <div>
            <div className="p-[20px] border-b border-[#E2E8F0] flex flex-col sm:flex-row justify-between items-center gap-[16px] bg-[#F8FAFC]">
               <h3 className="font-bold text-[#0F172A] flex items-center gap-[8px]"><CreditCard size={18} className="text-[#3B82F6]" /> Client Invoices</h3>
               <div className="flex gap-[12px]">
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-[12px] py-[8px] text-[13px] outline-none">
                     <option value="all">All Status</option>
                     <option value="paid">Paid</option>
                     <option value="unpaid">Unpaid / Pending</option>
                  </select>
                  <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
               </div>
            </div>
            <Table>
              <Thead><tr><Th>Invoice #</Th><Th>Date</Th><Th className="text-right">Total</Th><Th className="text-right">Paid</Th><Th className="text-right">Balance</Th><Th className="text-center">Status</Th><Th className="text-right">Actions</Th></tr></Thead>
              <Tbody>
                {filteredInvoices.length === 0 ? <Tr><Td colSpan="7" className="text-center py-6 text-[#64748B]">No invoices found.</Td></Tr> : filteredInvoices.map(inv => {
                  const paid = inv.amount_paid || 0;
                  const balance = (inv.total || 0) - paid;
                  return (
                    <Tr key={inv.id}>
                       <Td className="font-mono text-[#3B82F6] font-medium">FS-{inv.id}</Td>
                       <Td className="text-[#64748B]">{new Date(inv.date).toLocaleDateString()}</Td>
                       <Td className="text-right font-bold text-[#0F172A]">₹{inv.total?.toLocaleString()}</Td>
                       <Td className="text-right font-medium text-[#16A34A]">₹{paid.toLocaleString()}</Td>
                       <Td className="text-right font-bold text-[#DC2626]">{balance > 0 ? `₹${balance.toLocaleString()}` : '-'}</Td>
                       <Td className="text-center">
                         <Badge variant={inv.payment_status === "paid" ? "success" : inv.payment_status === "partial" ? "warning" : "danger"}>
                           {inv.payment_status?.toUpperCase() || "UNPAID"}
                         </Badge>
                       </Td>
                       <Td className="text-right">
                         <div className="flex justify-end gap-[8px]">
                           <button onClick={() => handleModifyInvoice(inv.id)} className="p-[6px] text-[#64748B] hover:text-[#3B82F6]"><Edit3 size={16} /></button>
                           <button onClick={() => setPreviewInvoice(inv)} className="p-[6px] text-[#64748B] hover:text-[#3B82F6]"><Printer size={16} /></button>
                           <button onClick={() => handleDeleteInvoice(inv.id)} className="p-[6px] text-[#64748B] hover:text-[#EF4444]"><Trash2 size={16} /></button>
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
            <div className="p-[20px] border-b border-[#E2E8F0] bg-[#F8FAFC]">
               <h3 className="font-bold text-[#0F172A] flex items-center gap-[8px]"><DollarSign size={18} className="text-[#3B82F6]" /> Incoming Payments</h3>
            </div>
            <Table>
               <Thead><tr><Th>Date</Th><Th>Reference</Th><Th>Mode</Th><Th className="text-right">Amount</Th></tr></Thead>
               <Tbody>
                 {payments.length === 0 ? <Tr><Td colSpan="4" className="text-center py-6 text-[#64748B]">No payments recorded.</Td></Tr> : payments.map(pay => (
                   <Tr key={pay.id}>
                     <Td className="text-[#0F172A] font-medium">{new Date(pay.date).toLocaleDateString()}</Td>
                     <Td className="text-[#64748B] text-[13px]">{pay.reference || '-'}</Td>
                     <Td><span className="px-[6px] py-[2px] bg-[#F1F5F9] border border-[#E2E8F0] rounded text-[10px] uppercase font-bold text-[#64748B]">{pay.payment_mode || "CASH"}</span></Td>
                     <Td className="text-right font-bold text-[#16A34A]">₹{pay.amount?.toLocaleString()}</Td>
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
