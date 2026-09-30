import { useState, useEffect } from 'react';
import toast from "react-hot-toast";
import { User, Phone, Mail, MapPin, Building2, ShieldAlert, FileText, IndianRupee } from 'lucide-react';
import API from "../services/apiClient";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

/**
 * Standardized Canonical Customer Edit Modal
 * Supports full customer profile: name, phone, email, address, city, gstin, credit_limit, notes.
 * Strictly prevents manual modification of outstanding_balance (balance is financial ledger authoritative).
 */
export default function CustomerEditModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    gstin: "",
    credit_limit: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        gstin: customer.gstin || "",
        credit_limit: customer.credit_limit !== undefined && customer.credit_limit !== null ? String(customer.credit_limit) : "0",
        notes: customer.notes || ""
      });
    }
  }, [customer]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return toast.error("Customer name is required");
    }

    try {
      setSaving(true);
      // Strictly omit outstanding_balance, user_id, organization_id
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        gstin: form.gstin.trim() ? form.gstin.trim().toUpperCase() : null,
        credit_limit: parseFloat(form.credit_limit) || 0,
        notes: form.notes.trim() || null
      };

      await API.put(`/customers/${customer.id}`, payload);
      toast.success("Customer profile updated successfully!");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error("Customer update error:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to update customer profile");
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return null;

  const currentDues = Number(customer.outstanding_balance || 0);

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit Customer: ${customer.name}`}>
      <form onSubmit={handleSave} className="space-y-4">
        {/* Read-Only Financial Ledger Banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-500 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-app-muted uppercase block">Authoritative Khata Balance</span>
              <span className={`font-mono font-black text-sm ${currentDues > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                ₹{currentDues.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-app-muted max-w-[200px] text-right leading-tight">
            Managed via sales & repayments. Cannot be manually overridden.
          </p>
        </div>

        {/* Full Name */}
        <Input 
          label="Full Name *" 
          required 
          placeholder="Customer or Business Name"
          value={form.name} 
          onChange={(e) => setForm({ ...form, name: e.target.value })} 
        />

        {/* Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input 
            label="Phone Number" 
            type="tel"
            placeholder="e.g. 9876543210"
            value={form.phone} 
            onChange={(e) => setForm({ ...form, phone: e.target.value })} 
          />
          <Input 
            label="Email Address" 
            type="email"
            placeholder="customer@email.com"
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
          />
        </div>

        {/* City & GSTIN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input 
            label="City / Town" 
            placeholder="e.g. New Delhi"
            value={form.city} 
            onChange={(e) => setForm({ ...form, city: e.target.value })} 
          />
          <Input 
            label="GSTIN (Optional)" 
            placeholder="e.g. 07AAAAA0000A1Z5"
            value={form.gstin} 
            onChange={(e) => setForm({ ...form, gstin: e.target.value })} 
          />
        </div>

        {/* Credit Limit */}
        <Input 
          label="Credit Limit (₹)" 
          type="number" 
          step="1"
          min="0"
          placeholder="0 for no credit restriction"
          value={form.credit_limit} 
          onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} 
        />

        {/* Address */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-semibold text-app-text-muted">Street / Shop Address</label>
          <textarea 
            value={form.address} 
            onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="Street address, shop number, landmark..."
            className="w-full p-2.5 bg-app-surface-subtle border border-app-border rounded-lg text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            rows="2"
          />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-semibold text-app-text-muted">Internal Remarks / Notes</label>
          <textarea 
            value={form.notes} 
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Customer preferences, credit terms, delivery notes..."
            className="w-full p-2.5 bg-app-surface-subtle border border-app-border rounded-lg text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            rows="2"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
