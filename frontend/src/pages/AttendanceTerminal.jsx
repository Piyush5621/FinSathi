import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/apiClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Lock, CheckCircle2, Clock, ArrowRight, ShieldCheck, 
  UserCheck, Delete, RotateCcw, Building2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function AttendanceTerminal() {
  const [searchParams] = useSearchParams();
  const bizId = searchParams.get('biz');
  
  const [staffNo, setStaffNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scannedStaff, setScannedStaff] = useState(null);

  const handleKeypadPress = (val) => {
    if (staffNo.length < 10) {
      setStaffNo(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    setStaffNo(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStaffNo('');
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!bizId) {
      toast.error("Invalid Store Terminal. Please scan again.");
      return;
    }
    if (!staffNo) {
      toast.error("Please enter your staff PIN");
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post('/kiosk/attendance', {
        bizId,
        staffNo,
        clock_in: new Date().toISOString()
      });

      setScannedStaff(data.staff);
      setSuccess(true);
      toast.success(`Welcome, ${data.staff?.name || 'Staff'}!`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Verification failed. Please check your PIN.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 text-center shadow-2xl border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={42} />
          </div>

          <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-wider rounded-full mb-3">
            Authenticated
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Attendance Logged!</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 mb-6">
            Your presence has been recorded in real-time.
          </p>
          
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8 text-left space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Employee Profile</p>
            <p className="text-xl font-black text-slate-900">{scannedStaff?.name}</p>
            <p className="text-xs font-bold text-indigo-600">{scannedStaff?.position || 'Staff Member'}</p>
            <p className="text-[11px] text-slate-400 pt-1">Clock-in: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          <p className="text-xs text-slate-400 font-medium mb-6">
            You may now close this window or check in another team member.
          </p>

          <Button 
            variant="secondary" 
            onClick={() => { setSuccess(false); setStaffNo(''); }} 
            className="w-full py-4 rounded-xl font-black text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all"
          >
            Mark Another Check-In
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-white selection:bg-indigo-500">
      <motion.div 
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Terminal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30 mb-2">
            <UserCheck size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Staff Attendance Terminal</h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Enter your 6-digit staff PIN to clock in for today
          </p>
        </div>

        {/* PIN Input & Keypad Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <label className="text-[11px] font-black text-indigo-400 uppercase tracking-wider">Worker PIN</label>
                <span className="text-[11px] text-slate-500 font-medium">Touch or keyboard input</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  inputMode="numeric"
                  value={staffNo}
                  onChange={e => setStaffNo(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-center font-mono text-2xl tracking-[0.4em] font-black text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Quick Touch Keypad for Kiosk/Tablet Screens */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(String(num))}
                  className="py-3.5 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-white font-black text-xl rounded-xl border border-slate-700/50 transition-all cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-3.5 bg-slate-800/40 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-white font-bold text-xs uppercase rounded-xl border border-slate-800 transition-all flex items-center justify-center"
                title="Clear"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-3.5 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-white font-black text-xl rounded-xl border border-slate-700/50 transition-all"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-3.5 bg-slate-800/40 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-white font-bold text-xs uppercase rounded-xl border border-slate-800 transition-all flex items-center justify-center"
                title="Backspace"
              >
                <Delete size={18} />
              </button>
            </div>

            <Button 
              type="submit" 
              disabled={loading || !staffNo}
              className="w-full py-4 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? "Verifying..." : "Mark Attendance"}
              {!loading && <ArrowRight size={18} />}
            </Button>
          </form>
        </div>

        {/* Footer Security Badges */}
        <div className="flex justify-center items-center gap-6 text-[11px] font-bold text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Encrypted Terminal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-indigo-400" />
            <span>Live Cloud Sync</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
