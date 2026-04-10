import {  useState, useEffect  } from 'react';
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

export default function CustomerEditModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
      });
    }
  }, [customer]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name required");
    try {
      setSaving(true);
      const { error } = await supabase.from("customers").update({
        name: form.name, email: form.email, phone: form.phone, address: form.address, city: form.city
      }).eq("id", customer.id);
      if (error) throw error;
      toast.success("Customer updated successfully");
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast.error("Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return null;
  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Customer">
      <form onSubmit={handleSave} className="space-y-[16px]">
        <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-[12px]">
           <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
           <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="flex flex-col gap-[4px]">
           <label className="text-[13px] font-medium text-text-main">Address</label>
           <textarea 
              value={form.address} 
              onChange={e=>setForm({...form, address: e.target.value})}
              className="w-full p-[12px] border border-gray-300 rounded-lg text-[14px] text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
              rows="3"
            />
        </div>
        <div className="flex justify-end gap-[12px] pt-[8px]">
           <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
           <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </Modal>
  );
}
