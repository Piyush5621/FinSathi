import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import logo from "../../assets/logo.png";
import { LogIn, ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';

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
      toast.success("Welcome back! 🎉", { style: { background: '#333', color: '#fff' }});
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed", { style: { background: '#333', color: '#fff' }});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-white font-sans bg-[#050505] relative overflow-hidden">
        
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px]"></div>
          <div className="absolute bottom-[10%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/10 blur-[100px]"></div>
          <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E')]"></div>
      </div>

      <Link to="/" className="absolute top-8 left-8 z-50 flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-white/10 transition-all">
              <img src={logo} alt="FinSathi" className="w-6 h-6 filter brightness-0 invert" style={{filter: 'brightness(0) invert(1)'}} />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">FinSathi</span>
      </Link>

      <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10 w-full lg:w-1/2">
          
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
             className="w-full max-w-[420px]"
          >
             <div className="mb-10">
                 <h1 className="text-4xl lg:text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Welcome Back</h1>
                 <p className="text-gray-400 text-lg font-medium">Sign in to your intelligent workspace.</p>
             </div>

             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2 group">
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-400 transition-colors">Email Address</label>
                   <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                       <input 
                          type="email" 
                          name="email"
                          placeholder="name@business.com" 
                          className="w-full bg-[#111] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                          onChange={handleChange}
                          required
                       />
                   </div>
                </div>

                <div className="space-y-2 group">
                   <div className="flex justify-between items-center pl-1">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-widest group-focus-within:text-blue-400 transition-colors">Password</label>
                     <Link to="/forgot" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors pr-1">Forgot?</Link>
                   </div>
                   <div className="relative">
                       <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                       <input 
                          type="password" 
                          name="password"
                          placeholder="••••••••" 
                          className="w-full bg-[#111] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                          onChange={handleChange}
                          required
                       />
                   </div>
                </div>

                <motion.button 
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   type="submit" 
                   disabled={loading}
                   className="w-full bg-white text-black font-black py-4 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 transition-shadow disabled:opacity-70 mt-4"
                >
                   {loading ? <ClipLoader size={22} color="#000" /> : <><LogIn size={20} /> Access Dashboard</>}
                </motion.button>
             </form>

             <div className="mt-10 pt-8 border-t border-white/10 text-center">
                <p className="text-gray-400 text-sm font-medium">
                   Don't have an account? <Link to="/register" className="text-white font-bold hover:text-blue-400 transition-colors inline-flex items-center gap-1">Create one <ArrowRight size={14}/></Link>
                </p>
             </div>
          </motion.div>
      </div>

      {/* Decorative Right Panel */}
      <div className="hidden lg:flex flex-1 relative bg-[#0A0A0A] border-l border-white/5 items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent"></div>
          
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 1, delay: 0.2 }}
             className="relative z-10 w-full max-w-[500px] aspect-square rounded-[3rem] border border-white/10 bg-black/40 backdrop-blur-3xl shadow-[0_0_80px_-20px_rgba(59,130,246,0.3)] flex flex-col items-center justify-center p-12 text-center"
          >
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-8 flex items-center justify-center shadow-2xl">
                  <ShieldCheck size={48} color="white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-4">Secure & Fast</h3>
              <p className="text-gray-400 text-lg">Your data is encrypted visually and procedurally. We take your business as seriously as you do.</p>
          </motion.div>
      </div>
    </div>
  );
};

export default Login;
