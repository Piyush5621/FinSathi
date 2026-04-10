
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    BarChart2,
    ShieldCheck,
    Zap,
    CheckCircle2
} from 'lucide-react';
import logo from '../assets/logo.png';

const LandingPage = () => {
    const isLoggedIn = localStorage.getItem('loggedIn');

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-inter selection:bg-[#3B82F6] selection:text-white overflow-hidden">

            {/* NAVBAR */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0]">
                <div className="max-w-7xl mx-auto px-6 h-[80px] flex items-center justify-between">
                    <div className="flex items-center gap-[12px]">
                        <img src={logo} alt="FinSathi" className="w-[40px] h-[40px]" />
                        <span className="text-[24px] font-bold tracking-tight text-[#1E293B]">FinSathi</span>
                    </div>

                    <div className="hidden md:flex items-center gap-[40px] text-[14px] font-bold text-[#64748B]">
                        <a href="#features" className="hover:text-[#3B82F6] transition-colors">Solutions</a>
                        <a href="#growth" className="hover:text-[#3B82F6] transition-colors">Growth</a>
                        <a href="#about" className="hover:text-[#3B82F6] transition-colors">Enterprise</a>
                    </div>

                    <div className="flex items-center gap-[16px]">
                        {isLoggedIn ? (
                            <Link
                                to="/dashboard"
                                className="px-[24px] py-[12px] rounded-xl bg-[#1E293B] text-white font-bold text-[14px] hover:bg-[#0F172A] transition-all shadow-lg shadow-navy-900/20"
                            >
                                Open Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="px-[20px] py-[10px] text-[14px] font-bold text-[#1E293B] hover:text-[#3B82F6] transition-colors">
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="hidden sm:flex px-[24px] py-[12px] rounded-xl bg-[#3B82F6] text-white font-bold text-[14px] hover:bg-[#2563EB] transition-all shadow-lg shadow-blue-500/20"
                                >
                                    Start Free
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="relative pt-[160px] pb-[80px] px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center px-[16px] py-[8px] rounded-full bg-[#EFF6FF] text-[#1E40AF] text-[13px] font-bold mb-[32px] border border-[#BFDBFE]"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-[#3B82F6] mr-2 animate-pulse"></span>
                        Built for Indian MSMEs
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-[48px] md:text-[80px] font-extrabold tracking-tight leading-[1] mb-[32px] text-[#0F172A]"
                    >
                        Master your Money. <br />
                        <span className="text-[#3B82F6]">Grow your Legacy.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-[18px] md:text-[20px] text-[#64748B] max-w-2xl mx-auto mb-[48px] leading-relaxed font-medium"
                    >
                        FinSathi is the definitive operating system for modern business. 
                        Professional billing, intelligent inventory, and state-of-the-art financial insights.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-[16px] mb-[80px]"
                    >
                        <Link
                            to="/register"
                            className="w-full sm:w-auto px-[40px] py-[20px] bg-[#1E293B] text-white font-extrabold rounded-2xl shadow-2xl hover:bg-[#0F172A] hover:-translate-y-1 transition-all flex items-center justify-center gap-[12px] text-[16px]"
                        >
                            Get Started Now <ArrowRight size={20} />
                        </Link>
                        <Link
                            to="/login"
                            className="w-full sm:w-auto px-[40px] py-[20px] bg-white text-[#1E293B] font-extrabold rounded-2xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all text-[16px]"
                        >
                            Professional Login
                        </Link>
                    </motion.div>

                    {/* Dashboard Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="relative mx-auto max-w-5xl rounded-[32px] border-[8px] border-white shadow-2xl overflow-hidden bg-white"
                    >
                        <img
                            src="https://images.unsplash.com/photo-1551288049-bbbda5366392?q=80&w=2070&auto=format&fit=crop"
                            alt="FinSathi Dashboard Analytics"
                            className="w-full grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
                        />
                         <div className="absolute inset-x-0 bottom-0 h-[200px] bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    </motion.div>
                </div>
            </section>

            {/* FEATURES SECTION */}
            <section id="features" className="py-[120px] bg-white">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h2 className="text-[32px] md:text-[42px] font-extrabold mb-[64px] tracking-tight text-[#0F172A]">Precision Engineered Features</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[40px]">
                        <FeatureCard
                            icon={Zap}
                            title="Instant GST Billing"
                            desc="Generate professional, compliant invoices in under 10 seconds. Automated tax calculations."
                        />
                        <FeatureCard
                            icon={BarChart2}
                            title="Decision Intelligence"
                            desc="Stop guessing. Our deep analytics reveal your most profitable products and sales trends."
                        />
                        <FeatureCard
                            icon={ShieldCheck}
                            title="Bank-Grade Security"
                            desc="Your financial data is encrypted and backed up 24/7. Your privacy is our highest priority."
                        />
                    </div>
                </div>
            </section>

            {/* TRUST SECTION */}
            <section id="growth" className="py-[100px] bg-[#1E293B] text-white text-center">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-[32px] font-bold mb-[24px]">Trusted by thousands of retailers nationwide</h2>
                    <p className="text-[#94A3B8] text-[18px] mb-[48px]">Join the movement that's digitizing the cornerstone of the Indian economy.</p>
                    <div className="flex flex-wrap justify-center gap-[40px]">
                         {['Kirana Stores','Pharmacy','DTC Brands','Consultants'].map(cat => (
                             <div key={cat} className="flex items-center gap-[8px] text-[14px] font-bold text-[#CBD5F5]">
                                <CheckCircle2 size={18} className="text-[#3B82F6]"/> {cat}
                             </div>
                         ))}
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-[80px] bg-[#F8FAFC] border-t border-[#E2E8F0]">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-[32px]">
                    <div className="flex items-center gap-[12px]">
                        <img src={logo} alt="FinSathi" className="w-[32px] h-[32px] opacity-80" />
                        <span className="font-bold text-[#64748B] text-[18px]">FinSathi</span>
                    </div>
                    <div className="text-[14px] text-[#94A3B8] font-medium">
                        &copy; {new Date().getFullYear()} FinSathi Digital Technologies PVT LTD. Bangalore, India.
                    </div>
                    <div className="flex gap-[24px] text-[14px] font-bold text-[#64748B]">
                        <a href="#" className="hover:text-[#3B82F6]">Privacy</a>
                        <a href="#" className="hover:text-[#3B82F6]">Terms</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon: Icon, title, desc }) => (
    <div className="text-left p-[40px] rounded-[32px] bg-[#F8FAFC] border border-[#E2E8F0] transition-transform hover:-translate-y-2">
        <div className="w-[56px] h-[56px] rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center mb-[32px] text-[#3B82F6]">
            <Icon size={28} />
        </div>
        <h3 className="text-[20px] font-bold mb-[16px] text-[#0F172A]">{title}</h3>
        <p className="text-[#64748B] leading-relaxed text-[15px] font-medium">
            {desc}
        </p>
    </div>
);

export default LandingPage;
