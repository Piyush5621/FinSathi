import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import logo from "../../assets/logo.png";
import { ArrowRight, User, Mail, Lock, Building, MapPin, Briefcase, Phone, Check } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    businessType: "",
    city: "",
    state: "", // Kept inside state to avoid missing keys if requested
    phone: "",
    termsAccepted: false,
  });

  const [loading, setLoading] = useState(false);

  // Split form logically into 2 steps for cleaner UI
  const [step, setStep] = useState(1);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const validateStep1 = () => {
      if(!form.name || !form.phone || !form.email || !form.password) {
          toast.error("Please fill all fields", { style: { background: '#333', color: '#fff' }});
          return false;
      }
      return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(step === 1) {
        if(validateStep1()) setStep(2);
        return;
    }

    if (!form.termsAccepted) return toast.error("Please accept the terms.", { style: { background: '#333', color: '#fff' }});
    
    setLoading(true);
    try {
      const res = await API.post("/auth/register", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("loggedIn", "true");
      toast.success("Workspace Initiated! Welcome 🎉", { style: { background: '#333', color: '#fff' }});
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed", { style: { background: '#333', color: '#fff' }});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-white font-sans bg-[#050505] relative overflow-hidden">
        
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[30%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px]"></div>
          <div className="absolute -bottom-[20%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-pink-600/10 blur-[100px]"></div>
          <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E')]"></div>
      </div>

      <Link to="/" className="absolute top-8 left-8 z-50 flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-white/10 transition-all">
              <img src={logo} alt="FinSathi" className="w-6 h-6 filter brightness-0 invert" style={{filter: 'brightness(0) invert(1)'}} />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">FinSathi</span>
      </Link>

      <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10 w-full lg:w-1/2 pt-24 pb-12">
          
          <div className="w-full max-w-[420px]">
             <div className="mb-8">
                 <div className="flex gap-2 mb-4">
                     <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'bg-white/20'}`}></div>
                     <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'bg-white/20'}`}></div>
                 </div>
                 <h1 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                     {step === 1 ? 'Create Admin Identity' : 'Business Profile'}
                 </h1>
                 <p className="text-gray-400 text-sm font-medium">
                     {step === 1 ? 'Set up the primary administrator account.' : 'Configure your company parameters.'}
                 </p>
             </div>

             <form onSubmit={handleSubmit} className="space-y-5">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-5"
                        >
                            <InputBox icon={User} label="Full Name" name="name" type="text" placeholder="Piyush Kumar" value={form.name} onChange={handleChange} />
                            <InputBox icon={Phone} label="Phone Number" name="phone" type="text" placeholder="+91 00000 00000" value={form.phone} onChange={handleChange} />
                            <InputBox icon={Mail} label="Email Address" name="email" type="email" placeholder="piyush@business.com" value={form.email} onChange={handleChange} />
                            <InputBox icon={Lock} label="Password" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} />
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div 
                            key="step2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-5"
                        >
                            <InputBox icon={Building} label="Business Name" name="businessName" type="text" placeholder="FinTech Retailers P. Ltd" value={form.businessName} onChange={handleChange} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 group">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-purple-400 transition-colors">Type</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-purple-400 transition-colors pointer-events-none" />
                                        <select name="businessType" value={form.businessType} onChange={handleChange} className="w-full bg-[#111] border border-white/10 rounded-2xl pl-12 pr-4 py-[15px] text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all appearance-none cursor-pointer">
                                            <option value="" disabled className="text-gray-600">Select...</option>
                                            <option value="retail">Retail</option>
                                            <option value="service" >Service</option>
                                            <option value="wholesale" >Wholesale</option>
                                        </select>
                                    </div>
                                </div>
                                <InputBox icon={MapPin} label="City" name="city" type="text" placeholder="Bangalore" value={form.city} onChange={handleChange} />
                            </div>

                            <div className="mt-8 flex gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl items-start">
                                <label className="relative cursor-pointer mt-1">
                                    <input type="checkbox" name="termsAccepted" checked={form.termsAccepted} onChange={handleChange} className="sr-only" />
                                    <div className={`w-5 h-5 rounded border ${form.termsAccepted ? 'bg-purple-500 border-purple-500' : 'border-gray-500'} flex items-center justify-center transition-all`}>
                                        {form.termsAccepted && <Check size={14} className="text-white" />}
                                    </div>
                                </label>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    I agree to the <a href="#" className="text-purple-400 font-bold hover:underline">Terms of Service</a> and confirm my data is true and accurate.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="pt-4 flex gap-3">
                    {step === 2 && (
                        <button type="button" onClick={() => setStep(1)} className="w-[120px] bg-white/5 text-white font-bold py-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                            Back
                        </button>
                    )}
                    <motion.button 
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       type="submit" 
                       disabled={loading}
                       className="flex-1 bg-white text-black font-black py-4 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                    >
                       {loading ? <ClipLoader size={22} color="#000" /> : (step === 1 ? 'Continue Setup' : 'Launch Workspace')}
                       {!loading && <ArrowRight size={18} />}
                    </motion.button>
                </div>
             </form>

             <div className="mt-10 pt-8 border-t border-white/10 text-center">
                <p className="text-gray-400 text-sm font-medium">
                   Already have a workspace? <Link to="/login" className="text-white font-bold hover:text-blue-400 transition-colors inline-flex items-center gap-1">Sign in <ArrowRight size={14}/></Link>
                </p>
             </div>
          </div>
      </div>

      {/* Decorative Right Panel */}
      <div className="hidden lg:flex flex-1 relative bg-[#0A0A0A] border-l border-white/5 items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-bl from-purple-900/20 via-transparent to-blue-900/20"></div>
          
          <motion.div 
             initial={{ opacity: 0, x: 50 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 1, delay: 0.2 }}
             className="relative z-10 w-full max-w-[500px] border border-white/10 bg-black/40 backdrop-blur-3xl rounded-[2rem] p-10 overflow-hidden"
          >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px]"></div>
              
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  </div>
                  System Capabilities
              </h3>
              
              <div className="space-y-4">
                  {[
                      { title: "Real-time Profit Analytics", desc: "View identical P&L reports within milliseconds." },
                      { title: "Staff & Attendance Sync", desc: "Automated salary processing via attendance scanning." },
                      { title: "Encrypted Ledgers", desc: "Impenetrable enterprise-grade database structures." }
                  ].map((f, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4">
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                              <Check size={12} className="text-purple-400" />
                          </div>
                          <div>
                              <div className="font-bold text-white text-sm mb-1">{f.title}</div>
                              <div className="text-xs text-gray-400">{f.desc}</div>
                          </div>
                      </div>
                  ))}
              </div>
          </motion.div>
      </div>
    </div>
  );
};

const InputBox = ({ icon: Icon, label, name, type, placeholder, value, onChange }) => (
    <div className="space-y-2 group">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-400 transition-colors">{label}</label>
        <div className="relative">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
            <input 
                type={type} 
                name={name}
                placeholder={placeholder} 
                value={value}
                onChange={onChange}
                className="w-full bg-[#111] border border-white/10 rounded-2xl pl-12 pr-4 py-[14px] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
            />
        </div>
    </div>
);

export default Register;
