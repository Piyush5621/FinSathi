import React, { useRef, useEffect, useState } from 'react';
import { motion } from "framer-motion";
import { X, Printer, Share2, ShieldCheck, Mail, Phone, MapPin, CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react';
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import API from "../../services/apiClient";
import logoImg from "../../assets/logo.svg";

export default function InvoicePreviewModal({ invoice, onClose, onNewSale }) {
  const printRef = useRef();
  const [business, setBusiness] = useState(null);
  const [printFormat, setPrintFormat] = useState('standard'); // 'standard' | 'thermal'

  useEffect(() => {
    async function fetchBusiness() {
      try {
        const { data } = await API.get("/auth/profile");
        if (data) setBusiness(data);
      } catch (err) {
        console.warn("Could not fetch business info:", err);
      }
    }
    fetchBusiness();
  }, []);

  if (!invoice) return null;

  const items = invoice.items || [];
  const total = Number(invoice.total || 0);
  const subtotal = Number(invoice.subtotal || 0);
  const taxAmount = Number(invoice.tax_amount || invoice.gst_amount || 0);
  const discountPercent = Number(invoice.discount_percent || 0);
  const discountAmount = (subtotal * discountPercent) / 100;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onBeforeGetContent: () => toast.success("Preparing print invoice..."),
  });

  const handleWhatsAppShare = () => {
    const phone = invoice.customer?.phone;
    if (!phone) {
      toast.error("Customer phone number not available.");
      return;
    }
    const itemLines = items.map(i => `• ${i.product_name || i.name} x${i.quantity} = ₹${(i.price * i.quantity).toFixed(0)}`).join('\n');
    const msg = encodeURIComponent(
      `🧾 *Invoice #${invoice.invoiceNo || invoice.invoice_no || 'INV'}*\n` +
      `*${business?.business_name || 'KaroBar Store'}*\n\n` +
      `${itemLines}\n\n` +
      `Subtotal: ₹${subtotal.toFixed(2)}\n` +
      `GST: ₹${taxAmount.toFixed(2)}\n` +
      `*Grand Total: ₹${total.toFixed(2)}*\n\n` +
      `Payment Status: ${(invoice.payment_status || 'PAID').toUpperCase()}\n` +
      `Thank you for your business! 🙏`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-3 md:p-6 overflow-y-auto"
    >
      <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL CONTROL HEADER */}
        <div className="flex justify-between items-center bg-app-surface border-b border-app-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-app-text tracking-tight">Sale Completed ✓</h2>
              <p className="text-[11px] font-bold text-app-text-secondary uppercase">
                Invoice {invoice.invoiceNo || invoice.invoice_no || 'Assigned'} • ₹{total.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="inline-flex rounded-lg border border-app-border bg-app-surface-subtle p-0.5 text-xs font-bold mr-2">
              <button
                type="button"
                onClick={() => setPrintFormat('standard')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  printFormat === 'standard' ? 'bg-app-surface text-app-primary shadow-xs font-bold' : 'text-app-text-secondary'
                }`}
              >
                A4 Standard
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  printFormat === 'thermal' ? 'bg-app-surface text-app-primary shadow-xs font-bold' : 'text-app-text-secondary'
                }`}
              >
                Thermal (80mm)
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE PREVIEW AREA */}
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950/50 p-4 md:p-8">
          {printFormat === 'standard' ? (
            /* STANDARD A4 INVOICE */
            <div 
              ref={printRef} 
              className="bg-white text-slate-900 shadow-xl mx-auto w-full max-w-[750px] min-h-[900px] p-8 md:p-12 relative font-sans border border-slate-200"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-100">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {business?.logo_url ? (
                      <img src={business.logo_url} className="h-10 w-auto object-contain" alt="Logo" />
                    ) : (
                      <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-lg font-black">
                        {business?.business_name?.charAt(0) || 'K'}
                      </div>
                    )}
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">{business?.business_name || "KAROBAR MERCHANT"}</h1>
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-500 font-medium">
                    <p className="flex items-center gap-1.5"><MapPin size={12} /> {business?.address || "Address on file"}</p>
                    <p className="flex items-center gap-1.5"><Phone size={12} /> {business?.phone || "N/A"}</p>
                    {business?.gstin && <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">GSTIN: {business.gstin}</p>}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <Barcode value={`${invoice.invoiceNo || invoice.invoice_no || 'INV-001'}`} width={1} height={30} fontSize={10} background="transparent" />
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-right min-w-[160px] mt-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Paid</p>
                    <p className="text-2xl font-black text-slate-900">₹{total.toLocaleString('en-IN')}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {(invoice.payment_status || 'PAID').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To & Invoice Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">Bill To</h3>
                  <p className="text-sm font-black text-slate-900">{invoice.customer?.name || "Walk-in Customer"}</p>
                  {invoice.customer?.phone && <p className="text-xs text-slate-500 font-medium">{invoice.customer.phone}</p>}
                </div>
                <div className="text-right">
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">Invoice Info</h3>
                  <p className="text-xs font-semibold text-slate-800">Date: <span className="font-normal text-slate-500">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
                  <p className="text-xs font-semibold text-slate-800">Invoice: <span className="font-mono text-slate-700">{invoice.invoiceNo || invoice.invoice_no || 'FS-NEW'}</span></p>
                  <p className="text-xs font-semibold text-slate-800">Payment: <span className="font-normal text-slate-500">{(invoice.payment_method || 'Cash').toUpperCase()}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-900 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3 text-center w-16">Qty</th>
                      <th className="py-2.5 px-3 text-right w-24">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right w-24">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{item.product_name || item.name}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">₹{Number(item.price || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary & QR */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <div className="space-y-3">
                  {business?.upi_id && (
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-xs">
                      <QRCodeCanvas 
                        value={`upi://pay?pa=${business.upi_id}&pn=${business.business_name || "Merchant"}&am=${total}&cu=INR`} 
                        size={65} 
                      />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">UPI Scan to Pay</p>
                        <p className="text-[11px] font-bold text-slate-800">{business.upi_id}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 italic">Thank you for shopping with us!</p>
                </div>

                <div className="space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>GST:</span>
                      <span>₹{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Discount ({discountPercent}%):</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* THERMAL 80MM RECEIPT */
            <div 
              ref={printRef} 
              className="bg-white text-slate-900 shadow-xl mx-auto w-[320px] p-4 text-[11px] font-mono border border-slate-200 leading-tight"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h2 className="font-bold text-sm uppercase">{business?.business_name || "KAROBAR STORE"}</h2>
                <p className="text-[10px] text-slate-500">{business?.address || "Store Address"}</p>
                <p className="text-[10px] text-slate-500">Ph: {business?.phone || "N/A"}</p>
                {business?.gstin && <p className="text-[10px] font-bold">GSTIN: {business.gstin}</p>}
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Bill: {invoice.invoiceNo || invoice.invoice_no || 'NEW'}</span>
                  <span>{new Date().toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cust: {invoice.customer?.name || "Walk-in"}</span>
                  <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-300">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold">
                      <th>Item</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1 pr-1 truncate max-w-[140px]">{item.product_name || item.name}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right font-bold">₹{(item.price * item.quantity).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="py-2 space-y-1 text-right text-xs">
                <div className="flex justify-between text-[10px]">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(0)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span>GST:</span>
                    <span>₹{taxAmount.toFixed(0)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span>Discount:</span>
                    <span>-₹{discountAmount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-dashed border-slate-300">
                  <span>TOTAL:</span>
                  <span>₹{total.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Payment:</span>
                  <span className="uppercase">{invoice.payment_method || 'Cash'}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[9px] text-slate-500">
                <p>*** THANK YOU VISIT AGAIN ***</p>
                <p className="mt-0.5">Powered by KaroBar POS</p>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS FOOTER */}
        <div className="bg-app-surface border-t border-app-border px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {invoice.customer?.phone && (
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <MessageCircle size={15} /> WhatsApp Bill
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              icon={<Printer size={16} />}
              onClick={handlePrint}
              className="flex-1 sm:flex-initial"
            >
              Print Invoice
            </Button>
            <Button
              variant="primary"
              icon={<ArrowRight size={16} />}
              onClick={() => {
                onClose();
                onNewSale?.();
              }}
              className="flex-1 sm:flex-initial shadow-md shadow-app-primary/20"
            >
              + Next Sale (New)
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
