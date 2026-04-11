import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import logo from "../../assets/logo.png";
import { UserPlus, ArrowLeft } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    businessType: "",
    city: "",
    state: "",
    phone: "",
    termsAccepted: false,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.termsAccepted) return toast.error("Please accept the terms.");
    setLoading(true);
    try {
      const res = await API.post("/auth/register", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("loggedIn", "true");
      toast.success("Business Registered! Welcome 🎉");
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* SIDEBAR/HERO */}
      <div className="hidden md:flex md:w-[450px] bg-[#1E293B] flex-col justify-between p-[48px] sticky top-0 h-screen">
         <div className="flex items-center gap-[12px]">
            <img src={logo} alt="FinSathi" className="w-[48px] h-[48px]" />
            <span className="text-[24px] font-bold text-white tracking-tight">FinSathi</span>
         </div>

         <div>
            <h1 className="text-[42px] font-extrabold text-white leading-[1.1] mb-[24px]">
               Launch your <br/> <span className="text-[#3B82F6]">Business Engine.</span>
            </h1>
            <ul className="space-y-[16px]">
                {['GST Compliant Billing','Smart Inventory Tracking','Profit & Loss Insights'].map((f, i) => (
                    <li key={i} className="flex items-center gap-[12px] text-white/80 font-medium">
                        <div className="w-[6px] h-[6px] rounded-full bg-[#3B82F6]" /> {f}
                    </li>
                ))}
            </ul>
         </div>

         <Link to="/login" className="text-white/50 hover:text-white transition-colors flex items-center gap-[8px] text-[14px]">
            <ArrowLeft size={16}/> Already have an account?
         </Link>
      </div>

      {/* FORM AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-[24px] md:p-[60px] overflow-y-auto">
         <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-[500px] py-[40px]"
         >
            <h2 className="text-[32px] font-extrabold text-[#0F172A] mb-[8px]">Register Business</h2>
            <p className="text-[#64748B] text-[15px] mb-[40px]">Join thousands of businesses managing with FinSathi.</p>

            <form onSubmit={handleSubmit} className="space-y-[24px]">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                  <div className="space-y-[6px]">
                    <label className="text-[12px] font-bold text-[#1E293B] uppercase">Full Name</label>
                    <input name="name" placeholder="Piyush Kumar" className="input-reg" onChange={handleChange} required />
                  </div>
                  <div className="space-y-[6px]">
                    <label className="text-[12px] font-bold text-[#1E293B] uppercase">Phone Number</label>
                    <input name="phone" placeholder="+91 00000 00000" className="input-reg" onChange={handleChange} required />
                  </div>
               </div>

               <div className="space-y-[6px]">
                  <label className="text-[12px] font-bold text-[#1E293B] uppercase">Business Email</label>
                  <input type="email" name="email" placeholder="piyush@business.com" className="input-reg" onChange={handleChange} required />
               </div>

               <div className="space-y-[6px]">
                  <label className="text-[12px] font-bold text-[#1E293B] uppercase">Setup Password</label>
                  <input type="password" name="password" placeholder="Min 8 characters" className="input-reg" onChange={handleChange} required />
               </div>

               <div className="pt-[16px] border-t border-[#E2E8F0]">
                  <h3 className="text-[14px] font-bold text-[#0F172A] mb-[16px]">Business Configuration</h3>
                  <div className="space-y-[16px]">
                    <input name="businessName" placeholder="Your Business Legal Name" className="input-reg" onChange={handleChange} required />
                    <div className="grid grid-cols-2 gap-[16px]">
                        <select name="businessType" className="input-reg cursor-pointer" onChange={handleChange} required>
                            <option value="">Business Type</option>
                            <option value="retail">Retail</option>
                            <option value="service" >Service</option>
                            <option value="wholesale" >Wholesale</option>
                        </select>
                        <input name="city" placeholder="City" className="input-reg" onChange={handleChange} required />
                    </div>
                  </div>
               </div>

               <div className="flex items-start gap-[12px] bg-white border border-[#E2E8F0] p-[16px] rounded-xl">
                  <input 
                    type="checkbox" 
                    name="termsAccepted" 
                    className="mt-[3px] w-[18px] h-[18px] rounded border-[#E2E8F0] text-[#3B82F6] focus:ring-[#3B82F6]" 
                    onChange={handleChange}
                    required
                  />
                  <p className="text-[13px] text-[#64748B] leading-snug">
                    I agree to the <Link to="/terms" className="text-[#3B82F6] font-bold">Terms of Service</Link> and data privacy policy.
                  </p>
               </div>

               <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#1E293B] hover:bg-[#0F172A] text-white font-bold py-[16px] rounded-xl shadow-lg flex items-center justify-center gap-[10px] transition-all active:scale-[0.98] disabled:opacity-70"
               >
                  {loading ? <ClipLoader size={20} color="#fff" /> : <><UserPlus size={20} /> Register & Launch</>}
               </button>
            </form>

            <div className="mt-[32px] text-center md:hidden">
               <Link to="/login" className="text-[#3B82F6] font-bold">Already signed up? Login here</Link>
            </div>
         </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .input-reg {
            width: 100%;
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 14px;
            color: #0F172A;
            transition: all 0.2s;
            outline: none;
        }
        .input-reg:focus {
            border-color: #3B82F6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
      `}} />
    </div>
  );
};

export default Register;
