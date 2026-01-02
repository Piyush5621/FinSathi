import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Search, DollarSign, Calendar, User, Filter, CreditCard, ChevronRight, PlusCircle, X, Trash2 } from "lucide-react";
import AddPaymentModal from "../components/AddPaymentModal";

export default function PaymentsPage() {
    const [activeTab, setActiveTab] = useState("balances"); // 'balances' | 'history'
    const [payments, setPayments] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Date Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Modal State
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === "history") {
                const { data, error } = await supabase
                    .from("payments")
                    .select(`*, customers (name, email)`)
                    .order("date", { ascending: false });
                if (error) throw error;
                setPayments(data || []);
            } else {
                // Fetch Customers + Aggregated Sales Data for Balance
                const { data: custData, error: custError } = await supabase.from("customers").select("*");
                if (custError) throw custError;

                const { data: salesData, error: salesError } = await supabase
                    .from("sales")
                    .select("customer_id, total, amount_paid, payment_status");

                if (salesError) throw salesError;

                const processed = custData.map(c => {
                    const customerSales = salesData.filter(s => String(s.customer_id) === String(c.id));
                    const totalBilled = customerSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

                    const pending = customerSales.reduce((sum, s) => {
                        // If explicitly paid, ignore (or check amount_paid == total?)
                        // Rely on payment_status or calculation? 
                        // Better to calculate: Total - AmountPaid. 
                        // If status is 'paid', amount_paid should be total.

                        const total = Number(s.total) || 0;
                        let paid = Number(s.amount_paid) || 0;

                        // Fallback: if status says paid but paid is 0, treat as paid (legacy sync)
                        if (s.payment_status === 'paid' && paid === 0) {
                            paid = total;
                        }

                        const due = total - paid;
                        return sum + (due > 0.01 ? due : 0); // Tolerance for float
                    }, 0);

                    return { ...c, totalBilled, pending };
                });

                processed.sort((a, b) => b.pending - a.pending);
                setCustomers(processed);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = payments.filter(p => {
        const matchesSearch =
            p.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.amount.toString().includes(search) ||
            p.reference?.toLowerCase().includes(search.toLowerCase());

        let matchesDate = true;
        if (startDate) {
            matchesDate = matchesDate && new Date(p.date) >= new Date(startDate);
        }
        if (endDate) {
            // Set end date to end of day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && new Date(p.date) <= end;
        }

        return matchesSearch && matchesDate;
    });

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    // Stats Calculation
    const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPendingAll = customers.reduce((sum, c) => sum + c.pending, 0);

    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    const monthCollected = payments.filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const todayCollected = payments.filter(p => {
        const d = new Date(p.date);
        return d.getDate() === today.getDate() &&
            d.getMonth() === thisMonth &&
            d.getFullYear() === thisYear;
    }).reduce((sum, p) => sum + parseFloat(p.amount), 0);


    const handleDeletePayment = async (id) => {
        if (!window.confirm("Are you sure? This will reverse the payment from the customer's balance.")) return;

        try {
            // Using direct fetch since we might not have API client fully configures for this page yet or just inline it
            // Assuming API client is available or we use supabase directly? 
            // The controller is backend, so we MUST use API/fetch.
            // Using raw fetch for now as per existing pattern in AddPaymentModal (standardize later)
            const token = localStorage.getItem("token"); // Assuming auth
            const res = await fetch(`http://localhost:5000/api/payments/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token || ""}`,
                }
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("Payment deleted & reverted");
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete payment");
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6 font-inter relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-500/10 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full"></div>
            </div>

            <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">

                {/* Header & Stats */}
                <div className="flex flex-col xl:flex-row justify-between items-end gap-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-3">
                            <DollarSign className="text-emerald-400" size={32} /> Payments Center
                        </h1>
                        <p className="text-slate-400 mt-2 text-lg">Manage outstanding balances and record customer payments</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full xl:w-auto min-w-[800px]">
                        {activeTab === 'balances' ? (
                            <div className="glass-card p-6 rounded-2xl border-l-4 border-rose-500 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 blur-xl rounded-full group-hover:bg-rose-500/20 transition-all"></div>
                                <p className="text-slate-400 text-xs uppercase font-bold mb-2 tracking-wider">Total Outstanding</p>
                                <h2 className="text-4xl font-bold text-rose-400 drop-shadow-sm">₹{totalPendingAll.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h2>
                            </div>
                        ) : (
                            <>
                                <div className="glass-card p-6 rounded-2xl border-l-4 border-emerald-500 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-xl rounded-full group-hover:bg-emerald-500/20 transition-all"></div>
                                    <p className="text-emerald-400/80 text-xs uppercase font-bold mb-2 tracking-wider">Collected Today</p>
                                    <h2 className="text-3xl font-bold text-emerald-400">₹{todayCollected.toLocaleString('en-IN')}</h2>
                                </div>
                                <div className="glass-card p-6 rounded-2xl border-l-4 border-indigo-500 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 blur-xl rounded-full group-hover:bg-indigo-500/20 transition-all"></div>
                                    <p className="text-indigo-400/80 text-xs uppercase font-bold mb-2 tracking-wider">This Month</p>
                                    <h2 className="text-3xl font-bold text-indigo-400">₹{monthCollected.toLocaleString('en-IN')}</h2>
                                </div>
                                <div className="relative p-6 rounded-2xl shadow-xl overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-800 opacity-90"></div>
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                    <div className="relative z-10">
                                        <p className="text-emerald-100 text-xs uppercase font-bold mb-2 tracking-wider">Total Collected</p>
                                        <h2 className="text-3xl font-bold text-white">₹{totalCollected.toLocaleString('en-IN')}</h2>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* 🗂️ Tabs */}
                <div className="flex gap-8 border-b border-slate-700 px-4">
                    <button
                        onClick={() => setActiveTab("balances")}
                        className={`pb-4 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all ${activeTab === "balances"
                            ? "border-indigo-500 text-indigo-400"
                            : "border-transparent text-slate-500 hover:text-slate-300"
                            }`}
                    >
                        <User size={18} /> Customer Balances
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`pb-4 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all ${activeTab === "history"
                            ? "border-emerald-500 text-emerald-400"
                            : "border-transparent text-slate-500 hover:text-slate-300"
                            }`}
                    >
                        <DollarSign size={18} /> Payment History
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    {/* Search */}
                    <div className="glass-card p-1 rounded-xl flex items-center gap-3 flex-1 w-full border border-slate-700/50">
                        <div className="pl-3 text-slate-500">
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder={activeTab === 'balances' ? "Search customers by name or phone..." : "Search payments by amounts or reference..."}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent w-full outline-none text-white placeholder-slate-500 py-2.5 px-2"
                        />
                    </div>

                    {/* Date Filters (Only for History Tab) */}
                    {activeTab === 'history' && (
                        <div className="flex items-center gap-3 glass-card p-1.5 rounded-xl border border-slate-700/50 w-full md:w-auto overflow-x-auto">
                            <div className="flex items-center gap-2 px-3 border-r border-slate-700/50">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">From</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-transparent text-sm text-white outline-none [color-scheme:dark] font-medium"
                                />
                            </div>
                            <div className="flex items-center gap-2 px-3">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">To</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-transparent text-sm text-white outline-none [color-scheme:dark] font-medium"
                                />
                            </div>
                            {(startDate || endDate) && (
                                <button
                                    onClick={() => { setStartDate(""); setEndDate(""); }}
                                    className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition"
                                    title="Clear Dates"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="glass-card rounded-3xl overflow-hidden min-h-[500px] border border-slate-700/50">
                    {/* --- CUSTOMER BALANCES TAB --- */}
                    {activeTab === "balances" && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="p-5 pl-8">Customer</th>
                                        <th className="p-5 text-right">Total Billed</th>
                                        <th className="p-5 text-right">Pending Amount</th>
                                        <th className="p-5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30 text-sm">
                                    {filteredCustomers.length === 0 ? (
                                        <tr><td colSpan="4" className="p-20 text-center text-slate-500 opacity-60 text-lg">No customers found.</td></tr>
                                    ) : (
                                        filteredCustomers.map((cust) => (
                                            <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors group">
                                                <td className="p-5 pl-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 flex items-center justify-center font-bold shadow-sm ring-1 ring-inset ring-white/5">
                                                            {cust.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-200 text-base">{cust.name}</p>
                                                            <p className="text-xs text-slate-500 mt-0.5">{cust.phone || cust.email || "No contact info"}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right font-medium text-slate-300">
                                                    ₹{cust.totalBilled.toLocaleString('en-IN')}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <span className={`text-lg font-bold ${cust.pending > 1 ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'text-emerald-400'}`}>
                                                        ₹{cust.pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <button
                                                        onClick={() => setSelectedCustomerId(cust.id)}
                                                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 mx-auto"
                                                    >
                                                        <PlusCircle size={16} /> Record Pay
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* --- HISTORY TAB --- */}
                    {activeTab === "history" && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="p-5 pl-8">Customer</th>
                                        <th className="p-5">Date</th>
                                        <th className="p-5">Mode</th>
                                        <th className="p-5">Reference</th>
                                        <th className="p-5 text-right">Amount</th>
                                        <th className="p-5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30 text-sm">
                                    {filteredHistory.length === 0 ? (
                                        <tr><td colSpan="6" className="p-20 text-center text-slate-500 opacity-60 text-lg">No payment history found in this period.</td></tr>
                                    ) : (
                                        filteredHistory.map((pay) => (
                                            <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                                                <td className="p-5 pl-8 font-bold text-slate-200">
                                                    {pay.customers?.name || "Unknown"}
                                                </td>
                                                <td className="p-5 text-slate-400">
                                                    {new Date(pay.date).toLocaleDateString("en-IN", { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="p-5">
                                                    <span className="px-2.5 py-1 bg-slate-800/80 rounded-lg text-[10px] font-bold text-slate-300 uppercase border border-slate-700 tracking-wide">
                                                        {pay.payment_mode || "CASH"}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-slate-500 text-xs font-mono">
                                                    {pay.reference || "—"}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <span className="text-emerald-400 font-bold text-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                                                        ₹{pay.amount.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <button
                                                        onClick={() => handleDeletePayment(pay.id)}
                                                        className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                                                        title="Delete Payment Data"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            {/* Add Payment Modal */}
            {selectedCustomerId && (
                <AddPaymentModal
                    customerId={selectedCustomerId}
                    onClose={() => setSelectedCustomerId(null)}
                    onPaymentAdded={() => {
                        fetchData(); // Refresh data to see updated balance
                        setSelectedCustomerId(null);
                    }}
                />
            )}

        </div>
    );
}
