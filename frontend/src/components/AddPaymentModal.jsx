import { useState } from 'react';
import { DollarSign, CreditCard, CheckCircle, MessageCircle, ArrowRight, Printer } from 'lucide-react';
import API from "../services/apiClient";
import toast from "react-hot-toast";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

export default function AddPaymentModal({ customerId, customerName, customerPhone, outstandingDue = 0, onClose, onPaymentAdded }) {
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
            return toast.error("Please enter a valid positive payment amount");
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
                reference,
                idempotency_key: idempotencyKey
            };

            const res = await API.post(endpoint, payload);

            toast.success("Payment recorded successfully!");
            
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
            console.error(err);
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
        <Modal isOpen={true} onClose={onClose} title={receiptData ? "Payment Receipt" : "Record Customer Repayment"}>
            {receiptData ? (
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle size={24} />
                        </div>
                        <h4 className="text-lg font-bold text-emerald-900">Payment Recorded!</h4>
                        <p className="text-xs text-emerald-700 font-mono mt-0.5">Receipt: {receiptData.receiptNo}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Customer:</span>
                            <span className="font-semibold text-slate-900">{receiptData.customerName || customerName || "Customer"}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>Amount Paid:</span>
                            <span className="font-black text-emerald-600">₹{Number(receiptData.amountPaid).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>Payment Method:</span>
                            <span className="font-medium text-slate-800 uppercase text-xs">{receiptData.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2">
                            <span>Remaining Outstanding:</span>
                            <span className={`font-bold ${receiptData.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                ₹{Number(receiptData.remainingBalance).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button 
                            type="button" 
                            onClick={handleWhatsAppShare}
                            className="flex-1 bg-[#128C7E] hover:bg-[#075E54] text-white flex items-center justify-center gap-2 py-2.5"
                        >
                            <MessageCircle size={18} />
                            Share Receipt on WhatsApp
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose}
                            className="px-6 py-2.5"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-[16px]">
                    {dueAmount > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Current Outstanding Due</span>
                                <span className="text-lg font-black text-amber-900">₹{dueAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setAmount(dueAmount.toString())}
                                className="text-xs py-1 px-3 bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
                            >
                                Pay Full (₹{dueAmount.toLocaleString('en-IN')})
                            </Button>
                        </div>
                    )}

                    <Input 
                        label="Payment Amount (₹)" 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        required 
                    />

                    <div className="grid grid-cols-2 gap-[16px]">
                        <Input 
                            label="Date" 
                            type="date" 
                            value={date} 
                            onChange={(e) => setDate(e.target.value)} 
                            required 
                        />
                        
                        <div className="flex flex-col gap-[4px]">
                            <label className="text-[13px] font-semibold text-[#64748B]">Payment Mode</label>
                            <div className="relative">
                                <select
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value)}
                                    className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all appearance-none"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI / QR</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                                <CreditCard className="absolute right-[12px] top-[12px] text-[#64748B] pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>

                    <Input 
                        label="Reference / Note" 
                        type="text" 
                        placeholder="UPI ref, transaction ID, or remark" 
                        value={reference} 
                        onChange={(e) => setReference(e.target.value)} 
                    />

                    <div className="bg-[#DBEAFE] p-[12px] rounded-lg border border-[#BFDBFE] flex gap-[12px]">
                        <div className="mt-[2px]"><CheckCircle size={16} className="text-[#2563EB]" /></div>
                        <p className="text-[12px] text-[#1D4ED8] font-medium leading-tight">
                            Payment is automatically allocated to the oldest unpaid invoices first (FIFO principle) and safely decreases Khata balance.
                        </p>
                    </div>

                    <div className="flex justify-end gap-[12px] pt-[8px]">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} icon={<DollarSign size={16} />} className="bg-indigo-600 hover:bg-indigo-700">
                            {loading ? "Processing..." : "Record Payment"}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
