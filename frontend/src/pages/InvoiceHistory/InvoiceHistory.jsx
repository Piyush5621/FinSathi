import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Edit3, Printer, Calendar, FileText,
  CheckCircle, XCircle, Clock, DollarSign, Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import InvoicePreviewModal from "../../components/billing/InvoicePreviewModal";
import InvoiceEditorModal from "../Billing/InvoiceEditorModal";

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  // ✅ Fetch all invoices with customer details
  const fetchInvoices = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("sales")
        .select("*, customers(name)")
        .order("date", { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
      setFilteredInvoices(data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Filter by search & date
  useEffect(() => {
    let filtered = invoices;

    if (search.trim()) {
      filtered = filtered.filter(
        (inv) =>
          inv.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
          inv.customers?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (dateFilter) {
      const selectedDate = new Date(dateFilter);
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.date);
        return (
          invDate.getFullYear() === selectedDate.getFullYear() &&
          invDate.getMonth() === selectedDate.getMonth() &&
          invDate.getDate() === selectedDate.getDate()
        );
      });
    }

    setFilteredInvoices(filtered);
  }, [search, dateFilter, invoices]);

  // ✅ Handle modify invoice
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
      toast.error("Failed to load invoice for edit");
    }
  };

  // ✅ Handle delete invoice
  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm("Are you sure you want to delete this invoice? This action will restore inventory stock.")) return;

    try {
      await API.delete(`/sales/${invoiceId}`);
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (err) {
      console.error("Delete error:", err);
      // Show actual error from backend if available
      const msg = err.response?.data?.error || "Failed to delete invoice";
      toast.error(msg);
    }
  };

  // ✅ Stats Logic
  const stats = useMemo(() => {
    const total = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidCount = filteredInvoices.filter(inv => inv.payment_status === 'paid').length;
    const unpaidCount = filteredInvoices.filter(inv => inv.payment_status !== 'paid').length;
    return { total, paidCount, unpaidCount };
  }, [filteredInvoices]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0f172a] text-slate-100 p-6"
    >
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Header & Stats */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-300 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
              <FileText className="text-sky-400" /> Invoice History
            </h1>
            <p className="text-slate-400 mt-2">View, search, and manage all past transactions.</p>
          </div>

          <div className="flex gap-4 w-full xl:w-auto overflow-x-auto pb-2">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 p-4 rounded-2xl min-w-[200px] flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><DollarSign size={18} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase">Total Volume</span>
              </div>
              <div className="text-2xl font-bold text-white">₹{stats.total.toLocaleString()}</div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 p-4 rounded-2xl min-w-[150px] flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><CheckCircle size={18} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase">Paid</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.paidCount}</div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 p-4 rounded-2xl min-w-[150px] flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400"><Clock size={18} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase">Pending</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.unpaidCount}</div>
            </div>
          </div>
        </div>

        {/* 🔍 Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search invoice # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none placeholder:text-slate-600 transition-all"
            />
          </div>

          <div className="relative w-full md:w-1/4">
            <Calendar className="absolute left-3 top-2.5 text-slate-500" size={18} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none placeholder:text-slate-600 transition-all [color-scheme:dark]"
            />
          </div>
        </div>

        {/* 📄 Table */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
            <FileText size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-500 text-lg">No invoices found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-hidden bg-slate-800/40 backdrop-blur rounded-3xl border border-slate-700 shadow-xl">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                <tr>
                  <th className="p-5 pl-7">Invoice #</th>
                  <th className="p-5">Customer</th>
                  <th className="p-5">Date & Time</th>
                  <th className="p-5 text-right">Amount</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                <AnimatePresence>
                  {filteredInvoices.map((inv, index) => (
                    <motion.tr
                      key={inv.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-700/30 transition-colors group"
                    >
                      <td className="p-5 pl-7 font-mono font-medium text-indigo-300">
                        {inv.invoice_no || `FS-${inv.id}`}
                      </td>
                      <td className="p-5 font-medium text-slate-200">
                        {inv.customers?.name || <span className="text-slate-500 italic">Unknown</span>}
                      </td>
                      <td className="p-5 text-slate-400 text-sm">
                        {new Date(inv.date).toLocaleDateString("en-IN", {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                        <div className="text-xs text-slate-600">
                          {new Date(inv.date).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-5 text-right font-bold text-slate-100">
                        ₹{inv.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-5 text-center">
                        {inv.payment_status === "paid" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle size={12} /> PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <Clock size={12} /> PENDING
                          </span>
                        )}
                      </td>
                      <td className="p-5 flex justify-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleModifyInvoice(inv.id)}
                          className="p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-all active:scale-95"
                          title="Modify Invoice"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all active:scale-95"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          className="p-2 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-all active:scale-95"
                          title="Print Invoice"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🧾 Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

      {/* ✏ Edit Modal */}
      {editingInvoice && (
        <InvoiceEditorModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={fetchInvoices}
        />
      )}
    </motion.div>
  );
}
