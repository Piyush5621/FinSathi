import {  useState, useEffect  } from 'react';
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import API from "../../services/apiClient";
import CustomerSection from "../../components/billing/CustomerSection";
import ItemAdder from "../../components/billing/ItemAdder";
import ItemTable from "../../components/billing/ItemTable";
import PaymentSection from "../../components/billing/PaymentSection";
import InvoicePreviewModal from "../../components/billing/InvoicePreviewModal";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import { CheckCircle } from 'lucide-react';

export default function Billing() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
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
      const { data: customerData } = await supabase.from("customers").select("*").order("id");
      setCustomers(customerData || []);
      const { data: inventoryData } = await supabase.from("inventory").select("*, inventory_batches(*)").order("id");
      setProducts(inventoryData || []);
      const { data: lastInvoice } = await supabase.from("sales").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
      setInvoiceNo(lastInvoice?.id ? `FS-${lastInvoice.id + 1}` : "FS-1");
    } catch {}
  };

  const handleAddItem = (newItem) => {
    const item = { ...newItem, tableId: Date.now() + Math.random(), amount: newItem.price * newItem.quantity, gst_percent: newItem.gst_percent || 0 };
    const updatedItems = [item, ...items];
    setItems(updatedItems);
    updateTotals(updatedItems);
  };

  const handleRemoveItem = (itemId) => {
    const updatedItems = items.filter((item) => item.tableId !== itemId && item.id !== itemId);
    setItems(updatedItems);
    updateTotals(updatedItems);
  };

  const updateTotals = (currentItems) => {
    const subtotal = currentItems.reduce((sum, item) => sum + item.amount, 0);
    const totalGST = currentItems.reduce((sum, item) => sum + (item.amount * (item.gst_percent || 0)) / 100, 0);
    const discountValue = (subtotal * (summaryValues.discount_percent || 0)) / 100;
    setSummaryValues((prev) => ({ ...prev, subtotal, gst_amount: totalGST, total: subtotal + totalGST - discountValue }));
  };

  const handleSaveInvoice = async () => {
    if (items.length === 0) return toast.error("Cart is empty!");
    if (!selectedCustomer) return toast.error("Please select a customer first.");
    setIsSaving(true);
    try {
      const payload = {
        customer_id: selectedCustomer,
        items,
        subtotal: summaryValues.subtotal,
        tax_amount: summaryValues.gst_amount,
        discount_percent: summaryValues.discount_percent,
        total: summaryValues.total,
        payment_method: paymentDetails.method,
        payment_status: paymentDetails.status,
      };
      const response = await API.post("/sales", payload);
      setLastSavedInvoice({
        ...payload,
        id: response.data.id,
        invoiceNo: `FS-${response.data.id}`,
        customer: customers.find((c) => c.id === Number(selectedCustomer))
      });
      setShowPreview(true);
      setItems([]);
      updateTotals([]);
      setInvoiceNo(`FS-${response.data.id + 1}`);
    } catch {
      toast.error("Error saving invoice");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-[24px]">
      
      {/* LEFT SIDE: Customer, Product, Items */}
      <div className="flex-1 flex flex-col gap-[24px]">
        <Card noPadding>
          <div className="p-[20px] bg-brand-navy rounded-t-xl text-white">
            <h2 className="text-[18px] font-bold">New Sale</h2>
            <p className="text-[13px] text-slate-300">Invoice: {invoiceNo}</p>
          </div>
          <div className="p-[20px] bg-white text-text-main border-b border-gray-100">
             <label className="text-[13px] font-bold text-text-main mb-[8px] block">Select Customer</label>
             <CustomerSection customers={customers} selectedCustomer={selectedCustomer} onCustomerSelect={setSelectedCustomer} />
          </div>
          <div className="p-[20px] bg-gray-50 border-b border-gray-200">
            <ItemAdder products={products} onAddItem={handleAddItem} />
          </div>
          <div className="p-[0px]">
            <ItemTable items={items} onRemoveItem={handleRemoveItem} onEditItem={() => {}} />
          </div>
        </Card>
      </div>

      {/* RIGHT SIDE: Summary & Payment */}
      <div className="w-full lg:w-[400px] flex flex-col gap-[24px] sticky top-[24px]">
        
        <Card className="flex flex-col gap-[16px]">
          <CardTitle>Invoice Summary</CardTitle>
          <div className="flex justify-between text-[14px]">
             <span className="text-text-muted">Subtotal</span>
             <span className="font-semibold text-text-main">₹{summaryValues.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[14px]">
             <span className="text-text-muted">Total GST</span>
             <span className="font-semibold text-text-main">₹{summaryValues.gst_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-[12px] border-y border-gray-100">
             <span className="text-[14px] text-brand-blue font-semibold">Discount %</span>
             <input type="number" className="w-[80px] p-2 border border-gray-300 rounded text-right text-[14px]" value={summaryValues.discount_percent} onChange={(e) => {
                setSummaryValues(p => { 
                   const newVal = { ...p, discount_percent: parseFloat(e.target.value) || 0 };
                   const d = (newVal.subtotal * newVal.discount_percent) / 100;
                   return { ...newVal, total: newVal.subtotal + newVal.gst_amount - d };
                });
             }} />
          </div>
          <div className="flex justify-between items-center pt-[8px]">
             <span className="text-[18px] font-bold text-text-main">Grand Total</span>
             <span className="text-[32px] font-bold tracking-tight text-text-main">₹{summaryValues.total.toFixed(0)}</span>
          </div>
        </Card>

        <Card>
           <PaymentSection 
              method={paymentDetails.method} 
              status={paymentDetails.status} 
              amountReceived={paymentDetails.amountReceived}
              total={summaryValues.total}
              onChange={(k, v) => setPaymentDetails(p => ({ ...p, [k]: v }))} 
            />
        </Card>

        <Button 
          size="large" 
          onClick={handleSaveInvoice} 
          disabled={isSaving}
          className="w-full text-[16px]"
          icon={<CheckCircle size={20} />}
        >
           {isSaving ? "Saving..." : "Checkout & Generate Bill"}
        </Button>
      </div>

      {showPreview && (
        <InvoicePreviewModal 
           invoice={lastSavedInvoice} 
           onClose={() => setShowPreview(false)} 
        />
      )}
    </div>
  );
};
