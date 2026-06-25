import {  useRef, useEffect, useState  } from 'react';
import { motion } from "framer-motion";
import { X, Printer, Share2, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import API from "../../services/apiClient";
import logoImg from "../../assets/logo.svg";

export default function InvoicePreviewModal({ invoice, onClose }) {
  const printRef = useRef();
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    async function fetchBusiness() {
      try {
        // ✅ Use secure backend instead of direct supabase
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
  const summaryValues = invoice.summaryValues || {};

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onBeforeGetContent: () => toast.success("Preparing high-quality invoice..."),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-8 overflow-y-auto"
    >
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL CONTROL HEADER */}
        <div className="flex justify-between items-center bg-white border-b border-gray-100 px-8 py-5 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                <FileText size={22} className="lucide-icon" />
             </div>
             <div>
                <h2 className="text-[16px] font-black text-brand-navy">Invoice Designer</h2>
                <p className="text-[11px] font-bold text-text-muted uppercase">Document Preview & Print</p>
             </div>
          </div>
          <div className="flex gap-2">
             <button onClick={handlePrint} className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"><Printer size={20} /></button>
             <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-rose-50 text-rose-500 transition-colors"><X size={20} /></button>
          </div>
        </div>

        {/* PRINTABLE AREA */}
        <div className="flex-1 overflow-y-auto bg-slate-100/50 p-4 md:p-12 custom-scrollbar">
          <div 
            ref={printRef} 
            className="bg-white shadow-2xl mx-auto w-full max-w-[800px] min-h-[1100px] p-[50px] relative text-[#1E293B] font-inter overflow-hidden border border-gray-200"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Header / Branding */}
            <div className="flex justify-between items-start mb-[40px] pb-[30px] border-b-2 border-slate-100">
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                     {business?.logo_url ? (
                        <img src={business.logo_url} className="h-[50px] w-auto object-contain" alt="Logo" />
                     ) : (
                        <div className="h-[50px] w-[50px] bg-brand-navy rounded-xl flex items-center justify-center text-white text-[24px] font-black">
                           {business?.business_name?.charAt(0) || 'F'}
                        </div>
                     )}
                     <h1 className="text-[24px] font-black text-brand-navy tracking-tight">{business?.business_name || "BUSINESS NAME"}</h1>
                  </div>
                  <div className="space-y-1 text-[13px] text-slate-500 font-medium max-w-sm">
                     <p className="flex items-center gap-2"><MapPin size={14} /> {business?.address || "Address not provided"}</p>
                     <p className="flex items-center gap-2"><Phone size={14} /> {business?.phone || "N/A"}</p>
                     <p className="flex items-center gap-2"><Mail size={14} /> {business?.email || "N/A"}</p>
                     {business?.gstin && <p className="mt-2 text-[11px] font-black text-brand-blue uppercase tracking-widest">GSTIN: {business.gstin}</p>}
                  </div>
               </div>
               <div className="text-right flex flex-col items-end">
                  <div className="mb-4">
                     <Barcode value={`INV-${invoice.id ? String(invoice.id).slice(0,8) : "0000"}`} width={1} height={35} fontSize={10} background="transparent" />
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-right min-w-[180px]">
                     <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Total Due</p>
                     <p className="text-[28px] font-black text-brand-navy">₹{Number(summaryValues.total || 0).toLocaleString()}</p>
                     <Badge variant={invoice.paymentDetails?.status === 'paid' ? 'success' : 'danger'} className="mt-2 text-[10px]">
                        {invoice.paymentDetails?.status?.toUpperCase()}
                     </Badge>
                  </div>
               </div>
            </div>

            {/* Billing Info */}
            <div className="grid grid-cols-2 gap-[40px] mb-[40px]">
               <div>
                  <h3 className="text-[11px] font-black text-brand-blue uppercase tracking-widest mb-3">Bill To</h3>
                  <p className="text-[16px] font-black text-brand-navy mb-1">{invoice.customer?.name || "Customer Name"}</p>
                  <div className="text-[13px] text-slate-500 font-medium leading-relaxed">
                     <p>{invoice.customer?.phone}</p>
                     <p className="max-w-[200px]">{invoice.customer?.address}</p>
                  </div>
               </div>
               <div className="text-right">
                  <h3 className="text-[11px] font-black text-brand-blue uppercase tracking-widest mb-3">Invoice Details</h3>
                  <div className="space-y-1 text-[13px] font-semibold text-brand-navy">
                     <p>Date: <span className="text-slate-500">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
                     <p>Invoice #: <span className="text-slate-500">INV-{invoice.id ? String(invoice.id).slice(0,8).toUpperCase() : 'NEW'}</span></p>
                     <p>Ref: <span className="text-slate-500">{invoice.invoice_no || 'Manual Entry'}</span></p>
                  </div>
               </div>
            </div>

            {/* Table */}
            <div className="mb-[40px] rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
               <table className="w-full text-left text-[13px]">
                  <thead>
                     <tr className="bg-slate-50 text-brand-navy font-black text-[11px] uppercase tracking-wider">
                        <th className="px-6 py-4">S.No</th>
                        <th className="px-6 py-4">Product / Description</th>
                        <th className="px-6 py-4 text-center">Qty</th>
                        <th className="px-6 py-4 text-right">Price</th>
                        <th className="px-6 py-4 text-right">Total</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                           <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                           <td className="px-6 py-4 font-black text-brand-navy">{item.name}</td>
                           <td className="px-6 py-4 text-center font-bold text-slate-600">{item.quantity}</td>
                           <td className="px-6 py-4 text-right font-bold text-slate-600">₹{item.price?.toLocaleString()}</td>
                           <td className="px-6 py-4 text-right font-black text-brand-navy">₹{(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-2 gap-[40px] pt-[20px]">
               {/* Left: QR & Terms */}
               <div className="space-y-6">
                  {business?.upi_id && (
                     <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 max-w-sm">
                        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                           <QRCodeCanvas 
                              value={`upi://pay?pa=${business.upi_id}&pn=${business.business_name || "Merchant"}&am=${summaryValues.total || 0}&cu=INR`} 
                              size={85} 
                           />
                        </div>
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <ShieldCheck size={14} className="text-emerald-500" />
                              <p className="text-[11px] font-black text-brand-navy uppercase tracking-widest">Scan to Pay</p>
                           </div>
                           <p className="text-[12px] font-bold text-slate-500 mb-2">{business.upi_id}</p>
                           <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" className="h-[12px] opacity-60" alt="UPI" />
                        </div>
                     </div>
                  )}
                  <div className="pr-8">
                     <h4 className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Notes & Terms</h4>
                     <p className="text-[11px] leading-relaxed text-slate-500 font-medium italic whitespace-pre-wrap">
                        {business?.invoice_terms || "1. Thank you for your business.\n2. Payment terms: Due on Receipt."}
                     </p>
                  </div>
               </div>

               {/* Right: Summary */}
               <div className="flex flex-col items-end">
                  <div className="w-full max-w-[280px] space-y-3">
                     <div className="flex justify-between text-[13px] font-bold text-slate-500">
                        <span>Subtotal</span>
                        <span>₹{summaryValues.subtotal?.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-[13px] font-bold text-slate-500">
                        <span>GST Total</span>
                        <span>₹{summaryValues.gst_amount?.toLocaleString() || 0}</span>
                     </div>
                     {summaryValues.discount_percent > 0 && (
                        <div className="flex justify-between text-[13px] font-bold text-rose-500">
                           <span>Discount ({summaryValues.discount_percent}%)</span>
                           <span>-₹{((summaryValues.subtotal * summaryValues.discount_percent) / 100).toLocaleString()}</span>
                        </div>
                     )}
                     <div className="h-[2px] bg-brand-navy mt-4 mb-2" />
                     <div className="flex justify-between items-center py-2">
                        <span className="text-[16px] font-black text-brand-navy">Total Pay</span>
                        <span className="text-[22px] font-black text-brand-navy">₹{Number(summaryValues.total || 0).toLocaleString()}</span>
                     </div>
                  </div>
                  
                  {/* Signature Section */}
                  <div className="mt-[60px] text-center w-[200px]">
                     <div className="h-[1px] bg-slate-200 mb-2" />
                     <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest">Authorized Signatory</p>
                     <p className="text-[12px] font-bold text-brand-navy mt-1">{business?.business_name}</p>
                  </div>
               </div>
            </div>

            {/* Watermark / Attribution */}
            <div className="absolute bottom-[40px] left-0 right-0 flex justify-center items-center opacity-20 gap-2 pointer-events-none">
               <img src={logoImg} className="w-5 h-5 object-contain" alt="FinSathi" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">FinSathi Business OS</p>
            </div>
          </div>
        </div>

        {/* CONTROLS FOOTER */}
        <div className="bg-white border-t border-gray-100 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <p className="text-[13px] font-bold text-slate-400">
             Professional Layout: <span className="text-brand-blue uppercase">Enterprise Blue</span>
          </p>
          <div className="flex gap-4 w-full md:w-auto">
             <Button variant="secondary" fullWidth icon={<Share2 size={18} />} disabled>Share Mode</Button>
             <Button fullWidth icon={<Printer size={18} />} onClick={handlePrint} className="shadow-xl shadow-brand-blue/20">Print / Save PDF</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Add these to lucide-react imports if missing
const FileText = ({...props}) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>;
