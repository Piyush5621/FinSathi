import React, { useState } from "react";
import { DollarSign, Calendar, CreditCard, FileText, CheckCircle } from "lucide-react";
import API from "../services/apiClient";
import toast from "react-hot-toast";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

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
        <Modal isOpen={true} onClose={onClose} title="Record Payment">
            <form onSubmit={handleSubmit} className="space-y-[16px]">
                <Input 
                    label="Payment Amount (₹)" 
                    type="number" 
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
                        <label className="text-[13px] font-semibold text-[#64748B]">Mode</label>
                        <div className="relative">
                            <select
                                value={mode}
                                onChange={(e) => setMode(e.target.value)}
                                className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all appearance-none"
                            >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
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
                    placeholder="Transaction ID, Cheque No, etc." 
                    value={reference} 
                    onChange={(e) => setReference(e.target.value)} 
                />

                <div className="bg-[#DBEAFE] p-[12px] rounded-lg border border-[#BFDBFE] flex gap-[12px]">
                    <div className="mt-[2px]"><CheckCircle size={16} className="text-[#2563EB]" /></div>
                    <p className="text-[12px] text-[#1D4ED8] font-medium leading-tight">
                        This payment will be automatically applied to the oldest unpaid invoices first (FIFO principle).
                    </p>
                </div>

                <div className="flex justify-end gap-[12px] pt-[8px]">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading} icon={<DollarSign size={16} />}>
                        {loading ? "Processing..." : "Save Payment"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
