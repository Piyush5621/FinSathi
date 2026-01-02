import React, { useEffect, useState } from "react";
import { Search, Plus, Edit, FileText, X, User, Mail, Phone, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import CustomerEditModal from "../components/CustomerEditModal";
import InvoiceEditModal from "../components/billing/InvoicePreviewModal";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
  });
  const [loading, setLoading] = useState(true);
  const [pendingAmounts, setPendingAmounts] = useState({});

  const navigate = useNavigate();

  // ✅ Fetch all customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("id", { ascending: true });
      if (error) throw error;
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch pending amounts from sales table
  const fetchPendingAmounts = async () => {
    try {
      // Select amount_paid to calculate true pending balance
      const { data, error } = await supabase
        .from("sales")
        .select("customer_id, total, amount_paid, payment_status");

      if (error) throw error;

      const pendingMap = {};
      data?.forEach((sale) => {
        if (sale.payment_status !== "paid") {
          const total = sale.total || 0;
          const paid = sale.amount_paid || 0;
          const due = total - paid;

          if (due > 0) {
            pendingMap[sale.customer_id] = (pendingMap[sale.customer_id] || 0) + due;
          }
        }
      });
      setPendingAmounts(pendingMap);
    } catch (err) {
      console.error("Pending fetch error:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchPendingAmounts();
  }, []);

  // ✅ Add customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    try {
      const { error } = await supabase.from("customers").insert([form]);
      if (error) throw error;
      toast.success("Customer added successfully");
      setShowAddModal(false);
      setForm({ name: "", phone: "", email: "", address: "", city: "" });
      fetchCustomers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add customer");
    }
  };

  // ✅ Delete customer
  const handleDelete = async (id) => {
    if (!confirm("Delete this customer?")) return;
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Customer deleted");
      fetchCustomers();
      fetchPendingAmounts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete customer");
    }
  };

  // ✅ Filter customers
  const filtered = customers.filter((c) =>
    [c.name, c.email, c.phone, c.city]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6 font-inter">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              Customer Directory
            </h1>
            <p className="text-slate-400 mt-1">Manage your client relationships and dues.</p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72 group">
              <Search className="absolute left-3 top-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Plus className="h-5 w-5" /> New Customer
            </button>
          </div>
        </div>

        {/* Customer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="h-56 glass-card animate-pulse rounded-3xl"></div>
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-20 text-center glass-card rounded-3xl border-dashed border-slate-700">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-slate-500" />
              </div>
              <p className="text-xl text-slate-400 font-medium">No customers found.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
              >
                Add your first customer
              </button>
            </div>
          ) : (
            filtered.map((c) => {
              const pending = pendingAmounts[c.id] || 0;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate(`/customer-invoices/${c.id}`)}
                  className="group glass-card p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                >
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {c.name}
                      </h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                        <MapPin size={12} /> {c.city || 'Unknown City'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between items-end relative z-10">
                    <div className="text-slate-400 text-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Phone size={12} /> <span className="text-slate-300">{c.phone || "N/A"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Due Amount</span>
                      <div className={`text-xl font-bold ${pending > 0 ? 'text-rose-400 drop-shadow-sm' : 'text-emerald-400'}`}>
                        ₹{pending.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Hover Effects */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all duration-500"></div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ➕ Add Customer Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-[#0f172a] border border-slate-700 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative overflow-hidden"
            >
              {/* Modal Decor */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none"></div>

              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    New Customer
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Add details for a new client.</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-5 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="col-span-full">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-slate-500" size={18} />
                      <input
                        placeholder="e.g. Rahul Sharma"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                      <input
                        placeholder="Email Address"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-slate-500" size={18} />
                      <input
                        placeholder="Phone Number"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="col-span-full">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-slate-500" size={18} />
                      <input
                        placeholder="City / Region"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="col-span-full">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Address</label>
                    <textarea
                      placeholder="Full Billing Address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white transition-all h-24 resize-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
                  >
                    Save Customer
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✏️ Edit Customer Modal */}
      {editCustomer && (
        <CustomerEditModal
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSaved={() => {
            fetchCustomers();
            fetchPendingAmounts();
          }}
        />
      )}

      {/* 🧾 Edit Invoice Modal */}
      {editingInvoice && (
        <InvoiceEditModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={() => {
            fetchPendingAmounts();
            setEditingInvoice(null);
          }}
        />
      )}
    </div>
  );
}
