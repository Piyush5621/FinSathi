import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import API from "../../services/apiClient";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // 🧠 Fetch user profile from backend
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await API.get("/auth/me");
        setProfile(res.data);
        toast.success("Profile loaded successfully 🎉");
      } catch (err) {
        console.error("Profile fetch error:", err.message);
        setMsg("Failed to load profile");
        toast.error(
          err.message.includes("Network")
            ? "Unable to connect to server. Please check your internet."
            : "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleChange = (e) =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    try {
      await API.put("/auth/update", profile);
      setMsg("✅ Profile updated successfully!");
      toast.success("Profile updated successfully 🎉");
    } catch (err) {
      console.error("Update error:", err.message);
      setMsg("❌ Failed to update profile");
      toast.error("Failed to update profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center">
          <ClipLoader size={80} color="#10b981" />
          <p className="text-emerald-400 mt-4 text-lg font-bold animate-pulse">
            Loading your FinSathi profile...
          </p>
        </div>
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-[#0f172a] text-slate-100 p-8 font-inter relative overflow-hidden"
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="glass-card rounded-3xl p-8 md:p-12 shadow-2xl max-w-4xl mx-auto border border-slate-700/50 relative z-10">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-700/50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-indigo-500/20">
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              My Profile
            </h2>
            <p className="text-slate-400">Manage your account and business details</p>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
            <input
              name="name"
              value={profile.name || ""}
              onChange={handleChange}
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Email</label>
            <input
              type="email"
              name="email"
              value={profile.email || ""}
              onChange={handleChange}
              disabled
              className="w-full px-5 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-500 cursor-not-allowed font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">
              Business Name
            </label>
            <input
              name="business_name"
              value={profile.business_name || ""}
              onChange={handleChange}
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">
              Business Type
            </label>
            <select
              name="business_type"
              value={profile.business_type || ""}
              onChange={handleChange}
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium appearance-none"
            >
              <option value="">Select Type</option>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="service">Service</option>
              <option value="manufacturing">Manufacturing</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">City</label>
            <input
              name="city"
              value={profile.city || ""}
              onChange={handleChange}
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">State</label>
            <input
              name="state"
              value={profile.state || ""}
              onChange={handleChange}
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Phone</label>
            <input
              name="phone"
              value={profile.phone || ""}
              onChange={handleChange}
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Full Business Address</label>
            <textarea
              name="address"
              rows={2}
              value={profile.address || ""}
              onChange={handleChange}
              placeholder="#123, Market Road..."
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium custom-scrollbar resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">GSTIN / Tax ID</label>
            <input
              name="gstin"
              value={profile.gstin || ""}
              onChange={handleChange}
              placeholder="e.g. 29ABCDE1234F1Z5"
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
            />
          </div>

          <div className="md:col-span-2 pt-8 pb-4 border-b border-slate-700/50 mb-4">
            <h3 className="text-xl font-bold text-emerald-400">Payment & Invoice Settings</h3>
            <p className="text-slate-500 text-sm">Configure how you receive payments and what appears on invoices.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">UPI ID (For QR Code)</label>
            <input
              name="upi_id"
              value={profile.upi_id || ""}
              onChange={handleChange}
              placeholder="e.g. yourname@okicici"
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
            />
            <p className="text-xs text-slate-500">We will automatically generate a Payment QR code on your invoices using this UPI ID.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Upload QR Image URL</label>
            <input
              name="payment_qr_url"
              value={profile.payment_qr_url || ""}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
            />
            <p className="text-xs text-slate-500">Optional: Provide a direct image link to your custom QR (overrides auto-generated one).</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Default Invoice Terms</label>
            <textarea
              name="invoice_terms"
              rows={3}
              value={profile.invoice_terms || "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if not paid within due date."}
              onChange={handleChange}
              className="w-full px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium custom-scrollbar resize-none"
            />
          </div>
        </form>

        <div className="mt-10 flex justify-between items-center pt-6 border-t border-slate-700/50">
          <p
            className={`text-sm font-bold flex items-center gap-2 ${msg.includes("✅")
              ? "text-emerald-400"
              : msg.includes("❌")
                ? "text-rose-400"
                : "text-slate-500"
              }`}
          >
            {msg}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 flex items-center gap-2"
          >
            {saving ? (
              <>
                <ClipLoader size={18} color="#ffffff" /> Saving...
              </>
            ) : "Save Changes"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
