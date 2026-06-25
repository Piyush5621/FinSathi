import { useState, useEffect, useCallback } from 'react';
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import CustomerSection from "../../components/billing/CustomerSection";
import ItemAdder from "../../components/billing/ItemAdder";
import ItemTable from "../../components/billing/ItemTable";
import PaymentSection from "../../components/billing/PaymentSection";
import InvoicePreviewModal from "../../components/billing/InvoicePreviewModal";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import { CheckCircle, FileText, Zap, Clock, TrendingUp, MessageCircle } from 'lucide-react';
import logoImg from "../../assets/logo.svg";

export default function Billing() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [todayStats, setTodayStats] = useState({ invoices: 0, revenue: 0 });
  const [summaryValues, setSummaryValues] = useState({
    subtotal: 0,
    gst_amount: 0,
    discount_percent: 0,
    total: 0,
  });
  const [paymentDetails, setPaymentDetails] = useState({
    method: "cash",
    status: "unpaid",
    amountReceived: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [lastSavedInvoice, setLastSavedInvoice] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: customerData }, { data: salesData }] = await Promise.all([
        API.get("/customers"),
        API.get("/sales?limit=50")
      ]);
      setCustomers(customerData || []);

      // Today's stats
      const today = new Date().toISOString().split('T')[0];
      const todaySales = (salesData || []).filter(s => s.date?.startsWith(today) || s.created_at?.startsWith(today));
      setTodayStats({
        invoices: todaySales.length,
        revenue: todaySales.reduce((sum, s) => sum + Number(s.total || 0), 0)
      });

      const lastInvoice = salesData?.[0];
      setInvoiceNo(lastInvoice?.invoice_no || lastInvoice?.id ? `FS-${String(lastInvoice.id).slice(0, 8).toUpperCase()}` : "FS-NEW");
    } catch (err) {
      console.error(err);
    }
  };

  const updateTotals = useCallback((currentItems, discountPct = 0) => {
    const subtotal = currentItems.reduce((sum, item) => sum + item.amount, 0);
    const totalGST = currentItems.reduce((sum, item) => sum + (item.amount * (item.gst_percent || 0)) / 100, 0);
    const discountValue = (subtotal * (discountPct || 0)) / 100;
    setSummaryValues((prev) => ({ ...prev, subtotal, gst_amount: totalGST, total: subtotal + totalGST - discountValue, discount_percent: discountPct ?? prev.discount_percent }));
  }, []);

  const handleAddItem = useCallback((newItem) => {
    const item = { ...newItem, tableId: Date.now() + Math.random(), amount: newItem.price * newItem.quantity, gst_percent: newItem.gst_percent || 0 };
    setItems(prevItems => {
      const updatedItems = [item, ...prevItems];
      updateTotals(updatedItems, summaryValues.discount_percent);
      return updatedItems;
    });
  }, [summaryValues.discount_percent, updateTotals]);

  const handleRemoveItem = useCallback((itemId) => {
    setItems(prevItems => {
      const updatedItems = prevItems.filter((item) => item.tableId !== itemId && item.id !== itemId);
      updateTotals(updatedItems, summaryValues.discount_percent);
      return updatedItems;
    });
  }, [summaryValues.discount_percent, updateTotals]);

  const handleSaveInvoice = async () => {
    if (items.length === 0) return toast.error("Cart is empty!");
    if (!selectedCustomer) return toast.error("Please select a customer first.");
    setIsSaving(true);
    try {
      const payload = {
        customer_id: selectedCustomer,
        items: items.map(i => ({
          productId: i.id,
          quantity: i.quantity,
          price: i.price,
          product_name: i.name
        })),
        subtotal: summaryValues.subtotal,
        tax_amount: summaryValues.gst_amount,
        discount_percent: summaryValues.discount_percent,
        total: summaryValues.total,
        payment_method: paymentDetails.method,
        payment_status: paymentDetails.status,
        amount_paid: paymentDetails.amountReceived,
        notes: notes,
      };
      const response = await API.post("/sales", payload);

      const savedInvoice = {
        ...payload,
        id: response.data.id,
        invoiceNo: response.data.invoice_no || `FS-${response.data.id}`,
        customer: customers.find((c) => c.id === selectedCustomer)
      };

      setLastSavedInvoice(savedInvoice);
      setShowPreview(true);

      // Update today's stats
      setTodayStats(prev => ({
        invoices: prev.invoices + 1,
        revenue: prev.revenue + summaryValues.total
      }));

      // Reset form
      setItems([]);
      setNotes("");
      updateTotals([], 0);
      setInvoiceNo(`FS-${response.data.id + 1}`);
      toast.success("Invoice generated successfully!");
    } catch {
      toast.error("Error saving invoice");
    } finally {
      setIsSaving(false);
    }
  };

  // WhatsApp share function
  const handleWhatsAppShare = () => {
    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer?.phone) return toast.error("Customer has no phone number saved.");
    if (items.length === 0) return toast.error("Add items to cart first.");
    const itemLines = items.map(i => `• ${i.name} x${i.quantity} = ₹${i.amount.toFixed(0)}`).join('\n');
    const message = encodeURIComponent(
      `🧾 *Invoice from [Your Business]*\n\n${itemLines}\n\n` +
      `Subtotal: ₹${summaryValues.subtotal.toFixed(0)}\n` +
      `GST: ₹${summaryValues.gst_amount.toFixed(0)}\n` +
      `*Total: ₹${summaryValues.total.toFixed(0)}*\n\n` +
      `Payment: ${paymentDetails.method.toUpperCase()} • ${paymentDetails.status.toUpperCase()}\n\n` +
      `Powered by FinSathi`
    );
    window.open(`https://wa.me/91${customer.phone}?text=${message}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip icon={<FileText size={13} className="text-indigo-500" />} label="Today's Invoices" value={todayStats.invoices} />
        <StatChip icon={<TrendingUp size={13} className="text-emerald-500" />} label="Today's Revenue" value={`₹${todayStats.revenue.toLocaleString('en-IN')}`} />
        <StatChip icon={<Clock size={13} className="text-amber-500" />} label="Cart Items" value={items.length} />
        <StatChip icon={<Zap size={13} className="text-brand-blue" />} label="Cart Total" value={`₹${summaryValues.total.toFixed(0)}`} highlight />
      </div>

      {/* Main Billing Layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* LEFT SIDE: Customer, Product, Items */}
        <div className="flex-1 flex flex-col gap-5">
          <Card noPadding className="border border-slate-100 rounded-[20px] overflow-hidden bg-white shadow-sm">
            {/* Invoice Header */}
            <div className="p-5 bg-[#090D16] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  <img src={logoImg} alt="FinSathi" className="w-full h-full object-contain p-0.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">New Invoice</h2>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                    {invoiceNo || 'Auto-assigned on save'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Date</p>
                <p className="text-[11px] font-bold text-slate-300 mt-0.5">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Customer Selector */}
            <div className="p-5 bg-white text-slate-800 border-b border-slate-100">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Select Customer</label>
               <CustomerSection customers={customers} selectedCustomer={selectedCustomer} onCustomerSelect={setSelectedCustomer} />
            </div>

            {/* Item Adder */}
            <div className="p-5 bg-slate-50/50 border-b border-slate-100">
              <ItemAdder onAddItem={handleAddItem} />
            </div>

            {/* Item Table */}
            <div className="p-0">
              <ItemTable items={items} onRemoveItem={handleRemoveItem} onEditItem={() => {}} />
            </div>

            {/* Notes field */}
            <div className="p-5 border-t border-slate-100 bg-white">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Invoice Notes (optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Payment due in 7 days. Thank you for your business."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue resize-none transition-all"
              />
            </div>
          </Card>
        </div>

        {/* RIGHT SIDE: Summary & Payment */}
        <div className="w-full lg:w-[340px] flex flex-col gap-4 shrink-0">
          
          {/* Invoice Summary */}
          <Card className="flex flex-col gap-4 p-5 border border-slate-100 shadow-sm rounded-[20px]">
            <CardTitle className="text-xs font-bold text-slate-900">Invoice Summary</CardTitle>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                 <span className="text-slate-400">Subtotal</span>
                 <span className="text-slate-800 font-semibold">₹{summaryValues.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                 <span className="text-slate-400">Total GST</span>
                 <span className="text-slate-800 font-semibold">₹{summaryValues.gst_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-y border-slate-100">
                 <span className="text-xs text-brand-blue font-bold">Discount %</span>
                 <input 
                   type="number" 
                   min="0"
                   max="100"
                   className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-right text-xs font-semibold focus:ring-2 focus:ring-brand-blue/20 outline-none" 
                   value={summaryValues.discount_percent} 
                   onChange={(e) => {
                     const discPct = parseFloat(e.target.value) || 0;
                     updateTotals(items, discPct);
                  }} 
                 />
              </div>
              <div className="flex justify-between items-center pt-1">
                 <span className="text-xs font-bold text-slate-900">Grand Total</span>
                 <span className="text-2xl font-extrabold tracking-tight text-slate-900">₹{summaryValues.total.toFixed(0)}</span>
              </div>
            </div>
          </Card>

          {/* Payment Section */}
          <Card className="border border-slate-100 shadow-sm p-0 rounded-[20px] overflow-hidden">
             <PaymentSection 
                method={paymentDetails.method} 
                status={paymentDetails.status} 
                amountReceived={paymentDetails.amountReceived}
                total={summaryValues.total}
                onChange={(k, v) => setPaymentDetails(p => ({ ...p, [k]: v }))} 
              />
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={handleSaveInvoice} 
              disabled={isSaving}
              className="w-full text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              icon={<CheckCircle size={15} />}
            >
               {isSaving ? "Saving Invoice..." : "Generate Invoice"}
            </Button>
            
            <button
              onClick={handleWhatsAppShare}
              disabled={items.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <MessageCircle size={14} />
              Share via WhatsApp
            </button>
          </div>

          {/* Quick Help Tip */}
          <div className="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-xl text-[10px] text-indigo-700 font-semibold leading-relaxed">
            💡 <strong>Tip:</strong> Set status to <em>Partial</em> to record a partial payment and track the remaining balance in the customer ledger.
          </div>
        </div>

        {showPreview && (
          <InvoicePreviewModal 
             invoice={lastSavedInvoice} 
             onClose={() => setShowPreview(false)} 
          />
        )}
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, highlight }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-[16px] border ${highlight ? 'bg-brand-blue border-brand-blue/10 text-white' : 'bg-white border-slate-100'}`}>
      <div className={`p-1.5 rounded-lg shrink-0 ${highlight ? 'bg-white/15' : 'bg-slate-50'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[9px] font-bold uppercase tracking-widest truncate ${highlight ? 'text-white/70' : 'text-slate-400'}`}>{label}</p>
        <p className={`text-sm font-black tracking-tight ${highlight ? 'text-white' : 'text-slate-800'}`}>{value}</p>
      </div>
    </div>
  );
}
