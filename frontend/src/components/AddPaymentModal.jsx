import { useState } from 'react';
import { DollarSign, CreditCard, CheckCircle, MessageCircle, ArrowRight, Printer, AlertCircle } from 'lucide-react';
import API from "../services/apiClient";
import toast from "react-hot-toast";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

/**
 * Standardized Canonical AddPaymentModal
 * Used across Customer Registry, Customer Profile, and Ledger views.
 * Dispatches repayments to the canonical endpoint, displays structured receipts,
 * and allows 1-click sharing of receipts via WhatsApp.
 */
export default function AddPaymentModal({ 
    customerId, 
    customerName, 
    customerPhone, 
    outstandingDue = 0, 
    onClose, 
    onPaymentAdded 
}) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [mode, setMode] = useState("cash");
    const [reference, setReference] = useState("");
    const [loading, setLoading] = useState(false);
    const [receiptData, setReceiptData] = useState(null);

    const dueAmount = Number(outstandingDue || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payVal = parseFloat(amount);
        if (isNaN(payVal) || payVal <= 0) {
            return toast.error("Please enter a valid positive repayment amount");
        }

        if (dueAmount > 0 && payVal > dueAmount + 0.01) {
            return toast.error(`Payment cannot exceed outstanding balance of ₹${dueAmount.toLocaleString('en-IN')}`);
        }

        setLoading(true);
        try {
            // Generate idempotency key for this submission
            const idempotencyKey = `PAY-${customerId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            
            const endpoint = customerId ? `/customers/${customerId}/payments` : "/payments/add";
            const payload = {
                customer_id: customerId,
                amount: payVal,
                date,
                payment_method: mode,
                payment_mode: mode,
                reference: reference ? reference.trim() : null,
                idempotency_key: idempotencyKey
            };

            const res = await API.post(endpoint, payload);

            toast.success("Payment recorded successfully! 💰");
            
            if (res.data?.receipt) {
                setReceiptData(res.data.receipt);
            } else {
                setReceiptData({
                    receiptNo: `REC-${Date.now().toString().slice(-6)}`,
                    amountPaid: payVal,
                    previousBalance: dueAmount,
                    remainingBalance: Math.max(0, dueAmount - payVal),
                    customerName: customerName || "Customer",
                    customerPhone: customerPhone || "",
                    paymentMethod: mode,
                    date
                });
            }

            if (onPaymentAdded) onPaymentAdded();
        } catch (err) {
            console.error("Record payment error:", err);
            toast.error(err.response?.data?.error || err.message || "Failed to record payment");
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppShare = () => {
        if (!receiptData) return;
        const phone = receiptData.customerPhone || customerPhone || "";
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        
        const message = `*Payment Receipt - Karobar*\n` +
            `Receipt No: ${receiptData.receiptNo}\n` +
            `Date: ${new Date(receiptData.date).toLocaleDateString('en-IN')}\n` +
            `Dear ${receiptData.customerName || customerName || 'Customer'},\n` +
            `We have received your payment of *₹${Number(receiptData.amountPaid).toLocaleString('en-IN')}* via ${receiptData.paymentMethod.toUpperCase()}.\n` +
            `Remaining Outstanding Balance: *₹${Number(receiptData.remainingBalance).toLocaleString('en-IN')}*\n\n` +
            `Thank you for your business!`;

        const waUrl = formattedPhone 
            ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;

        window.open(waUrl, "_blank", "noopener,noreferrer");
    };

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={receiptData ? "Payment Receipt" : `Record Repayment: ${customerName || 'Customer'}`}
        >
            {receiptData ? (
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle size={24} />
                        </div>
                        <h4 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">Payment Recorded Successfully!</h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">Receipt #{receiptData.receiptNo}</p>
                    </div>

                    <div className="bg-app-surface-subtle p-4 rounded-xl border border-app-border space-y-2.5 text-xs">
                        <div className="flex justify-between text-app-muted">
                            <span>Customer:</span>
                            <span className="font-semibold text-app-text">{receiptData.customerName || customerName || "Customer"}</span>
                        </div>
                        <div className="flex justify-between text-app-muted">
                            <span>Amount Paid:</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">₹{Number(receiptData.amountPaid).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-app-muted">
                            <span>Payment Mode:</span>
                            <span className="font-bold text-app-text uppercase">{receiptData.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between text-app-muted border-t border-app-border pt-2">
                            <span>Remaining Outstanding:</span>
                            <span className={`font-mono font-bold ${receiptData.remainingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                ₹{Number(receiptData.remainingBalance).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button 
                            type="button" 
                            onClick={handleWhatsAppShare}
                            className="flex-1 bg-[#128C7E] hover:bg-[#075E54] text-white flex items-center justify-center gap-2 py-2 font-bold"
                        >
                            <MessageCircle size={16} />
                            Share on WhatsApp
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose}
                            className="px-6 py-2"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Current Outstanding Due Notice */}
                    {dueAmount > 0 ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Current Outstanding Due</span>
                                <span className="text-lg font-black font-mono text-amber-900 dark:text-amber-200">₹{dueAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setAmount(dueAmount.toString())}
                                className="text-xs py-1 px-3 bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 font-bold"
                            >
                                Pay Full (₹{dueAmount.toLocaleString('en-IN')})
                            </Button>
                        </div>
                    ) : (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                            <span>This customer has ₹0 outstanding debt. Account is fully settled.</span>
                        </div>
                    )}

                    <Input 
                        label="Payment Amount (₹) *" 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        required 
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input 
                            label="Payment Date *" 
                            type="date" 
                            value={date} 
                            onChange={(e) => setDate(e.target.value)} 
                            required 
                        />
                        
                        <div className="flex flex-col gap-1">
                            <label className="text-[12px] font-semibold text-app-text-muted">Payment Mode</label>
                            <div className="relative">
                                <select
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value)}
                                    className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none font-medium"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI / QR</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                                <CreditCard className="absolute right-3 top-2.5 text-app-muted pointer-events-none" size={14} />
                            </div>
                        </div>
                    </div>

                    <Input 
                        label="Reference / Transaction Note" 
                        type="text" 
                        placeholder="UPI UTR, check number, or receipt note" 
                        value={reference} 
                        onChange={(e) => setReference(e.target.value)} 
                    />

                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800 flex gap-2.5">
                        <CheckCircle size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                            Repayment is automatically allocated to the oldest unpaid invoices first (FIFO principle) and updates the customer Khata balance via concurrency-safe OCC locks.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading} 
                            icon={<DollarSign size={15} />} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            {loading ? "Recording..." : "Confirm Payment"}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
