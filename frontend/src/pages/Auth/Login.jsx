import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";
import API, { setAccessToken } from "../../services/apiClient";
import logo from "../../assets/logo.png";
import InteractiveCharacters from "../../components/Auth/InteractiveCharacters";
import { 
  LogIn, ArrowRight, Lock, Mail, ShieldCheck, 
  KeyRound, Store, Users, Receipt, Package, HelpCircle, Eye, EyeOff
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: "Owner (Kirana)",
    email: "demo.owner@karobar.test",
    password: "Karobar@12345",
    desc: "Full business operations & settings",
    icon: Store,
    badge: "Owner"
  },
  {
    role: "Manager",
    email: "demo.manager@karobar.test",
    password: "Karobar@12345",
    desc: "Store management & staff operations",
    icon: ShieldCheck,
    badge: "Manager"
  },
  {
    role: "Cashier",
    email: "demo.cashier@karobar.test",
    password: "Karobar@12345",
    desc: "Fast POS counter billing terminal",
    icon: Receipt,
    badge: "Counter POS"
  },
  {
    role: "Accountant",
    email: "demo.accountant@karobar.test",
    password: "Karobar@12345",
    desc: "Ledger, GST tax, expense audits",
    icon: Users,
    badge: "Finance"
  }
];

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn) navigate("/dashboard");
  }, [navigate]);

  const handleChange = (e) => {
    setHasError(false);
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const doLogin = async (credentials) => {
    setLoading(true);
    setHasError(false);
    try {
      const res = await API.post("/auth/login", credentials);
      const accessToken = res.data.token || res.data.data?.accessToken;
      const sessionRaw = res.data.user || res.data.data?.session || {};
      
      const userToStore = {
        id: sessionRaw.userId || sessionRaw.id || sessionRaw.user_id || null,
        user_id: sessionRaw.userId || sessionRaw.id || sessionRaw.user_id || null,
        staff_id: sessionRaw.staffId || sessionRaw.staff_id || null,
        role: sessionRaw.role || ((!sessionRaw.staffId && !sessionRaw.staff_id) ? 'Owner' : null),
        role_id: sessionRaw.roleId || sessionRaw.role_id || null,
        permissions: sessionRaw.permissions || ((!sessionRaw.staffId && !sessionRaw.staff_id) ? ['*'] : []),
        name: sessionRaw.name || '',
        email: sessionRaw.email || credentials.email || '',
        phone: sessionRaw.phone || '',
        organization_id: sessionRaw.organizationId || sessionRaw.organization_id || null,
        tenant_id: sessionRaw.organizationId || sessionRaw.organization_id || null,
        business_name: sessionRaw.business_name || sessionRaw.businessName || '',
        business_type: sessionRaw.business_type || sessionRaw.businessType || '',
        is_active: sessionRaw.is_active !== false,
      };
      
      setAccessToken(accessToken);
      localStorage.setItem("user", JSON.stringify(userToStore));
      localStorage.setItem("loggedIn", "true");
      
      toast.success("Welcome back! Loading your workspace...", {
        icon: '🚀',
        style: { borderRadius: '12px', background: '#111', color: '#fff' }
      });
      setTimeout(() => navigate("/dashboard"), 300);
    } catch (err) {
      setHasError(true);
      const msg = err.response?.data?.message || "Invalid email or password. Please try again.";
      toast.error(msg, {
        style: { borderRadius: '12px', background: '#222', color: '#fff' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doLogin(form);
  };

  const handleQuickDemo = (demo) => {
    setSelectedDemo(demo.email);
    setForm({ email: demo.email, password: demo.password });
    doLogin({ email: demo.email, password: demo.password });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-white font-sans bg-[#060709] relative overflow-hidden select-none">
      
      {/* Subtle Dot Matrix Background Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1.2px,transparent_1.2px)] [background-size:24px_24px] z-0" />
      
      {/* Ambient Radial Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Brand Nav */}
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
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Real-time Business OS
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Watch the crew follow you!
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm font-medium mb-6">
            Move your cursor around, or type your password to see them react.
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

          {/* 1-Click Demo Accounts Bar */}
          <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-blue-400" />
                <span className="text-xs font-bold text-gray-200">1-Click Demo Logins</span>
              </div>
              <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                Auto-fill
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((demo) => {
                const Icon = demo.icon;
                const isSelected = selectedDemo === demo.email;
                return (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleQuickDemo(demo)}
                    disabled={loading}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600/25 border-blue-500 text-white shadow-md shadow-blue-500/20' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs text-white truncate">{demo.role}</span>
                      <Icon size={12} className="text-blue-400 shrink-0" />
                    </div>
                    <span className="text-[10px] text-gray-400 truncate">{demo.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: Sign In Form Card
          ======================================================== */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px] bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl"
        >
          <div className="mb-6">
            <h1 className="text-3xl font-black mb-1.5 text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400">
              Welcome Back
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm font-medium">
              Enter your credentials to enter your store dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-400 transition-colors">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="email" 
                  name="email"
                  value={form.email}
                  placeholder="owner@karobar.test" 
                  className="w-full bg-[#121316] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  onChange={handleChange}
                  onFocus={() => setIsPasswordFocused(false)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 group">
              <div className="flex justify-between items-center pl-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest group-focus-within:text-blue-400 transition-colors">
                  Password
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)} 
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors pr-1 cursor-pointer bg-transparent border-0"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  placeholder="••••••••" 
                  className="w-full bg-[#121316] border border-white/10 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
                  onChange={handleChange}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
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

            {/* Submit Button */}
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit" 
              disabled={loading}
              className="w-full bg-white text-black font-black py-3.5 rounded-xl shadow-[0_0_25px_rgba(255,255,255,0.15)] hover:shadow-[0_0_35px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 transition-all disabled:opacity-70 mt-4 cursor-pointer text-sm"
            >
              {loading ? (
                <ClipLoader size={18} color="#000" />
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-gray-400 text-xs font-medium">
              Don't have an account yet?{" "}
              <Link to="/register" className="text-white font-bold hover:text-blue-400 transition-colors inline-flex items-center gap-1">
                Register now <ArrowRight size={12}/>
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#12141A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="text-blue-400 w-5 h-5" />
                <h3 className="font-bold text-base text-white">Account Password Recovery</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowForgotModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-300">
              For security, administrator and store staff accounts can be reset by contacting your system owner or superadmin.
            </p>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-gray-400">
              <p className="font-semibold text-white mb-1">Standard Demo Password:</p>
              <code className="text-blue-300 font-mono text-sm">Karobar@12345</code>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
