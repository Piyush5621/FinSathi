import React, { useState } from "react";
import { X, DollarSign, Calendar, CreditCard, FileText, CheckCircle } from "lucide-react";
import API from "../services/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function AddPaymentModal({ customerId, onClose, onPaymentAdded }) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [mode, setMode] = useState("cash");
    const [reference, setReference] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            return toast.error("Please enter a valid amount");
        }

        setLoading(true);
        try {
            await API.post("/payments/add", {
                customer_id: customerId,
                amount,
                date,
                payment_mode: mode,
                reference,
            });

            toast.success("Payment recorded successfully!");
            onPaymentAdded();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || err.message || "Failed to add payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 font-inter">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0f172a] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700 relative"
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 p-6 flex justify-between items-center text-white border-b border-white/5 relative z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <DollarSign size={20} className="text-emerald-400" />
                        </div>
                        Record Payment
                    </h2>
                    <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 relative z-10">

                    {/* Amount */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Amount (₹)</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-3.5 text-emerald-500 font-bold text-lg">₹</span>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none text-2xl font-bold text-white placeholder-slate-600 transition-all custom-spin-button"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        {/* Date */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 text-slate-500" size={16} />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm text-slate-200"
                                />
                            </div>
                        </div>

                        {/* Mode */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mode</label>
                            <div className="relative">
                                <select
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value)}
                                    className="w-full pl-3 pr-9 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm text-slate-200 appearance-none"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                                <CreditCard className="absolute right-3 top-3 text-slate-500 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Reference */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Reference / Note</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Transaction ID, Cheque No, etc."
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm text-slate-200 placeholder-slate-600"
                            />
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 flex gap-3">
                        <div className="mt-0.5"><CheckCircle size={16} className="text-indigo-400" /></div>
                        <p className="text-xs text-indigo-300 leading-relaxed font-medium">
                            This payment will be automatically applied to the oldest unpaid invoices first (FIFO principle).
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center gap-2"
                        >
                            {loading ? "Processing..." : "Save Payment"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
