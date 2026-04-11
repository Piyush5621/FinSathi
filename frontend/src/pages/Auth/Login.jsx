import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import logo from "../../assets/logo.png";
import { LogIn, ArrowRight } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn) navigate("/dashboard");
  }, [navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("loggedIn", "true");
      toast.success("Welcome back! 🎉");
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* SIDEBAR/HERO */}
      <div className="hidden md:flex md:w-[450px] bg-[#1E293B] flex-col justify-between p-[48px]">
         <div className="flex items-center gap-[12px]">
            <img src={logo} alt="FinSathi" className="w-[48px] h-[48px]" />
            <span className="text-[24px] font-bold text-white tracking-tight">FinSathi</span>
         </div>

         <div>
            <h1 className="text-[42px] font-extrabold text-white leading-[1.1] mb-[24px]">
               Smart Finance <br/> <span className="text-[#3B82F6]">Masterful Control.</span>
            </h1>
            <p className="text-[16px] text-[#94A3B8] leading-relaxed">
               The ultimate business operating system for modern entrepreneurs in India. Managed billing, inventory and deep analytics.
            </p>
         </div>

         <div className="text-[#64748B] text-[13px] font-medium">
            © {new Date().getFullYear()} FinSathi Inc. All rights reserved.
         </div>
      </div>

      {/* FORM AREA */}
      <div className="flex-1 flex items-center justify-center p-[24px] md:p-[80px]">
         <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[400px]"
         >
            <div className="md:hidden flex items-center gap-[12px] mb-[40px]">
               <img src={logo} alt="FinSathi" className="w-[40px] h-[40px]" />
               <span className="text-[20px] font-bold text-[#1E293B]">FinSathi</span>
            </div>

            <h2 className="text-[32px] font-extrabold text-[#0F172A] mb-[8px]">Sign In</h2>
            <p className="text-[#64748B] text-[15px] mb-[40px]">Manage your business engine from one dashboard.</p>

            <form onSubmit={handleSubmit} className="space-y-[24px]">
               <div className="space-y-[8px]">
                  <label className="text-[13px] font-bold text-[#1E293B] uppercase tracking-wider">Email Address</label>
                  <input 
                     type="email" 
                     name="email"
                     placeholder="name@business.com" 
                     className="w-full bg-white border border-[#E2E8F0] rounded-xl px-[16px] py-[14px] text-[15px] focus:ring-4 focus:ring-[#3B82F6]/10 focus:border-[#3B82F6] transition-all outline-none"
                     onChange={handleChange}
                     required
                  />
               </div>

               <div className="space-y-[8px]">
                  <div className="flex justify-between items-center">
                    <label className="text-[13px] font-bold text-[#1E293B] uppercase tracking-wider">Password</label>
                    <Link to="/forgot" className="text-[13px] font-bold text-[#3B82F6] hover:underline">Forgot?</Link>
                  </div>
                  <input 
                     type="password" 
                     name="password"
                     placeholder="••••••••" 
                     className="w-full bg-white border border-[#E2E8F0] rounded-xl px-[16px] py-[14px] text-[15px] focus:ring-4 focus:ring-[#3B82F6]/10 focus:border-[#3B82F6] transition-all outline-none"
                     onChange={handleChange}
                     required
                  />
               </div>

               <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold py-[16px] rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-[10px] transition-all active:scale-[0.98] disabled:opacity-70"
               >
                  {loading ? <ClipLoader size={20} color="#fff" /> : <><LogIn size={20} /> Continue to Dashboard</>}
               </button>
            </form>

            <div className="mt-[40px] pt-[32px] border-t border-[#E2E8F0] text-center">
               <p className="text-[#64748B] text-[14px]">
                  New to the platform? <Link to="/register" className="text-[#3B82F6] font-bold hover:underline inline-flex items-center gap-[4px]">Create Account <ArrowRight size={14}/></Link>
               </p>
            </div>
         </motion.div>
      </div>
    </div>
  );
};

export default Login;
