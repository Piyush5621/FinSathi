import React, { useRef, useEffect, useState } from "react";
import API from "../../services/apiClient";
import { motion } from "framer-motion";
import { X, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";

export default function InvoicePreviewModal({ invoice, onClose }) {
  const printRef = useRef();
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    API.get("/auth/me").then(res => setBusiness(res.data)).catch(err => console.error(err));
  }, []);

  // Safeguard against missing data
  if (!invoice) return null;

  const customer = invoice.customer || {};
  const paymentDetails = invoice.paymentDetails || {};
  const summaryValues = invoice.summaryValues || {};
  const items = invoice.items || [];

  const handleBeforePrint = () => {
    toast.success("Preparing invoice for print...");
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef, // Updated for v3+ or try content: () => printRef.current if v2
    onBeforeGetContent: handleBeforePrint,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-auto"
    >
      <div className="bg-white rounded-2xl shadow-xl w-[95%] max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center bg-indigo-600 text-white px-6 py-3">
          <h2 className="text-lg font-semibold">Invoice Preview</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-red-300 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Print Area */}
        <div ref={printRef} className="bg-white text-black p-8">
          {/* Company Header */}
          {/* Company Header */}
          <div className="text-center border-b border-gray-300 pb-3 mb-3">
            <h1 className="text-3xl font-bold text-indigo-700 uppercase tracking-wide">
              {business?.business_name || "FinSathi Business"}
            </h1>
            <p className="text-gray-700 text-sm font-medium">
              {business?.address || "Your Business Address Here"}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {business?.phone && <span>Phone: {business.phone}</span>}
              {business?.email && <span className="ml-3">| Email: {business.email}</span>}
              {business?.gstin && <span className="ml-3">| GSTIN: {business.gstin}</span>}
            </p>
          </div>

          {/* Invoice & Customer Info */}
          <div className="flex justify-between mb-6 text-sm">
            <div>
              <h3 className="font-semibold text-indigo-700 mb-1">Billed To:</h3>
              <p className="font-medium">{invoice.customer?.name || "N/A"}</p>
              <p>{invoice.customer?.email}</p>
              <p>{invoice.customer?.phone}</p>
              <p>{invoice.customer?.address}</p>
            </div>
            <div className="text-right">
              <h3 className="font-semibold text-indigo-700 mb-1">
                Invoice Details:
              </h3>
              <p>
                <strong>Invoice #:</strong> FS-{invoice.id || "TEMP"}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date().toLocaleDateString("en-IN")}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`font-semibold ${invoice.paymentDetails?.status === "paid"
                    ? "text-green-600"
                    : "text-red-600"
                    }`}
                >
                  {invoice.paymentDetails?.status?.toUpperCase() || "UNPAID"}
                </span>
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border border-gray-300 mb-6 text-sm">
            <thead className="bg-indigo-100 text-indigo-800">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  Product
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center">
                  Qty
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right">
                  Price (₹)
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right">
                  GST (%)
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right">
                  Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border px-3 py-2 text-gray-700">{idx + 1}</td>
                    <td className="border px-3 py-2 text-gray-800">
                      {item.name}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {item.quantity}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {item.price?.toFixed(2)}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {item.gst_percent || 0}%
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="border px-3 py-2 text-center text-gray-500"
                  >
                    No items added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          {/* Payment & Totals Section */}
          <div className="flex justify-between items-start mt-6 pt-4 border-t border-gray-300 text-sm">
            {/* Left Side: QR Code & Terms */}
            <div className="w-[60%] space-y-4 pr-6">
              {/* QR Code Section */}
              {(business?.upi_id || business?.payment_qr_url) && (
                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="bg-white p-1 rounded-lg border border-gray-200">
                    <img
                      src={business.payment_qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${business.upi_id}&pn=${business.business_name || "Merchant"}&am=${summaryValues.total || 0}&cu=INR`)}`}
                      alt="Payment QR"
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-700">Scan to Pay</h4>
                    <p className="text-xs text-gray-600 mb-1">UPI ID: <span className="font-mono font-bold text-gray-800">{business.upi_id || "N/A"}</span></p>
                    <p className="text-[10px] text-gray-400">Accepted: GPay, PhonePe, Paytm, BHIM</p>
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="text-xs text-gray-600">
                <h5 className="font-bold text-gray-700 mb-1">Terms & Conditions:</h5>
                <pre className="whitespace-pre-wrap font-sans text-gray-500">
                  {business?.invoice_terms || "1. Goods once sold will not be taken back.\n2. Payment due immediately."}
                </pre>
              </div>
            </div>

            {/* Right Side: Totals */}
            <div className="w-[35%]">
              <div className="flex justify-between mb-1">
                <span>Subtotal:</span>
                <span>₹{summaryValues.subtotal?.toFixed(2) || 0}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>GST:</span>
                <span>₹{summaryValues.gst_amount?.toFixed(2) || 0}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Discount:</span>
                <span>
                  {summaryValues.discount_percent?.toFixed(2) || 0}%
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-300 pt-2 text-indigo-800 text-lg">
                <span>Total Amount:</span>
                <span>₹{summaryValues.total?.toFixed(2) || 0}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-[10px] text-gray-400">
            <p>Thank you for choosing {business?.business_name || "FinSathi"}!</p>
            <p>Generated via FinSathi Business OS</p>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex justify-between items-center bg-gray-100 px-6 py-3 border-t border-gray-300">
          <button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-medium"
          >
            <Printer size={18} /> Print Invoice
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-500 hover:bg-slate-600 text-white"
          >
            Close
          </button>
        </div>
      </div>
    </motion.div>
  );
}
