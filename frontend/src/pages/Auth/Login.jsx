import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";
import API, { setAccessToken } from "../../services/apiClient";
import logo from "../../assets/logo.png";
import { 
  LogIn, ArrowRight, Lock, Mail, ShieldCheck, 
  Sparkles, KeyRound, Store, Users, Receipt, Package, Check, X, HelpCircle
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: "Owner (Kirana)",
    email: "demo.owner@karobar.test",
    password: "Karobar@12345",
    desc: "Sharma General Store (Full Access)",
    icon: Store,
    badge: "Full Access"
  },
  {
    role: "Manager",
    email: "demo.manager@karobar.test",
    password: "Karobar@12345",
    desc: "Store management & staff operations",
    icon: ShieldCheck,
    badge: "Operations"
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
  },
  {
    role: "Warehouse Staff",
    email: "demo.inventory@karobar.test",
    password: "Karobar@12345",
    desc: "Catalog, batches, stock receiving",
    icon: Package,
    badge: "Inventory"
  }
];

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn) navigate("/dashboard");
  }, [navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const doLogin = async (credentials) => {
    setLoading(true);
    try {
      const res = await API.post("/auth/login", credentials);
      const accessToken = res.data.token || res.data.data?.accessToken;
      // Get session data — prefer structured session, fallback to legacy user
      const sessionRaw = res.data.user || res.data.data?.session || {};
      
      // Normalize the user object stored in localStorage for nav/RBAC use
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
        // Preserve legacy fields if present
        business_name: sessionRaw.business_name || sessionRaw.businessName || '',
        business_type: sessionRaw.business_type || sessionRaw.businessType || '',
        is_active: sessionRaw.is_active !== false,
      };
      
      setAccessToken(accessToken);
      localStorage.setItem("user", JSON.stringify(userToStore));
      localStorage.setItem("loggedIn", "true");
      
      // If staff login, also store active store context if provided
      if (sessionRaw.storeId || sessionRaw.store_id) {
        localStorage.setItem("activeStoreId", sessionRaw.storeId || sessionRaw.store_id);
      }
      
      toast.success("Welcome back! 🎉", { style: { background: '#333', color: '#fff' }});
      setTimeout(() => navigate("/dashboard"), 400);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed", { style: { background: '#333', color: '#fff' }});
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await doLogin(form);
  };

  const handleQuickDemo = async (demo) => {
    setSelectedDemo(demo.email);
    setForm({ email: demo.email, password: demo.password });
    await doLogin({ email: demo.email, password: demo.password });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-white font-sans bg-[#050505] relative overflow-hidden">
        
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px]"></div>
          <div className="absolute bottom-[10%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/10 blur-[100px]"></div>
          <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E')]"></div>
      </div>

      {/* Top Left Logo Brand */}
      <Link to="/" className="absolute top-6 left-6 z-50 flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-white/10 transition-all">
              <img src={logo} alt="Karobar" className="w-6 h-6 filter brightness-0 invert" style={{filter: 'brightness(0) invert(1)'}} />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">Karobar</span>
      </Link>

      {/* Left Area: Main Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 pt-24 lg:pt-6 relative z-10 w-full lg:w-1/2">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
             className="w-full max-w-[420px]"
          >
             <div className="mb-8">
                 <h1 className="text-3xl lg:text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Welcome Back</h1>
                 <p className="text-gray-400 text-sm font-medium">Sign in to your KaroBar business command center.</p>
             </div>

             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 group">
                   <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-400 transition-colors">Email Address</label>
                   <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                       <input 
                          type="email" 
                          name="email"
                          value={form.email}
                          placeholder="name@business.com" 
                          className="w-full bg-[#111] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                          onChange={handleChange}
                          required
                       />
                   </div>
                </div>

                <div className="space-y-1.5 group">
                    <div className="flex justify-between items-center pl-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest group-focus-within:text-blue-400 transition-colors">Password</label>
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
                          type="password" 
                          name="password"
                          value={form.password}
                          placeholder="••••••••" 
                          className="w-full bg-[#111] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                          onChange={handleChange}
                          required
                       />
                   </div>
                </div>

                <motion.button 
                   whileHover={{ scale: 1.01 }}
                   whileTap={{ scale: 0.99 }}
                   type="submit" 
                   disabled={loading}
                   className="w-full bg-white text-black font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 transition-all disabled:opacity-70 mt-3 cursor-pointer text-sm"
                >
                   {loading ? <ClipLoader size={18} color="#000" /> : <><LogIn size={16} /> Sign In</>}
                </motion.button>
             </form>

             <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <p className="text-gray-400 text-xs font-medium">
                   Don't have an account? <Link to="/register" className="text-white font-bold hover:text-blue-400 transition-colors inline-flex items-center gap-1">Create one <ArrowRight size={12}/></Link>
                </p>
             </div>
          </motion.div>
      </div>

      {/* Right Area: Interactive Demo Credentials & Quick Login Hub */}
      <div className="flex-1 relative bg-[#0A0A0A] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-center items-center p-6 sm:p-10">
          <div className="w-full max-w-[500px] space-y-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <KeyRound size={16} />
                      </div>
                      <div>
                          <h2 className="text-base font-black text-white tracking-tight">Demo Credentials & Quick Login</h2>
                          <p className="text-[11px] text-gray-400">Click any role to auto-fill & login instantly</p>
                      </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-gray-300">
                    PW: Karobar@12345
                  </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEMO_ACCOUNTS.map((demo) => {
                      const Icon = demo.icon;
                      const isSelected = selectedDemo === demo.email;
                      return (
                          <button
                              key={demo.email}
                              type="button"
                              onClick={() => handleQuickDemo(demo)}
                              disabled={loading}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer relative overflow-hidden ${
                                  isSelected 
                                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-200'
                              }`}
                          >
                              <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2 min-w-0">
                                      <div className="p-1.5 rounded-lg bg-white/10 text-blue-400 shrink-0">
                                          <Icon size={14} />
                                      </div>
                                      <span className="font-bold text-xs text-white truncate">{demo.role}</span>
                                  </div>
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-300 shrink-0">
                                      {demo.badge}
                                  </span>
                              </div>

                              <div className="space-y-0.5">
                                  <p className="font-mono text-[11px] text-blue-300 truncate font-semibold">
                                      {demo.email}
                                  </p>
                                  <p className="text-[10px] text-gray-400 truncate">
                                      {demo.desc}
                                  </p>
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 pt-1 border-t border-white/5">
                                  <span>1-Click Login</span>
                                  <ArrowRight size={10} className="text-blue-400" />
                              </div>
                          </button>
                      );
                  })}
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-center">
                  <p className="text-[11px] text-blue-200 font-medium">
                    ⚡ <strong>Multi-Tenant Isolated Data:</strong> Each role demonstrates its tailored perspective with pre-populated invoices, batches, ledger khata, and real-time metrics.
                  </p>
              </div>
          </div>
      </div>

      {/* Forgot Password Recovery Guidance Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#161922] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="text-blue-400 w-5 h-5" />
                <h3 className="font-bold text-base text-white">Account Password Recovery</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowForgotModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="font-semibold text-blue-300 mb-1">Are you an Employee or Cashier?</p>
                <p>Please contact your <strong>Store Owner or Store Manager</strong>. They can reset your password or assign a new login PIN instantly in the <strong>Staff Hub</strong>.</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="font-semibold text-emerald-300 mb-1">Are you the Store Owner?</p>
                <p>For primary account recovery and verified phone reset, contact KaroBar Support:</p>
                <p className="mt-1 font-mono text-emerald-200">📧 support@karobar.in</p>
                <p className="font-mono text-emerald-200">📞 +91 98765 43210 (Mon-Sat, 9AM - 8PM)</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Understood, Return to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
