import React, { useEffect, useState } from "react";
import API from "../../services/apiClient";
import toast from "react-hot-toast";
import { User, Save } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    try {
      const localUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (!localUser.email) {
        throw new Error("No active session found. Please log out and back in.");
      }
      setProfile(localUser);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.put("/auth/update", profile);
      localStorage.setItem("user", JSON.stringify(profile)); // Update local cache
      toast.success("Profile updated successfully!");
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
      } else {
        toast.error("Failed to update profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center p-[40px] text-[#EF4444] font-bold">Error loading profile data: {errorMsg}</div>
  }

  return (
    <div className="space-y-[32px] animate-fade-in-up md:max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[16px]">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-[8px]">
            <User size={24} className="text-[#3B82F6]" /> My Profile
          </h1>
          <p className="text-[14px] text-[#64748B] mt-[4px]">Manage your account, business details, and invoice settings.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} icon={<Save size={16} />}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-[24px] mb-[32px] pb-[24px] border-b border-[#E2E8F0]">
          <div className="w-[110px] h-[110px] rounded-[32px] bg-[#0F172A] text-white flex items-center justify-center text-[48px] font-black shadow-2xl shadow-slate-200 overflow-hidden border-4 border-white ring-4 ring-slate-50">
            {profile.avatar_url || profile.logo_url ? (
               <img src={profile.avatar_url || profile.logo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               profile.name ? profile.name.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-[24px] font-black text-[#0F172A] tracking-tight">{profile.name}</h2>
            <p className="text-[15px] text-[#64748B] font-medium">{profile.email}</p>
            <div className="mt-[10px] flex gap-[8px]">
               <span className="px-[10px] py-[4px] bg-slate-100 text-slate-700 text-[10px] font-black uppercase rounded-lg border border-slate-200 tracking-wider">
                  {profile.business_type || 'Business'} Profile
               </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-[32px]">
          {/* PERSONAL & BUSINESS INFO */}
          <div>
            <h3 className="text-[16px] font-bold text-[#0F172A] mb-[16px] flex items-center gap-[8px]">
               <span className="w-1.5 h-6 bg-brand-blue rounded-full" />
               Personal & Business Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
               <Input label="Full Name" name="name" value={profile.name || ""} onChange={handleChange} />
               <Input label="Profile Picture URL" name="avatar_url" value={profile.avatar_url || ""} onChange={handleChange} placeholder="https://image-link.com/photo.jpg" />
               <Input label="Email (Read Only)" type="email" name="email" value={profile.email || ""} disabled className="opacity-70 cursor-not-allowed" />
               <Input label="Business Name" name="business_name" value={profile.business_name || ""} onChange={handleChange} />
              
              <div className="flex flex-col gap-[4px]">
                <label className="text-[13px] font-semibold text-[#64748B]">Business Type</label>
                <select
                  name="business_type"
                  value={profile.business_type || ""}
                  onChange={handleChange}
                  className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all"
                >
                  <option value="">Select Type</option>
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="service">Service</option>
                  <option value="manufacturing">Manufacturing</option>
                </select>
              </div>

              <Input label="Phone" name="phone" value={profile.phone || ""} onChange={handleChange} />
              <Input label="GSTIN / Tax ID" name="gstin" value={profile.gstin || ""} onChange={handleChange} placeholder="e.g. 29ABCDE1234F1Z5" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mt-[16px]">
              <Input label="City" name="city" value={profile.city || ""} onChange={handleChange} />
              <Input label="State" name="state" value={profile.state || ""} onChange={handleChange} />
            </div>

            <div className="mt-[16px]">
              <label className="text-[13px] font-semibold text-[#64748B] block mb-[4px]">Full Business Address</label>
              <textarea
                name="address"
                rows={2}
                value={profile.address || ""}
                onChange={handleChange}
                placeholder="#123, Market Road..."
                className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all custom-scrollbar resize-none"
              />
            </div>
          </div>

          <div className="border-t border-[#E2E8F0]"></div>

          {/* INVOICE & PAYMENT SETTINGS */}
          <div>
            <h3 className="text-[16px] font-bold text-[#0F172A] mb-[16px]">Payment & Invoice Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
              <div className="space-y-[4px]">
                <Input label="UPI ID (For QR Code)" name="upi_id" value={profile.upi_id || ""} onChange={handleChange} placeholder="e.g. yourname@okicici" />
                <p className="text-[12px] text-[#64748B]">Auto-generates a Payment QR code on invoices.</p>
              </div>
              <div className="space-y-[4px]">
                <Input label="External QR Image URL" name="payment_qr_url" value={profile.payment_qr_url || ""} onChange={handleChange} placeholder="https://..." />
                <p className="text-[12px] text-[#64748B]">Overrides auto-generated QR with a custom image.</p>
              </div>
            </div>

            <div className="mt-[16px]">
              <label className="text-[13px] font-semibold text-[#64748B] block mb-[4px]">Default Invoice Terms</label>
              <textarea
                name="invoice_terms"
                rows={3}
                value={profile.invoice_terms || "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if not paid within due date."}
                onChange={handleChange}
                className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all custom-scrollbar resize-none"
              />
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
