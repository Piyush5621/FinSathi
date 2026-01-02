import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import API from "../services/apiClient";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, Edit3, Printer, Trash2, Mail, Phone, MapPin, Calendar, CreditCard, DollarSign, FileText } from "lucide-react";
import toast from "react-hot-toast";
import InvoicePreviewModal from "../components/billing/InvoicePreviewModal";
import InvoiceEditorModal from "../pages/Billing/InvoiceEditorModal";
import CustomerEditModal from "../components/CustomerEditModal";
import AddPaymentModal from "../components/AddPaymentModal";

export default function CustomerInvoicesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices"); // 'invoices' | 'payments'

  // Modals state
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

      // 1. Fetch Customer Profile
      const { data: custData, error: custError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();
      if (custError) throw custError;
      setCustomer(custData);

      // 2. Fetch Invoices
      const { data: invData, error: invError } = await supabase
        .from("sales")
        .select("*")
        .eq("customer_id", id)
        .order("date", { ascending: false });
      if (invError) throw invError;
      setInvoices(invData || []);

      // 3. Fetch Payments
      const { data: payData, error: payError } = await supabase
        .from("payments")
        .select("*")
        .eq("customer_id", id)
        .order("date", { ascending: false });

      if (payError) {
        console.warn("Payments table fetch error (might not exist yet):", payError);
      } else {
        setPayments(payData || []);
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Customer deleted successfully");
      navigate("/customers");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete customer");
    }
  };

  const handleModifyInvoice = async (invoiceId) => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      setEditingInvoice(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoice details");
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm("Are you sure you want to delete this invoice? This action will restore inventory stock.")) return;
    try {
      await API.delete(`/sales/${invoiceId}`);
      toast.success("Invoice deleted successfully");
      fetchCustomerData(); // Refresh list
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Failed to delete invoice";
      toast.error(msg);
    }
  };

  // derived stats
  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  // Calculate Pending: ignore 'paid' status, sum due on the rest
  const pendingAmount = invoices.reduce((sum, inv) => {
    if (inv.payment_status === 'paid') return sum;
    const paid = inv.amount_paid || 0;
    const due = (inv.total || 0) - paid;
    return sum + (due > 0 ? due : 0);
  }, 0);

  // Total Paid can be estimated as Billed - Pending (roughly) or strictly sum of payments, let's keep it simple for now as sum of amount_paid of items *where applicable*
  // But purely for display:
  const totalPaidInvoices = totalBilled - pendingAmount;

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.id.toString().includes(search) ||
      (inv.total && inv.total.toString().includes(search));

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'paid' && inv.payment_status === 'paid') ||
      (filterStatus === 'unpaid' && (inv.payment_status === 'unpaid' || inv.payment_status === 'partial'));

    return matchesSearch && matchesFilter;
  });

  if (loading && !customer) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 70, damping: 15 }}
      className="fixed inset-0 bg-[#0f172a] text-slate-100 p-6 z-50 overflow-y-auto font-inter"
    >
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Navigation */}
        <button
          onClick={() => navigate("/customers")}
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-4 py-2 rounded-xl transition-all font-medium mb-4 w-fit"
        >
          <ArrowLeft size={20} /> Back to Customers
        </button>

        {/* 👤 Profile Header Card */}
        {customer && (
          <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

            <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start justify-between">

              {/* Avatar & Info */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-4xl text-white font-bold shadow-2xl ring-4 ring-white/10">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{customer.name}</h1>
                  <div className="space-y-1.5 text-sm text-slate-400 font-medium">
                    {customer.email && <p className="flex items-center gap-2.5"><Mail size={16} className="text-indigo-400" /> {customer.email}</p>}
                    {customer.phone && <p className="flex items-center gap-2.5"><Phone size={16} className="text-emerald-400" /> {customer.phone}</p>}
                    {customer.city && <p className="flex items-center gap-2.5"><MapPin size={16} className="text-rose-400" /> {customer.city}</p>}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500 mb-1 tracking-wider">Total Billed</p>
                  <p className="text-2xl font-bold text-slate-200">₹{totalBilled.toLocaleString()}</p>
                </div>
                <div className="w-px bg-slate-700/50"></div>
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500 mb-1 tracking-wider">Total Paid</p>
                  <p className="text-2xl font-bold text-emerald-400">₹{totalPaidInvoices.toLocaleString()}</p>
                </div>
                <div className="w-px bg-slate-700/50"></div>
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500 mb-1 tracking-wider">Total Pending</p>
                  <p className={`text-2xl font-bold ${pendingAmount > 1 ? 'text-rose-400 drop-shadow-[0_2px_10px_rgba(251,113,133,0.3)]' : 'text-slate-400'}`}>
                    ₹{pendingAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 min-w-[180px]">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-bold transform hover:-translate-y-0.5"
                >
                  <DollarSign size={20} /> Record Payment
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEditProfile(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition font-medium text-sm"
                  >
                    <Edit3 size={16} /> Edit
                  </button>
                  <button
                    onClick={handleDeleteCustomer}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition font-medium text-sm"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🗂️ Tabs */}
        <div className="flex gap-8 border-b border-slate-700 px-4">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`pb-4 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all ${activeTab === "invoices"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
          >
            <CreditCard size={18} /> Invoices & Transactions
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`pb-4 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all ${activeTab === "payments"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
          >
            <DollarSign size={18} /> Payment History
          </button>
        </div>

        {/* Content Area */}
        <div className="glass-card rounded-3xl overflow-hidden min-h-[500px] border border-slate-700/50">

          {/* --- INVOICES TAB --- */}
          {activeTab === "invoices" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-6 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/30">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-300">
                  <CreditCard size={20} className="text-indigo-400" /> Transaction History
                </h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-slate-300 transition-all font-medium"
                  >
                    <option value="all">All Status</option>
                    <option value="paid">✅ Paid</option>
                    <option value="unpaid">❌ Unpaid / Pending</option>
                  </select>
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 pr-4 py-2.5 w-full bg-slate-800 border border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-slate-300 transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="p-20 text-center text-slate-500 flex flex-col items-center">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="text-lg">No transactions found matching your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-5 pl-8">Invoice #</th>
                        <th className="p-5">Date</th>
                        <th className="p-5 text-right">Total</th>
                        <th className="p-5 text-right">Paid</th>
                        <th className="p-5 text-right">Balance</th>
                        <th className="p-5 text-center">Status</th>
                        <th className="p-5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30 text-sm">
                      {filteredInvoices.map((inv) => {
                        const paid = inv.amount_paid || 0;
                        const balance = (inv.total || 0) - paid;
                        return (
                          <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors group">
                            <td className="p-5 pl-8 font-mono font-medium text-indigo-300">
                              FS-{inv.id}
                            </td>
                            <td className="p-5 text-slate-400">
                              {new Date(inv.date).toLocaleDateString("en-IN", { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="p-5 text-right font-bold text-slate-200 text-base">
                              ₹{inv.total?.toLocaleString()}
                            </td>
                            <td className="p-5 text-right text-emerald-400 font-medium">
                              ₹{paid.toLocaleString()}
                            </td>
                            <td className="p-5 text-right font-bold text-rose-400">
                              {balance > 0.5 ? `₹${balance.toLocaleString()}` : <span className="text-slate-600">-</span>}
                            </td>
                            <td className="p-5 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide border ${inv.payment_status === "paid"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : inv.payment_status === "partial"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                }`}>
                                {inv.payment_status?.toUpperCase() || "UNPAID"}
                              </span>
                            </td>
                            <td className="p-5 flex justify-center gap-3 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleModifyInvoice(inv.id)}
                                className="p-2 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition"
                                title="Edit Invoice"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition"
                                title="Delete Invoice"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button
                                onClick={() => setPreviewInvoice(inv)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                                title="Print Invoice"
                              >
                                <Printer size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* --- PAYMENTS TAB --- */}
          {activeTab === "payments" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-6 border-b border-slate-700/50 bg-slate-900/30">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-300">
                  <DollarSign size={20} className="text-emerald-400" /> Payment History
                </h2>
              </div>

              {payments.length === 0 ? (
                <div className="p-20 text-center text-slate-500">
                  <p>No payments recorded yet.</p>
                  <button onClick={() => setShowPaymentModal(true)} className="mt-4 text-emerald-400 font-medium hover:underline">
                    Record First Payment
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/50 text-emerald-500 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-5 pl-8">Date</th>
                        <th className="p-5">Reference</th>
                        <th className="p-5">Mode</th>
                        <th className="p-5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30 text-sm">
                      {payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-5 pl-8 text-slate-300 font-medium">
                            {new Date(pay.date).toLocaleDateString("en-IN", { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-5 text-slate-400 font-mono text-xs">
                            {pay.reference || <span className="opacity-50">N/A</span>}
                          </td>
                          <td className="p-5 text-slate-300">
                            <span className="px-2 py-1 bg-slate-800 rounded text-[10px] uppercase font-bold tracking-wide text-slate-400 border border-slate-700">
                              {pay.payment_mode || "Cash"}
                            </span>
                          </td>
                          <td className="p-5 text-right font-bold text-emerald-400 text-lg">
                            ₹{pay.amount?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      {previewInvoice && <InvoicePreviewModal invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}

      {editingInvoice && <InvoiceEditorModal invoice={editingInvoice} onClose={() => setEditingInvoice(null)} onSaved={fetchCustomerData} />}

      {showEditProfile && customer && <CustomerEditModal customer={customer} onClose={() => setShowEditProfile(false)} onSaved={() => { fetchCustomerData(); setShowEditProfile(false); }} />}

      {/* 💰 Add Payment Modal */}
      {showPaymentModal && (
        <AddPaymentModal
          customerId={id}
          onClose={() => setShowPaymentModal(false)}
          onPaymentAdded={fetchCustomerData}
        />
      )}

    </motion.div>
  );
}
