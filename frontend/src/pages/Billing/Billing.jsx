import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import API from "../../services/apiClient";
import CustomerSection from "../../components/billing/CustomerSection";
import ItemAdder from "../../components/billing/ItemAdder";
import ItemTable from "../../components/billing/ItemTable";
import SummaryCard from "../../components/billing/SummaryCard";
import PaymentSection from "../../components/billing/PaymentSection";
// import InvoiceActions from "../../components/billing/InvoiceActions"; // Refactored into right panel
import InvoicePreviewModal from "../../components/billing/InvoicePreviewModal";
import { useSearchParams } from "react-router-dom";
import {
  Store,
  User,
  Calendar,
  LogOut,
  Settings,
  Printer,
  Save,
  Trash2,
  CreditCard,
  CheckCircle,
  RefreshCw,
  LayoutGrid,
  Edit2
} from "lucide-react";

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const Billing = () => {
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
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [lastSavedInvoice, setLastSavedInvoice] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Edit Item State
  const [editingItem, setEditingItem] = useState(null);

  const [searchParams] = useSearchParams();
  const prefilledCustomer = searchParams.get("customer_id");
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (prefilledCustomer && customers.length > 0) {
      setSelectedCustomer(prefilledCustomer);
    }
  }, [prefilledCustomer, customers]);

  // ✅ Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("*")
          .order("id", { ascending: true });
        if (customerError) throw customerError;
        setCustomers(customerData || []);

        const { data: inventoryData, error: inventoryError } = await supabase
          .from("inventory")
          .select("*, inventory_batches(*)")
          .order("id", { ascending: true });
        if (inventoryError) throw inventoryError;
        setProducts(inventoryData || []);

        // Pre-generate invoice
        const { data: lastInvoice } = await supabase
          .from("sales")
          .select("id")
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextNo = lastInvoice?.id ? `FS-${lastInvoice.id + 1}` : "FS-1";
        setInvoiceNo(nextNo);
      } catch (err) {
        console.error("Error loading data", err);
        toast.error("Network error. Working offline mode.");
        setInvoiceNo("FS-Local-1");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // ✅ Add item logic
  const handleAddItem = (newItem) => {
    const existingIndex = items.findIndex((i) => i.id === newItem.id);
    // If you want to merge duplicates, unleash this:
    // if (existingIndex >= 0) { ...update qty... }

    // For now, simple add as instructed by previous logic, but generating unique ID for table key
    const item = {
      ...newItem,
      tableId: Date.now() + Math.random(), // Unique ID for frontend rendering
      amount: newItem.price * newItem.quantity,
      gst_percent: newItem.gst_percent || 0,
    };
    const updatedItems = [item, ...items]; // Add to top
    setItems(updatedItems);
    updateTotals(updatedItems);
    toast.success(`${item.name} added`, { icon: '🛒' });
  };

  const handleRemoveItem = (itemId) => {
    // Note: ItemTable passes the ID. Ensure ItemTable uses 'tableId' if we added it, or matches schema.
    // The previous code used 'id' which was Date.now().
    const updatedItems = items.filter((item) => item.tableId !== itemId && item.id !== itemId);
    setItems(updatedItems);
    updateTotals(updatedItems);
  };

  const handleEditClick = (item) => {
    setEditingItem({ ...item });
  };

  const saveEditItem = () => {
    if (!editingItem) return;
    handleUpdateItem(editingItem, editingItem.quantity, editingItem.price);
    setEditingItem(null);
  };

  const handleUpdateItem = (originalItem, newQty, newPrice) => {
    const updatedItems = items.map(item => {
      if (item.tableId === originalItem.tableId) {
        const qty = Number(newQty);
        const prc = Number(newPrice);
        return {
          ...item,
          quantity: qty,
          price: prc,
          amount: qty * prc
        };
      }
      return item;
    });
    setItems(updatedItems);
    updateTotals(updatedItems);
    toast.success("Item updated");
  };

  const updateTotals = (currentItems) => {
    const subtotal = currentItems.reduce((sum, item) => sum + item.amount, 0);
    const totalGST = currentItems.reduce(
      (sum, item) => sum + (item.amount * (item.gst_percent || 0)) / 100,
      0
    );
    const discountValue = (subtotal * (summaryValues.discount_percent || 0)) / 100;
    const total = subtotal + totalGST - discountValue;

    setSummaryValues((prev) => ({
      ...prev,
      subtotal,
      gst_amount: totalGST,
      total,
    }));
  };

  const handleSummaryChange = (field, value) => {
    setSummaryValues((prev) => {
      const updated = { ...prev, [field]: parseFloat(value) || 0 };
      const discountValue = (updated.subtotal * (updated.discount_percent || 0)) / 100;
      const total = updated.subtotal + updated.gst_amount - discountValue;
      return { ...updated, total };
    });
  };

  const handlePaymentChange = (field, value) => {
    setPaymentDetails((prev) => ({ ...prev, [field]: value }));
  };

  const isCashPayment = paymentDetails.method === "cash" && paymentDetails.status === "paid";

  const handleSaveInvoice = async () => {
    try {
      if (items.length === 0) return toast.error("Cart is empty!");
      if (!selectedCustomer) return toast.error("Please select a customer!");

      setIsSaving(true);

      // Capture current state for the receipt BEFORE reset
      const currentInvoiceData = {
        customer: customers.find((c) => c.id === Number(selectedCustomer)) || {},
        items: [...items], // Copy array
        summaryValues: { ...summaryValues },
        paymentDetails: { ...paymentDetails },
        invoiceNo: null // Will update after save
      };

      /* 
       * 🔄 UPDATED LOGIC: Send to Backend API for Inventory Management 
       * The backend will assume responsibility for inserting sale AND decrementing stock.
       */
      const payload = {
        customer_id: selectedCustomer,
        items,
        subtotal: summaryValues.subtotal,
        tax_amount: summaryValues.gst_amount, // Send calculated tax amount directly
        discount_percent: summaryValues.discount_percent, // percent
        total: summaryValues.total,
        payment_method: paymentDetails.method,
        payment_status: paymentDetails.status,
      };

      const response = await API.post("/sales", payload);
      const newInvoice = response.data; // Axios returns data in .data

      if (!newInvoice) {
        throw new Error("No data returned from server");
      }

      // Post-Save Logic (Invoice Number Update is handled by backend or trigger usually, but if we need to update our view we do it here)
      if (newInvoice?.id) {
        const generatedInvoiceNo = `FS-${newInvoice.id}`;
        // Backend might have already set invoice_no if trigger exists, otherwise we update it or just display it.
        // For consistency with specific requirement to generate 'FS-ID':
        if (!newInvoice.invoice_no) {
          await supabase.from("sales").update({ invoice_no: generatedInvoiceNo }).eq("id", newInvoice.id);
        }

        toast.success(`Invoice ${generatedInvoiceNo} Saved!`);

        // Update the invoice data with the real ID and set it for the modal
        currentInvoiceData.invoiceNo = generatedInvoiceNo;
        setLastSavedInvoice(currentInvoiceData);

        setShowPreview(true);

        if (isCashPayment) {
          // Small delay to allow modal to render before printing
          setTimeout(() => {
            window.print();
          }, 500);
        }

        // Reset Main Form
        setItems([]);
        setSummaryValues({ subtotal: 0, gst_amount: 0, discount_percent: 0, total: 0 });

        // Prepare next invoice number locally
        const nextId = newInvoice.id + 1;
        setInvoiceNo(`FS-${nextId}`);
      }
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || error.message || "Failed to save invoice.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col text-slate-100 overflow-hidden font-inter">

      {/* 🟢 TOP BAR */}
      <header className="flex-none glass-card mb-4 p-4 flex items-center justify-between z-10 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Store size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">FinSathi POS</h1>
            <p className="text-xs text-slate-400 font-medium">Store: Main Branch • User: Admin</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Invoice No</p>
            <p className="text-xl font-mono font-bold text-indigo-400">{invoiceNo}</p>
          </div>
          <div className="h-8 w-px bg-slate-700"></div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono tracking-tight text-white">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-slate-400">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      </header>

      {/* 🟠 MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden gap-6">

        {/* LEFT COLUMN: PRODUCT ENTRY & GRID */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">

          {/* Product Input Area */}
          <div className="flex-none glass-card p-4 z-10 rounded-2xl">
            <ItemAdder products={products} onAddItem={handleAddItem} />
          </div>

          {/* Data Grid */}
          <div className="flex-1 glass-card rounded-2xl overflow-hidden flex flex-col border border-slate-700/50">
            <div className="p-4 border-b border-slate-700/50 bg-slate-900/30 flex justify-between items-center">
              <h3 className="font-bold text-slate-300 flex items-center gap-2 text-sm">
                <LayoutGrid size={18} className="text-indigo-400" /> Current Items ({items.length})
              </h3>
              {items.length > 0 && (
                <button
                  onClick={() => { setItems([]); updateTotals([]); }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors uppercase tracking-wide"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                    <LayoutGrid size={32} className="opacity-50" />
                  </div>
                  <p className="font-medium">No items added yet.</p>
                  <p className="text-sm opacity-60">Search or scan a product to begin.</p>
                </div>
              ) : (
                <ItemTable items={items} onRemoveItem={handleRemoveItem} onEditItem={handleEditClick} />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTION PANEL */}
        <div className="w-[400px] flex-none flex flex-col gap-4 overflow-y-auto pr-2">

          {/* Customer Card */}
          <div className="glass-card p-1 rounded-2xl">
            <CustomerSection
              customers={customers}
              onCustomerSelect={setSelectedCustomer}
              selectedCustomer={selectedCustomer}
              invoiceNo={invoiceNo}
              variant="compact"
            />
          </div>

          {/* Total Display (Digital Look) */}
          <div className="bg-[#020617] text-white p-8 rounded-3xl shadow-2xl border border-slate-800 flex flex-col justify-between relative overflow-hidden group min-h-[140px]">
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold z-10 flex justify-between">
              <span>Grand Total</span>
              <span className={`w-2 h-2 rounded-full ${items.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></span>
            </div>
            <motion.div
              key={summaryValues.total}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-mono font-bold tracking-tighter text-right z-10 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]"
            >
              {formatCurrency(summaryValues.total).replace('₹', '')}<span className="text-2xl ml-1 text-slate-500">₹</span>
            </motion.div>

            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          </div>

          {/* Summary Details */}
          <div className="glass-card rounded-2xl p-6 text-sm space-y-3">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(summaryValues.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tax (GST)</span>
              <span className="font-mono">{formatCurrency(summaryValues.gst_amount)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-700/50 mt-1">
              <span className="text-indigo-400 font-medium">Discount %</span>
              <input
                type="number"
                className="w-20 text-right bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-mono"
                value={summaryValues.discount_percent}
                onChange={(e) => handleSummaryChange("discount_percent", e.target.value)}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="glass-card rounded-2xl p-4">
            <PaymentSection
              method={paymentDetails.method}
              status={paymentDetails.status}
              onChange={handlePaymentChange}
            />
          </div>

          {/* Action Grid Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <button
              onClick={() => setItems([])}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20 hover:border-rose-500/40 group type-button"
            >
              <Trash2 size={20} className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold tracking-wider">CLEAR</span>
            </button>

            <button
              onClick={() => setShowPreview(true)}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20 hover:border-blue-500/40 group type-button"
            >
              <Printer size={20} className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold tracking-wider">PREVIEW</span>
            </button>

            <button
              onClick={handleSaveInvoice}
              disabled={isSaving}
              className={`col-span-2 flex items-center justify-center gap-3 p-4 rounded-xl text-white shadow-lg active:scale-95 transition-all relative overflow-hidden group ${isCashPayment
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-emerald-500/30"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-indigo-500/30"
                }`}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative z-10 flex items-center gap-3">
                {isSaving ? (
                  <RefreshCw className="animate-spin" />
                ) : isCashPayment ? (
                  <Printer size={24} />
                ) : (
                  <CheckCircle size={24} />
                )}
                <span className="text-lg font-bold tracking-wide">
                  {isCashPayment ? "SAVE & PRINT" : "CHECKOUT & SAVE"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* EDIT ITEM MODAL */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Edit2 size={18} className="text-emerald-400" /> Edit Line Item
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Product</p>
                  <div className="font-bold text-white">{editingItem.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{editingItem.code || editingItem.sku}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={editingItem.quantity}
                      onChange={e => setEditingItem(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Unit Price</label>
                    <input
                      type="number"
                      value={editingItem.price}
                      onChange={e => setEditingItem(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditItem}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg hover:shadow-emerald-500/20 transition"
                >
                  Update
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PREVIEW MODAL */}
      {showPreview && (
        <InvoicePreviewModal
          onClose={() => setShowPreview(false)}
          onPrint={() => { window.print(); setShowPreview(false); }}
          invoice={lastSavedInvoice || {
            customer: customers.find((c) => c.id === Number(selectedCustomer)) || {},
            items,
            summaryValues,
            paymentDetails,
            invoiceNo,
          }}
        />
      )}
    </div>
  );
};

export default Billing;
