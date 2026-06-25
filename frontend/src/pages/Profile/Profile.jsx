import { useEffect, useState } from 'react';
import API from "../../services/apiClient";
import toast from "react-hot-toast";
import { User, Save, Building2, CreditCard, Camera, Upload } from 'lucide-react';
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import RemindersPanel from "./RemindersPanel";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("business"); // "business", "billing"

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        return toast.error("File is too large! Please choose an image under 2MB.");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, avatar_url: reader.result });
        toast.success("Photo added! Save changes to persist.");
      };
      reader.readAsDataURL(file);
    }
  };

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
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-20 text-[#EF4444] font-bold">Error loading profile data: {errorMsg}</div>
  }

  return (
    <div className="space-y-[32px] animate-fade-in-up md:max-w-4xl mx-auto pb-[40px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[16px]">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-[8px]">
            <User size={24} className="text-[#3B82F6]" /> Account Settings
          </h1>
          <p className="text-[14px] text-[#64748B] mt-[4px]">Manage your personal credentials, business branding, and tax setups.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700" icon={<Save size={16} />}>
          {saving ? "Saving Changes..." : "Save Changes"}
        </Button>
      </div>

      {/* Profile Overview Card */}
      <Card className="border border-slate-150 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-[24px]">
          {/* Avatar - click to upload photo */}
          <div className="relative shrink-0 group">
            <div
              onClick={() => document.getElementById('avatar-input').click()}
              className="relative w-[88px] h-[88px] rounded-2xl text-white flex items-center justify-center text-[36px] font-black shadow-lg overflow-hidden border-2 border-white ring-4 ring-slate-100 cursor-pointer bg-indigo-600"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-3xl">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                <Camera size={18} className="text-white" />
                <span className="text-[9px] text-white font-bold mt-1">Change</span>
              </div>
            </div>
            {/* Upload badge */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <Upload size={11} className="text-white" />
            </div>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">{profile.name}</h2>
            <p className="text-xs text-[#64748B] font-medium mt-0.5">{profile.email}</p>
            <div className="mt-2.5 flex flex-wrap justify-center sm:justify-start gap-[8px]">
               <Badge variant="gray" className="font-bold tracking-wide text-[9px] uppercase bg-slate-100 text-slate-700">
                  {profile.business_type || 'General'} Partner
               </Badge>
               {profile.gstin && (
                 <Badge variant="success" className="font-bold tracking-wide text-[9px] uppercase bg-emerald-50 text-emerald-700 border-emerald-100">
                    TAX REG: {profile.gstin}
                 </Badge>
               )}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">
              Click your avatar to upload a new photo (max 2MB)
            </p>
          </div>
        </div>
      </Card>

      {/* Tab Selectors */}
      <div className="flex gap-[20px] border-b border-[#E2E8F0] pb-px">
        <button 
          onClick={() => setActiveSubTab("business")} 
          className={`pb-[12px] text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-[8px] ${activeSubTab === "business" ? "border-[#3B82F6] text-[#3B82F6]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}
        >
          <Building2 size={14} /> Business Credentials
        </button>
        <button 
          onClick={() => setActiveSubTab("billing")} 
          className={`pb-[12px] text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-[8px] ${activeSubTab === "billing" ? "border-[#3B82F6] text-[#3B82F6]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}
        >
          <CreditCard size={14} /> Payment & Billing Setups
        </button>
      </div>

      {/* Settings Form Container */}
      <Card className="border border-slate-150">
        <form onSubmit={handleSave} className="space-y-6">
          {activeSubTab === "business" && (
            <div className="space-y-6 animate-fade-in-up">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-[8px]">
                 <span className="w-1 h-5 bg-indigo-650 rounded-full" />
                 Company & Business Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                 <Input label="Full Partner Name" name="name" value={profile.name || ""} onChange={handleChange} required />
                 <div className="space-y-1.5">
                   <label className="text-[13px] font-semibold text-[#64748B] block">Profile Photo URL <span className="text-[10px] text-slate-400">(or click avatar above to upload)</span></label>
                   <input
                     name="avatar_url"
                     value={profile.avatar_url || ""}
                     onChange={handleChange}
                     placeholder="https://link-to-your-photo.jpg"
                     className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                   />
                 </div>
                 <Input label="Email address (Read Only)" type="email" name="email" value={profile.email || ""} readOnly className="bg-slate-50 cursor-not-allowed opacity-80" />
                 <Input label="Business Name" name="business_name" value={profile.business_name || ""} onChange={handleChange} required />
                
                 <div className="flex flex-col gap-[4px]">
                   <label className="text-[13px] font-semibold text-[#64748B]">Business Sector</label>
                   <select
                     name="business_type"
                     value={profile.business_type || ""}
                     onChange={handleChange}
                     className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all"
                   >
                     <option value="">Select Sector</option>
                     <option value="retail">Retail Store</option>
                     <option value="wholesale">Wholesale Trader</option>
                     <option value="service">Service Agency</option>
                     <option value="manufacturing">Manufacturing Unit</option>
                   </select>
                 </div>

                 <Input label="Phone Contact" name="phone" value={profile.phone || ""} onChange={handleChange} placeholder="10-digit number" />
                 <Input label="GSTIN / VAT ID" name="gstin" value={profile.gstin || ""} onChange={handleChange} placeholder="e.g. 29ABCDE1234F1Z5" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                <Input label="City" name="city" value={profile.city || ""} onChange={handleChange} />
                <Input label="State" name="state" value={profile.state || ""} onChange={handleChange} />
              </div>

              <div>
                <label className="text-[13px] font-semibold text-[#64748B] block mb-[4px]">Full Business Address</label>
                <textarea
                  name="address"
                  rows={2}
                  value={profile.address || ""}
                  onChange={handleChange}
                  placeholder="Enter full physical address..."
                  className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all custom-scrollbar resize-none"
                />
              </div>
            </div>
          )}

          {activeSubTab === "billing" && (
            <div className="space-y-6 animate-fade-in-up">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-[8px]">
                 <span className="w-1 h-5 bg-indigo-650 rounded-full" />
                 UPI QR Code & Invoice Customizations
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                <div className="space-y-[4px]">
                  <Input label="UPI ID (For Invoice QR)" name="upi_id" value={profile.upi_id || ""} onChange={handleChange} placeholder="e.g. businessname@okaxis" />
                  <p className="text-[10px] text-slate-400 font-medium">This UPI ID is used to auto-generate digital payment QRs on print sheets.</p>
                </div>
                <div className="space-y-[4px]">
                  <Input label="Alternative Custom QR Image Link" name="payment_qr_url" value={profile.payment_qr_url || ""} onChange={handleChange} placeholder="https://..." />
                  <p className="text-[10px] text-slate-400 font-medium">Providing an image URL overrides the auto-generated code with a custom QR.</p>
                </div>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-[#64748B] block mb-[4px]">Default Billing Terms & Policies</label>
                <textarea
                  name="invoice_terms"
                  rows={4}
                  value={profile.invoice_terms || "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if not paid within due date."}
                  onChange={handleChange}
                  className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all custom-scrollbar resize-none"
                />
              </div>
            </div>
          )}
        </form>
      </Card>

      {/* Reminders Automation Section */}
      <RemindersPanel />
    </div>
  );
};

export default Profile;

