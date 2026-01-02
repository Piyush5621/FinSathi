import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";

export default function CustomerEditModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
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
      });
    }
  }, [customer]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name required");
    try {
      setSaving(true);
      const { error } = await supabase
        .from("customers")
        .update({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
        })
        .eq("id", customer.id);

      if (error) throw error;
      toast.success("Customer updated successfully");
      onSaved && onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-indigo-300 mb-3">
          Edit Customer
        </h3>

        <form onSubmit={handleSave} className="space-y-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            className="w-full bg-slate-800 border border-slate-700 rounded p-2"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="w-full bg-slate-800 border border-slate-700 rounded p-2"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone"
            className="w-full bg-slate-800 border border-slate-700 rounded p-2"
          />
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="City"
            className="w-full bg-slate-800 border border-slate-700 rounded p-2"
          />
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Address"
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 h-20"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
