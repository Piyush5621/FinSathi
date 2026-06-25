import {  useEffect, useState  } from 'react';
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { X, Save, Printer } from 'lucide-react';
import { supabase } from "../../lib/supabaseClient";
import API from "../../services/apiClient";

import CustomerSection from "../../components/billing/CustomerSection";
import ItemAdder from "../../components/billing/ItemAdder";
import ItemTable from "../../components/billing/ItemTable";
import SummaryCard from "../../components/billing/SummaryCard";
import PaymentSection from "../../components/billing/PaymentSection";
import InvoicePreviewModal from "../../components/billing/InvoicePreviewModal";

export default function InvoiceEditorModal({ invoice, onClose, onSaved }) {
  const [customer, setCustomer] = useState(null);
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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadInvoiceData();
  }, [invoice]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      // Safely fetch customer data
      try {
        if (invoice.customer_id) {
          const { data: custData, error: custErr } = await supabase
            .from("customers")
            .select("*")
            .eq("id", invoice.customer_id)
            .maybeSingle();
          if (!custErr && custData) {
            setCustomer(custData);
          } else if (invoice.customers) {
            setCustomer(invoice.customers);
          }
        } else if (invoice.customers) {
           setCustomer(invoice.customers);
        }
      } catch (e) {
        console.warn("Could not fetch customer, using fallback", e);
        if (invoice.customers) setCustomer(invoice.customers);
      }

      // Inventory is now handled via async search in ItemAdder, so we don't need to load all products here.
      setProducts([]);

      let parsedItems = [];
      if (invoice.items) {
        if (Array.isArray(invoice.items)) {
          parsedItems = invoice.items;
        } else if (typeof invoice.items === "string") {
          try {
            parsedItems = JSON.parse(invoice.items);
          } catch (e) {
            console.error("Failed to parse invoice items:", e);
          }
        } else if (typeof invoice.items === "object") {
          parsedItems = invoice.items;
        }
      }
      
      // Fallback for missing items, check sale_items relation
      if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
        if (Array.isArray(invoice.sale_items)) {
          parsedItems = invoice.sale_items.map(si => ({
            id: si.id || Date.now() + Math.random(),
            product_id: si.product_id,
            name: si.products?.name || "Unknown Item",
            price: si.unit_price,
            quantity: si.quantity,
            amount: si.total,
            gst_percent: si.products?.gst_percent || 0
          }));
        }
      }

      setItems(Array.isArray(parsedItems) ? parsedItems : []);

      const gstAmount = invoice.tax_amount != null ? Number(invoice.tax_amount) : 0;
      setSummaryValues({
        subtotal: invoice.subtotal || 0,
        gst_amount: gstAmount,
        discount_percent: invoice.discount_percent || 0,
        total: invoice.total || 0,
      });

      setPaymentDetails({
        method: invoice.payment_method || "cash",
        status: invoice.payment_status || "unpaid",
        amountReceived: invoice.amount_paid || 0,
      });
    } catch (err) {
      console.error("Error loading invoice:", err);
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (newItem) => {
    const item = {
      ...newItem,
      id: Date.now(),
      amount: newItem.price * newItem.quantity,
      gst_percent: newItem.gst_percent || 0,
    };
    const updated = [...items, item];
    setItems(updated);
    updateTotals(updated);
    toast.success(`${item.name} added`);
  };

  const handleRemoveItem = (itemId) => {
    const updated = items.filter((i) => i.id !== itemId);
    setItems(updated);
    updateTotals(updated);
    toast.success("Item removed");
  };

  const updateTotals = (currentItems) => {
    const subtotal = currentItems.reduce((sum, item) => sum + item.amount, 0);
    const totalGST = currentItems.reduce(
      (sum, item) => sum + (item.amount * (item.gst_percent || 0)) / 100,
      0
    );
    const discountValue =
      (subtotal * (summaryValues.discount_percent || 0)) / 100;
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
      const discountValue =
        (updated.subtotal * (updated.discount_percent || 0)) / 100;
      const total = updated.subtotal + updated.gst_amount - discountValue;
      return { ...updated, total };
    });
  };

  const handlePaymentChange = (field, value) => {
    setPaymentDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await API.put(`/sales/${invoice.id}`, {
        items,
        subtotal: summaryValues.subtotal,
        tax_amount: summaryValues.gst_amount,
        discount_percent: summaryValues.discount_percent,
        total: summaryValues.total,
        payment_method: paymentDetails.method,
        payment_status: paymentDetails.status,
        amount_paid: paymentDetails.amountReceived,
        date: invoice.date || invoice.created_at || new Date().toISOString(),
      });

      toast.success("Invoice updated successfully");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center text-white z-50">
        Loading invoice details...
      </div>
    );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50"
      >
        <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-2xl 
                        w-[95%] max-w-5xl max-h-[88vh] overflow-y-auto p-6 
                        scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50 pb-2 z-10">
            <h2 className="text-xl font-bold text-indigo-700">
              Modify Invoice #{invoice.id}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-red-400 transition"
            >
              <X size={22} />
            </button>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm">
                <CustomerSection
                  customers={[customer]}
                  selectedCustomer={customer?.id}
                  invoiceNo={`FS-${invoice.id}`}
                  readonly={true}
                />
              </div>

              <div className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm">
                <ItemAdder products={products} onAddItem={handleAddItem} />
              </div>

              <div className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm">
                <ItemTable items={items} onRemoveItem={handleRemoveItem} />
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col gap-6">
              <SummaryCard
                subtotal={summaryValues.subtotal}
                gst={summaryValues.gst_amount}
                discount={summaryValues.discount_percent}
                total={summaryValues.total}
                onFieldChange={handleSummaryChange}
              />

              <div className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm">
                <PaymentSection
                  method={paymentDetails.method}
                  status={paymentDetails.status}
                  amountReceived={paymentDetails.amountReceived}
                  total={summaryValues.total}
                  onChange={handlePaymentChange}
                />
              </div>

              {/* Save + Preview */}
              <div className="bg-white p-6 rounded-[20px] border border-slate-100 shadow-sm flex justify-center gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-xl flex items-center gap-2 text-white font-semibold disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  onClick={() => setShowPreview(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-xl flex items-center gap-2 text-white font-semibold"
                >
                  <Printer size={18} /> Preview & Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 🧾 Print Preview Modal */}
      {showPreview && (
        <InvoicePreviewModal
          invoice={{
            ...invoice,
            items,
            subtotal: summaryValues.subtotal,
            gst_percent: summaryValues.gst_amount,
            discount_percent: summaryValues.discount_percent,
            total: summaryValues.total,
            payment_method: paymentDetails.method,
            payment_status: paymentDetails.status,
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
