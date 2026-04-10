import {  useEffect, useState, useMemo  } from 'react';
import { supabase } from "../../lib/supabaseClient";
import { Search, Edit3, Printer, FileText, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import InvoicePreviewModal from "../../components/billing/InvoicePreviewModal";
import InvoiceEditorModal from "../Billing/InvoiceEditorModal";
import { Card } from "../../components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";

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
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

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

  const handleModifyInvoice = async (invoiceId) => {
    try {
      const { data, error } = await supabase.from("sales").select("*").eq("id", invoiceId).single();
      if (error) throw error;
      setEditingInvoice(data);
    } catch (err) {
      toast.error("Failed to load invoice for edit");
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm("Are you sure you want to delete this invoice? This action will restore inventory stock.")) return;
    try {
      await API.delete(`/sales/${invoiceId}`);
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete invoice");
    }
  };

  const stats = useMemo(() => {
    const total = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidCount = filteredInvoices.filter(inv => inv.payment_status === 'paid').length;
    const unpaidCount = filteredInvoices.filter(inv => inv.payment_status !== 'paid').length;
    return { total, paidCount, unpaidCount };
  }, [filteredInvoices]);

  return (
    <div className="space-y-[32px] animate-fade-in-up">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-[16px]">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-[8px]">
            <FileText size={24} className="text-[#3B82F6]" /> Invoice History
          </h1>
          <p className="text-[14px] text-[#64748B] mt-[4px]">View, search, and manage all past transactions.</p>
        </div>

        <div className="flex gap-[16px] w-full xl:w-auto">
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] px-[24px] py-[12px] rounded-xl flex flex-col items-end flex-1 xl:flex-none">
             <span className="text-[11px] font-bold text-[#2563EB] uppercase">Total Volume</span>
             <span className="text-[20px] font-bold text-[#1E3A8A]">₹{stats.total.toLocaleString()}</span>
          </div>
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] px-[24px] py-[12px] rounded-xl flex flex-col items-end flex-1 xl:flex-none">
             <span className="text-[11px] font-bold text-[#16A34A] uppercase">Paid</span>
             <span className="text-[20px] font-bold text-[#15803D]">{stats.paidCount}</span>
          </div>
          <div className="bg-[#FEF2F2] border border-[#FECACA] px-[24px] py-[12px] rounded-xl flex flex-col items-end flex-1 xl:flex-none">
             <span className="text-[11px] font-bold text-[#DC2626] uppercase">Pending</span>
             <span className="text-[20px] font-bold text-[#991B1B]">{stats.unpaidCount}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-[16px] items-center">
        <Input 
          placeholder="Search invoice # or customer..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-[400px]"
        />
        <Input 
          type="date" 
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full md:w-[200px]"
        />
      </div>

      <Card noPadding>
        <Table>
          <Thead>
            <tr>
              <Th>Invoice #</Th>
              <Th>Customer</Th>
              <Th>Date & Time</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-center">Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan="6" className="text-center text-[#64748B] py-[24px]">Loading invoices...</Td></Tr>
            ) : filteredInvoices.length === 0 ? (
              <Tr><Td colSpan="6" className="text-center text-[#64748B] py-[24px]">No invoices found.</Td></Tr>
            ) : (
              filteredInvoices.map((inv) => (
                <Tr key={inv.id}>
                  <Td className="font-mono text-[#3B82F6] font-medium">{inv.invoice_no || `FS-${inv.id}`}</Td>
                  <Td className="font-bold text-[#0F172A]">{inv.customers?.name || "Unknown"}</Td>
                  <Td>
                    <div className="text-[#334155]">{new Date(inv.date).toLocaleDateString()}</div>
                    <div className="text-[12px] text-[#64748B]">{new Date(inv.date).toLocaleTimeString()}</div>
                  </Td>
                  <Td className="text-right font-bold text-[#0F172A]">₹{inv.total?.toLocaleString()}</Td>
                  <Td className="text-center">
                    <Badge variant={inv.payment_status === "paid" ? "success" : "danger"}>
                       {inv.payment_status === "paid" ? "PAID" : "PENDING"}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-[8px]">
                      <button onClick={() => handleModifyInvoice(inv.id)} className="p-[6px] text-[#64748B] hover:text-[#3B82F6] hover:bg-[#F8FAFC] rounded-md transition-colors" title="Modify">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => setPreviewInvoice(inv)} className="p-[6px] text-[#64748B] hover:text-[#10B981] hover:bg-[#F8FAFC] rounded-md transition-colors" title="Print">
                        <Printer size={16} />
                      </button>
                      <button onClick={() => handleDeleteInvoice(inv.id)} className="p-[6px] text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEE2E2] rounded-md transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Card>

      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

      {editingInvoice && (
        <InvoiceEditorModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={fetchInvoices}
        />
      )}
    </div>
  );
}
