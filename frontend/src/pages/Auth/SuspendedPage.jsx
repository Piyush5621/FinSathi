import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Mail, ArrowLeft, ShieldAlert } from 'lucide-react';
import logo from "../../assets/logo.png";

const SuspendedPage = () => {
  return (
    <div className="min-h-screen flex text-white font-sans bg-[#050505] relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-rose-600/10 blur-[120px]"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-red-600/10 blur-[100px]"></div>
          <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E')]"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10 w-full">
          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.5 }}
             className="w-full max-w-[500px] bg-[#0A0A0A] border border-rose-500/30 rounded-[2rem] p-10 text-center shadow-[0_0_80px_-20px_rgba(225,29,72,0.3)] relative overflow-hidden"
          >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-rose-400"></div>
              
              <div className="w-20 h-20 mx-auto bg-rose-500/20 rounded-full flex flex-col items-center justify-center mb-6 shadow-2xl">
                  <ShieldAlert size={36} className="text-rose-500" />
              </div>
              
              <h1 className="text-3xl font-black mb-4 text-white">Account Suspended</h1>
              
              <div className="p-6 bg-rose-950/30 rounded-2xl border border-rose-900/50 mb-8 inline-block text-left w-full">
                 <p className="text-gray-300 text-[15px] leading-relaxed mb-4">
                     Your workspace access has been temporarily restricted by the system administrator. This usually happens due to:
                 </p>
                 <ul className="text-gray-400 text-[14px] space-y-2 mb-0">
                     <li className="flex items-center gap-2"><AlertTriangle size={14} className="text-rose-400" /> Billing or subscription issues</li>
                     <li className="flex items-center gap-2"><AlertTriangle size={14} className="text-rose-400" /> Terms of Service violations</li>
                     <li className="flex items-center gap-2"><AlertTriangle size={14} className="text-rose-400" /> Security flags on your account</li>
                 </ul>
              </div>

              <div className="flex flex-col gap-4">
                  <a href="mailto:admin@finsathi.com" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-4 rounded-xl shadow-[0_0_30px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2 transition-colors">
                     <Mail size={18} /> Contact Support
                  </a>
                  
                  <Link to="/" className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors">
                     <ArrowLeft size={18} /> Return to Home
                  </Link>
              </div>

              <p className="text-gray-500 text-xs font-medium mt-8">
                 Error Code: ERR_ACCOUNT_SUSPENDED
              </p>
          </motion.div>
      </div>
    </div>
  );
};

export default SuspendedPage;
