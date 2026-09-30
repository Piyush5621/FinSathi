import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import logo from "../../assets/logo.png";
import InteractiveCharacters from "../../components/Auth/InteractiveCharacters";
import { ArrowRight, User, Mail, Lock, Building, MapPin, Briefcase, Phone, Check, Eye, EyeOff } from 'lucide-react';

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
  const [hasError, setHasError] = useState(false);
  const [step, setStep] = useState(1);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setHasError(false);
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const validateStep1 = () => {
    if (!form.name || !form.phone || !form.email || !form.password) {
      toast.error("Please fill all fields", { style: { background: '#222', color: '#fff', borderRadius: '12px' }});
      setHasError(true);
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.businessName || form.businessName.trim().length < 2) {
      toast.error("Please enter your business name", { style: { background: '#222', color: '#fff', borderRadius: '12px' }});
      setHasError(true);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      if (validateStep1()) setStep(2);
      return;
    }

    if (!validateStep2()) return;
    if (!form.termsAccepted) {
      toast.error("Please accept the terms.", { style: { background: '#222', color: '#fff', borderRadius: '12px' }});
      setHasError(true);
      return;
    }
    
    setLoading(true);
    setHasError(false);
    try {
      const res = await API.post("/auth/register", form);
      const accessToken = res.data.token || res.data.data?.accessToken;
      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(res.data.user || res.data.data?.session));
      localStorage.setItem("loggedIn", "true");
      toast.success("Account created! Welcome 🎉", { style: { background: '#111', color: '#fff', borderRadius: '12px' }});
      setTimeout(() => navigate("/dashboard"), 400);
    } catch (err) {
      setHasError(true);
      toast.error(err.response?.data?.message || "Registration failed", { style: { background: '#222', color: '#fff', borderRadius: '12px' }});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-white font-sans bg-[#060709] relative overflow-hidden select-none">
      
      {/* Background Dot Matrix Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1.2px,transparent_1.2px)] [background-size:24px_24px] z-0" />
      <div className="absolute top-[25%] -left-[10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[40vw] h-[40vw] rounded-full bg-purple-600/10 blur-[140px] pointer-events-none" />

      {/* Brand Header Link */}
      <Link to="/" className="absolute top-6 left-6 z-50 flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-white/10 transition-all shadow-lg">
          <img src={logo} alt="Karobar" className="w-6 h-6 filter brightness-0 invert" />
        </div>
        <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">
          KaroBar
        </span>
      </Link>

      {/* ========================================================
          LEFT COLUMN: Interactive Mascot Characters Showcase
          ======================================================== */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 pt-24 lg:pt-8 relative z-10 lg:border-r border-white/10">
        <div className="flex flex-col items-center text-center max-w-md w-full">
          
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              Join KaroBar Network
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Welcome to the crew!
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm font-medium mb-6">
            They're watching your setup progress with excitement.
          </p>

          {/* Interactive Character Mascots */}
          <div className="w-full flex justify-center py-4">
            <InteractiveCharacters
              isPasswordFocused={isPasswordFocused}
              showPassword={showPassword}
              isSubmitting={loading}
              hasError={hasError}
            />
          </div>

          {/* Floor Shadow Baseline */}
          <div className="w-72 h-3 bg-black/40 rounded-full blur-md -mt-2 mb-6" />

          {/* Feature Highlights Card */}
          <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-2.5 text-left">
            <div className="flex items-center gap-2.5 text-xs text-gray-300">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check size={12} />
              </div>
              <span>Fast offline-capable POS counter billing</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-300">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Check size={12} />
              </div>
              <span>Automated Customer Khata (Udhaar) ledger tracking</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-300">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Check size={12} />
              </div>
              <span>Instant statutory GSTR-1 and GSTR-3B tax compliance</span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: Register Form Card
          ======================================================== */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px] bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl"
        >
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex gap-2 mb-3">
              <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-white/10'}`} />
            </div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 mb-1">
              {step === 1 ? 'Create Account' : 'Business Profile'}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm font-medium">
              {step === 1 ? 'Step 1 of 2: Owner profile details' : 'Step 2 of 2: Store setup'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="space-y-3.5"
                >
                  <InputBox 
                    icon={User} 
                    label="Full Name" 
                    name="name" 
                    type="text" 
                    placeholder="Piyush Sharma" 
                    value={form.name} 
                    onChange={handleChange}
                    onFocus={() => setIsPasswordFocused(false)} 
                  />

                  <InputBox 
                    icon={Phone} 
                    label="Phone Number" 
                    name="phone" 
                    type="tel" 
                    placeholder="9876543210" 
                    value={form.phone} 
                    onChange={handleChange}
                    onFocus={() => setIsPasswordFocused(false)} 
                  />

                  <InputBox 
                    icon={Mail} 
                    label="Email Address" 
                    name="email" 
                    type="email" 
                    placeholder="sharma@karobar.test" 
                    value={form.email} 
                    onChange={handleChange}
                    onFocus={() => setIsPasswordFocused(false)} 
                  />

                  {/* Password with Eye Toggle */}
                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-400 transition-colors">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="••••••••" 
                        value={form.password}
                        onChange={handleChange}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                        className="w-full bg-[#121316] border border-white/10 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-3.5"
                >
                  <InputBox 
                    icon={Building} 
                    label="Business Name" 
                    name="businessName" 
                    type="text" 
                    placeholder="Sharma General Store" 
                    value={form.businessName} 
                    onChange={handleChange}
                    onFocus={() => setIsPasswordFocused(false)} 
                  />

                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-400 transition-colors">
                      Business Type
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                      <select 
                        name="businessType" 
                        value={form.businessType} 
                        onChange={handleChange}
                        className="w-full bg-[#121316] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer"
                      >
                        <option value="" className="bg-[#121316]">Select business type</option>
                        <option value="Retail Grocery" className="bg-[#121316]">Retail Grocery / Kirana</option>
                        <option value="Supermarket" className="bg-[#121316]">Supermarket / Departmental</option>
                        <option value="Wholesale Distribution" className="bg-[#121316]">Wholesale Distribution</option>
                        <option value="Apparel & Footwear" className="bg-[#121316]">Apparel & Footwear</option>
                        <option value="Electronics & Hardware" className="bg-[#121316]">Electronics & Hardware</option>
                        <option value="Pharmacy" className="bg-[#121316]">Pharmacy / Medical</option>
                        <option value="Other" className="bg-[#121316]">Other Business</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InputBox 
                      icon={MapPin} 
                      label="City" 
                      name="city" 
                      type="text" 
                      placeholder="Indore" 
                      value={form.city} 
                      onChange={handleChange}
                      onFocus={() => setIsPasswordFocused(false)} 
                    />
                    <InputBox 
                      icon={MapPin} 
                      label="State" 
                      name="state" 
                      type="text" 
                      placeholder="Madhya Pradesh" 
                      value={form.state} 
                      onChange={handleChange}
                      onFocus={() => setIsPasswordFocused(false)} 
                    />
                  </div>

                  {/* Terms Checkbox */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="termsAccepted" 
                      checked={form.termsAccepted} 
                      onChange={handleChange}
                      className="mt-0.5 rounded border-gray-600 text-blue-600 focus:ring-blue-500" 
                    />
                    <span className="text-xs text-gray-300">
                      I agree to the <span className="text-white font-semibold underline">Terms of Service</span> and acknowledge privacy policies.
                    </span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-all cursor-pointer"
                >
                  Back
                </button>
              )}
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit" 
                disabled={loading}
                className="flex-1 bg-white text-black font-black py-3.5 rounded-xl shadow-[0_0_25px_rgba(255,255,255,0.15)] hover:shadow-[0_0_35px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 transition-all disabled:opacity-70 cursor-pointer text-sm"
              >
                {loading ? (
                  <ClipLoader size={18} color="#000" />
                ) : (
                  <>
                    <span>{step === 1 ? 'Continue to Store Details' : 'Create My Account'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-gray-400 text-xs font-medium">
              Already have an account?{" "}
              <Link to="/login" className="text-white font-bold hover:text-blue-400 transition-colors inline-flex items-center gap-1">
                Sign in <ArrowRight size={12}/>
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

    </div>
  );
};

const InputBox = ({ icon: Icon, label, name, type, placeholder, value, onChange, onFocus }) => (
  <div className="space-y-1.5 group">
    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-400 transition-colors">
      {label}
    </label>
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
      <input 
        type={type} 
        name={name}
        placeholder={placeholder} 
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        className="w-full bg-[#121316] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
        required
      />
    </div>
  </div>
);

export default Register;
