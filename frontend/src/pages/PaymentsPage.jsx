import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Search, DollarSign, User, Trash2, PlusCircle } from "lucide-react";
import AddPaymentModal from "../components/AddPaymentModal";
import API from "../services/apiClient";
import { toast } from "react-hot-toast";
import { Card } from "../components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "../components/ui/Table";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export default function PaymentsPage() {
    const [activeTab, setActiveTab] = useState("balances");
    const [payments, setPayments] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
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
                        const total = Number(s.total) || 0;
                        let paid = Number(s.amount_paid) || 0;
                        if (s.payment_status === 'paid' && paid === 0) {
                            paid = total;
                        }
                        const due = total - paid;
                        return sum + (due > 0.01 ? due : 0);
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

    const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPendingAll = customers.reduce((sum, c) => sum + c.pending, 0);

    const handleDeletePayment = async (id) => {
        if (!window.confirm("Are you sure? This will reverse the payment from the customer's balance.")) return;
        try {
            const res = await API.delete(`/payments/${id}`);
            if (res.status !== 200) throw new Error("Failed to delete");
            toast.success("Payment deleted & reverted");
            fetchData();
        } catch (err) {
            toast.error("Failed to delete payment");
        }
    };

    return (
        <div className="space-y-[32px] animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[16px]">
                <div>
                    <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-[8px]">
                        <DollarSign size={24} className="text-[#3B82F6]" /> Payments Center
                    </h1>
                    <p className="text-[14px] text-[#64748B] mt-[4px]">Manage outstanding balances and record customer payments.</p>
                </div>
                
                {/* Stats */}
                <div className="flex gap-[16px]">
                    {activeTab === 'balances' ? (
                       <div className="bg-[#FEF2F2] border border-[#FECACA] px-[24px] py-[12px] rounded-xl flex flex-col items-end">
                           <span className="text-[11px] font-bold text-[#DC2626] uppercase">Total Outstanding</span>
                           <span className="text-[20px] font-bold text-[#991B1B]">₹{totalPendingAll.toLocaleString()}</span>
                       </div>
                    ) : (
                       <div className="bg-[#F0FDF4] border border-[#BBF7D0] px-[24px] py-[12px] rounded-xl flex flex-col items-end">
                           <span className="text-[11px] font-bold text-[#16A34A] uppercase">Total Collected</span>
                           <span className="text-[20px] font-bold text-[#15803D]">₹{totalCollected.toLocaleString()}</span>
                       </div>
                    )}
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-[24px] border-b border-[#E2E8F0]">
                <button
                    onClick={() => setActiveTab("balances")}
                    className={`pb-[12px] text-[14px] font-semibold border-b-2 transition-all flex items-center gap-[8px] ${
                        activeTab === "balances" ? "border-[#3B82F6] text-[#3B82F6]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                    }`}
                >
                    <User size={18} /> Customer Balances
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`pb-[12px] text-[14px] font-semibold border-b-2 transition-all flex items-center gap-[8px] ${
                        activeTab === "history" ? "border-[#3B82F6] text-[#3B82F6]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                    }`}
                >
                    <DollarSign size={18} /> Payment History
                </button>
            </div>

            {/* FILTERS */}
            <div className="flex flex-col md:flex-row gap-[16px] items-center">
                <Input 
                   placeholder={activeTab === 'balances' ? "Search customers..." : "Search payments..."} 
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="w-full md:w-[400px]"
                />
                
                {activeTab === 'history' && (
                    <div className="flex gap-[12px] items-end">
                        <Input type="date" label="From" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <Input type="date" label="To" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        {(startDate || endDate) && (
                            <Button variant="ghost" onClick={() => { setStartDate(""); setEndDate(""); }}>
                                Clear
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* DATA */}
            <Card noPadding>
                {activeTab === "balances" ? (
                    <Table>
                        <Thead>
                            <tr>
                                <Th>Customer</Th>
                                <Th className="text-right">Total Billed</Th>
                                <Th className="text-right">Pending Amount</Th>
                                <Th className="text-center">Action</Th>
                            </tr>
                        </Thead>
                        <Tbody>
                            {filteredCustomers.length === 0 ? (
                                <Tr><Td colSpan="4" className="text-center text-[#64748B] py-[24px]">No customers found.</Td></Tr>
                            ) : (
                                filteredCustomers.map((cust) => (
                                    <Tr key={cust.id}>
                                        <Td>
                                            <p className="font-bold text-[#0F172A]">{cust.name}</p>
                                            <p className="text-[12px] text-[#64748B]">{cust.phone || cust.email || "No contact info"}</p>
                                        </Td>
                                        <Td className="text-right">₹{cust.totalBilled.toLocaleString()}</Td>
                                        <Td className="text-right">
                                            <span className={`font-bold ${cust.pending > 1 ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
                                                ₹{cust.pending.toLocaleString()}
                                            </span>
                                        </Td>
                                        <Td className="text-center">
                                            {cust.pending > 0 && (
                                                <Button onClick={() => setSelectedCustomerId(cust.id)} icon={<PlusCircle size={16} />}>
                                                    Collect
                                                </Button>
                                            )}
                                        </Td>
                                    </Tr>
                                ))
                            )}
                        </Tbody>
                    </Table>
                ) : (
                    <Table>
                        <Thead>
                            <tr>
                                <Th>Customer</Th>
                                <Th>Date</Th>
                                <Th>Mode</Th>
                                <Th>Reference</Th>
                                <Th className="text-right">Amount</Th>
                                <Th className="text-center">Action</Th>
                            </tr>
                        </Thead>
                        <Tbody>
                            {filteredHistory.length === 0 ? (
                                <Tr><Td colSpan="6" className="text-center text-[#64748B] py-[24px]">No payment history found.</Td></Tr>
                            ) : (
                                filteredHistory.map((pay) => (
                                    <Tr key={pay.id}>
                                        <Td className="font-bold text-[#0F172A]">{pay.customers?.name || "Unknown"}</Td>
                                        <Td className="text-[#64748B]">
                                            {new Date(pay.date).toLocaleDateString()}
                                        </Td>
                                        <Td>
                                            <span className="px-[8px] py-[4px] bg-[#F1F5F9] rounded text-[10px] font-bold text-[#64748B] uppercase">
                                                {pay.payment_mode || "CASH"}
                                            </span>
                                        </Td>
                                        <Td className="text-[#64748B] font-mono text-[13px]">{pay.reference || "—"}</Td>
                                        <Td className="text-right font-bold text-[#15803D]">
                                            ₹{pay.amount.toFixed(2)}
                                        </Td>
                                        <Td className="text-center">
                                            <button
                                                onClick={() => handleDeletePayment(pay.id)}
                                                className="p-[8px] text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEE2E2] rounded-lg transition"
                                                title="Reverse Payment"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </Td>
                                    </Tr>
                                ))
                            )}
                        </Tbody>
                    </Table>
                )}
            </Card>

            {selectedCustomerId && (
                <AddPaymentModal
                    customerId={selectedCustomerId}
                    onClose={() => setSelectedCustomerId(null)}
                    onPaymentAdded={() => {
                        fetchData();
                        setSelectedCustomerId(null);
                    }}
                />
            )}
        </div>
    );
}
