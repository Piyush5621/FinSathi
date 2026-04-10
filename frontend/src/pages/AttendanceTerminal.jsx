import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Lock, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AttendanceTerminal() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const bizId = searchParams.get('biz');
    
    const [staffNo, setStaffNo] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [scannedStaff, setScannedStaff] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!bizId) {
            toast.error("Invalid Store Terminal. Please scan again.");
            return;
        }
        if (!staffNo) return;

        setLoading(true);
        try {
            // 1. Find Staff by Unique No & Business ID
            const { data: staff, error: staffErr } = await supabase
                .from('staff')
                .select('*')
                .eq('qr_token', staffNo)
                .eq('user_id', bizId)
                .single();

            if (staffErr || !staff) {
                toast.error("Invalid Unique Number. Please check and try again.");
                setLoading(false);
                return;
            }

            // 2. Mark Attendance
            const today = new Date().toISOString().split('T')[0];
            const { error: attErr } = await supabase.from('attendance').upsert({
                staff_id: staff.id,
                user_id: bizId,
                date: today,
                status: 'present',
                clock_in: new Date().toISOString()
            }, { onConflict: 'staff_id, date' });

            if (attErr) {
                toast.error("Submission failed. Try again.");
            } else {
                setScannedStaff(staff);
                setSuccess(true);
                toast.success(`Welcome, ${staff.name}!`);
            }
        } catch (err) {
            console.error(err);
            toast.error("System error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-md text-center bg-white p-12 rounded-[48px] shadow-2xl border border-emerald-100"
                >
                    <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-emerald-200">
                        <CheckCircle2 size={48} />
                    </div>
                    <h1 className="text-[32px] font-black text-slate-900 mb-2">Authenticated!</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[13px] mb-8">Attendance Recorded Successfully</p>
                    
                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 mb-10">
                        <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Employee Profile</p>
                        <p className="text-[24px] font-black text-brand-navy mt-1">{scannedStaff?.name}</p>
                        <p className="text-brand-blue font-bold text-[14px] mt-1 italic">{scannedStaff?.position}</p>
                    </div>

                    <p className="text-slate-400 text-[14px] font-medium mb-12">
                        You can close this window now. Have a great day at work!
                    </p>

                    <Button variant="secondary" onClick={() => setSuccess(false)} className="w-full py-5 rounded-2xl font-black">
                        Mark Another
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full -translate-x-1/2 translate-y-1/2 blur-[80px]" />

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-brand-blue rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-brand-blue/30 mx-auto mb-6">
                        <UserCheck size={40} />
                    </div>
                    <h2 className="text-[32px] font-black text-white tracking-tight">Staff Check-In</h2>
                    <p className="text-slate-400 text-[14px] font-medium mt-2">Enter your unique staff ID to mark presence.</p>
                </div>

                <Card className="p-10 border-none bg-white/10 backdrop-blur-2xl rounded-[48px] shadow-3xl">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[12px] font-black text-brand-blue uppercase tracking-[0.2em] ml-2">Verification PIN</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Lock size={20} />
                                </span>
                                <input 
                                    type="text" 
                                    value={staffNo}
                                    onChange={e => setStaffNo(e.target.value)}
                                    placeholder="Enter 6-Digit No."
                                    className="w-full bg-white p-6 pl-14 rounded-3xl text-[20px] font-black text-brand-navy outline-none ring-4 ring-transparent focus:ring-brand-blue/20 transition-all placeholder:text-slate-300"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-7 rounded-[24px] font-black text-[18px] shadow-2xl shadow-brand-blue/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                        >
                            {loading ? "Verifying..." : "Mark Presence"}
                            {!loading && <ArrowRight size={22} />}
                        </Button>
                    </form>
                </Card>

                <div className="mt-12 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Secured Terminal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-brand-blue" />
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Real-Time Sync</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
