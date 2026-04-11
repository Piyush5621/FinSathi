import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BarChart2, ShieldCheck, Zap, Layers, Menu, X, CheckSquare, Target, BookOpen, Users, Star, ArrowUpRight } from 'lucide-react';
import logo from '../assets/logo.png';

const LandingPage = () => {
    const isLoggedIn = localStorage.getItem('loggedIn');
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: "Features", href: "#features" },
        { name: "How to Join", href: "#join" },
        { name: "How it Works", href: "#how-it-works" },
        { name: "About Us", href: "#about" },
    ];

    const scrollToSection = (href) => {
        setMobileMenuOpen(false);
        const element = document.querySelector(href);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#FAFAFA] font-sans selection:bg-[#4F46E5] selection:text-white scroll-smooth overflow-x-hidden">
            
            {/* NOISE & GRADIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")'}}></div>
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#4F46E5]/20 blur-[120px] pointer-events-none z-0"></div>
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#E11D48]/10 blur-[120px] pointer-events-none z-0"></div>

            {/* NAVBAR */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 blur-[10px] opacity-40 rounded-full" />
                            <img src={logo} alt="FinSathi" className="w-10 h-10 relative z-10 drop-shadow-2xl" />
                        </div>
                        <span className="text-2xl font-extrabold tracking-tight text-white">FinSathi</span>
                    </motion.div>

                    <div className="hidden lg:flex items-center gap-8 bg-white/5 border border-white/10 px-8 py-3 rounded-full backdrop-blur-md">
                        {navLinks.map((link) => (
                            <button key={link.name} onClick={() => scrollToSection(link.href)} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors relative group">
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full"></span>
                            </button>
                        ))}
                    </div>

                    <div className="hidden lg:flex items-center gap-4">
                        {isLoggedIn ? (
                            <Link to="/dashboard" className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/10 backdrop-blur-md">
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="px-5 py-2.5 text-sm font-bold text-gray-300 hover:text-white transition-colors">
                                    Sign In
                                </Link>
                                <Link to="/register" className="relative group px-6 py-2.5 rounded-full bg-[#FFFFFF] text-[#050505] font-black text-sm hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]">
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>

                    <button className="lg:hidden text-white relative z-50" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </nav>

            {/* MOBILE MENU */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-40 bg-[#050505]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 px-6"
                    >
                        {navLinks.map((link) => (
                            <button key={link.name} onClick={() => scrollToSection(link.href)} className="text-2xl font-bold text-white hover:text-blue-400">
                                {link.name}
                            </button>
                        ))}
                        <div className="flex flex-col w-full max-w-xs gap-4 mt-8">
                            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full py-4 rounded-xl border border-white/20 text-center font-bold text-white">Log In</Link>
                            <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="w-full py-4 rounded-xl bg-white text-black text-center font-black">Get Started</Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HERO SECTION */}
            <section className="relative pt-48 pb-32 px-6 flex flex-col items-center justify-center min-h-[90vh] z-10 text-center">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Intelligent OS for Business
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-5xl md:text-7xl lg:text-[88px] font-black tracking-tighter leading-[1.05] mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/60 max-w-5xl">
                    Command your empire.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]">Automate your legacy.</span>
                </motion.h1>

                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12 font-medium leading-relaxed">
                    FinSathi is a relentlessly powerful financial and operations engine. Manage invoices, inventory, analytics, and people in one extraordinarily beautiful workspace.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-white text-black font-extrabold rounded-full hover:scale-105 transition-all flex items-center justify-center gap-2 text-lg shadow-[0_0_40px_-5px_rgba(255,255,255,0.3)]">
                        Launch Your Workspace <ArrowUpRight className="bg-black text-white rounded-full p-1 w-6 h-6" />
                    </Link>
                    <button onClick={() => scrollToSection('#features')} className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white border border-white/10 font-bold rounded-full hover:bg-white/10 transition-all text-lg backdrop-blur-md">
                        Explore Features
                    </button>
                </motion.div>
                
                {/* Scroll Indicator */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="absolute bottom-10 left-1 /2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40">
                    <span className="text-xs uppercase tracking-widest font-bold">Scroll to discover</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-white/40 to-transparent"></div>
                </motion.div>
            </section>

            {/* DASHBOARD PREVIEW */}
            <section className="relative px-6 pb-40 z-10 max-w-[1400px] mx-auto">
                <motion.div initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1 }} className="relative rounded-[2rem] border border-white/10 bg-white/5 p-2 backdrop-blur-3xl shadow-[0_0_100px_-20px_rgba(168,85,247,0.3)]">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-transparent to-pink-500/20 rounded-[2rem] opacity-50 blur-xl"></div>
                    <div className="relative rounded-[1.5rem] overflow-hidden bg-[#0A0A0A] aspect-[16/9] border border-white/10">
                         {/* We can use an image or simply represent a dynamic UI representation */}
                         <img src="https://images.unsplash.com/photo-1551288049-bbbda5366392?q=80&w=2070&auto=format&fit=crop" alt="Dashboard App Interface" className="w-full h-full object-cover object-left-top opacity-90 hover:opacity-100 transition-opacity duration-700" />
                         <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent"></div>
                    </div>
                </motion.div>
            </section>

            {/* FEATURES SECTION */}
            <section id="features" className="py-32 relative z-10 border-t border-white/5 bg-[#050505]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-24">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-blue-500 mb-4">Ecosystem</h2>
                        <h3 className="text-4xl md:text-5xl font-black text-white mb-6">Built for ultimate leverage.</h3>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">Every module is designed to eliminate friction and multiply output.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureBox icon={Zap} title="Hyper-Speed Billing" desc="Create instant, GST-compliant invoices in under 5 seconds. Transform your checkout process." delay={0.1} />
                        <FeatureBox icon={BarChart2} title="Deep Analytics" desc="Dynamic heatmaps, profit trackers, and predictive inventory warnings right on your home screen." delay={0.2} />
                        <FeatureBox icon={Target} title="Smart Inventory" desc="Automatic low-stock alerts and expiration tracking. Never lose a sale or waste stock again." delay={0.3} />
                        <FeatureBox icon={Users} title="Staff Hub" desc="Manage employee payroll, track live attendance, and automate incentive payouts without spreadsheets." delay={0.4} />
                        <FeatureBox icon={CheckSquare} title="Expense Engine" desc="A unified ledger for all logistics and business expenses, automatically integrated with P&L." delay={0.5} />
                        <FeatureBox icon={ShieldCheck} title="Ironclad Security" desc="Bank-grade encryption, secure JWT sessions, and daily cloud backups protect your livelihood." delay={0.6} />
                    </div>
                </div>
            </section>

            {/* WORKFLOW / STEPS TO USE */}
            <section id="how-it-works" className="py-32 relative z-10 bg-[#0A0A0A]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row gap-16 items-center">
                        <div className="lg:w-1/2">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-purple-500 mb-4">Workflow</h2>
                            <h3 className="text-4xl md:text-5xl font-black text-white mb-6">How to command FinSathi.</h3>
                            <p className="text-gray-400 text-lg mb-12">Stop fighting scattered tools. Operate your entire business via one unified pipeline.</p>
                            
                            <div className="space-y-12">
                                <StepItem num="01" title="Register & Set Up" desc="Create your account, add your business details, and import existing inventory in one click." />
                                <StepItem num="02" title="Daily Execution" desc="Bill customers, log expenses, and let staff mark attendance using our streamlined terminals." />
                                <StepItem num="03" title="Grow & Analyze" desc="At day's end, view your P&L, see which products made you rich today, and plan tomorrow." />
                            </div>
                        </div>
                        <div className="lg:w-1/2 relative">
                            <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once:true }} className="relative rounded-3xl border border-white/10 bg-[#111] p-8 overflow-hidden shadow-2xl">
                                <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[100%] rounded-full bg-purple-500/10 blur-[80px]" />
                                <div className="space-y-4 relative z-10">
                                    <div className="h-12 w-full bg-white/5 rounded-xl border border-white/10 animate-pulse" />
                                    <div className="h-32 w-full bg-white/5 rounded-xl border border-white/10" />
                                    <div className="flex gap-4">
                                        <div className="h-40 w-1/2 bg-white/5 rounded-xl border border-white/10" />
                                        <div className="h-40 w-1/2 bg-white/5 rounded-xl border border-white/10" />
                                    </div>
                                    <div className="h-16 w-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW TO JOIN */}
            <section id="join" className="py-32 relative z-10 border-t border-white/5 bg-[#050505]">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <motion.div initial={{ opacity:0, y: 20}} whileInView={{ opacity:1, y:0 }} viewport={{once:true}} className="p-[2px] rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                        <div className="bg-[#0A0A0A] rounded-[22px] px-8 py-16 sm:px-16 sm:py-24">
                            <h3 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to upgrade your business?</h3>
                            <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">Join thousands of Indian businesses modernizing their operations without massive tech overhead. No credit card required to start.</p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link to="/register" className="px-10 py-5 bg-white text-black font-black text-lg rounded-full hover:scale-105 transition-all shadow-xl shadow-white/10">
                                    Start Free Trial
                                </Link>
                                <a href="#about" className="px-10 py-5 bg-transparent border border-white/20 text-white font-bold text-lg rounded-full hover:bg-white/5 transition-all">
                                    Read Our Story
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ABOUT US */}
            <section id="about" className="py-32 relative z-10 bg-[#0A0A0A]">
                 <div className="max-w-7xl mx-auto px-6">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once:true }}>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-500 mb-4">Our Mission</h2>
                            <h3 className="text-4xl md:text-5xl font-black text-white mb-6">Empowering the backbone of the economy.</h3>
                            <div className="space-y-6 text-gray-400 text-lg">
                                <p>We observed that while huge enterprises had access to cutting-edge software, local MSMEs and retailers were stuck with slow, complicated, or obscenely expensive tools.</p>
                                <p><strong>FinSathi</strong> was born out of a desire to equalize the playing field. We build software that feels like an enterprise tool, looks like magic, but is so intuitive that anyone can use it on day one.</p>
                                <p>Our team is obsessed with speed, design, and reliability. If an action takes 5 clicks, we reduce it to 1.</p>
                            </div>
                        </motion.div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#111] p-8 rounded-3xl border border-white/5 text-center mt-12 shadow-xl">
                                <div className="text-5xl font-black text-white mb-2">10k+</div>
                                <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">Active Users</div>
                            </div>
                            <div className="bg-[#111] p-8 rounded-3xl border border-emerald-500/20 text-center shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)]">
                                <div className="text-5xl font-black text-emerald-400 mb-2">₹1B+</div>
                                <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">Invoices Handled</div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-8 rounded-3xl border border-blue-500/30 text-center col-span-2 shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)]">
                                <div className="text-3xl font-black text-white mb-2">"A game changer."</div>
                                <div className="flex justify-center gap-1 mb-2">
                                    {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="#FBBF24" color="#FBBF24" />)}
                                </div>
                                <div className="text-sm text-gray-400 font-medium">Rajesh K, Retail Owner</div>
                            </div>
                        </div>
                     </div>
                 </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12 bg-[#050505] border-t border-white/10 relative z-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <img src={logo} alt="FinSathi" className="w-8 h-8 opacity-80 backdrop-blur-sm drop-shadow-lg filter brightness-0 invert" style={{filter: 'brightness(0) invert(1)'}} />
                        <span className="font-extrabold text-white text-xl tracking-tight">FinSathi</span>
                    </div>
                    <div className="text-sm text-gray-500 font-medium font-mono text-center md:text-left">
                        &copy; {new Date().getFullYear()} FinSathi Digital Technologies. <br className="md:hidden"/> All rights reserved.
                    </div>
                    <div className="flex gap-8 text-sm font-bold text-gray-400">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Sub-components
const FeatureBox = ({ icon: Icon, title, desc, delay }) => (
    <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true }} 
        transition={{ delay, duration: 0.5 }}
        className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 group hover:-translate-y-2 backdrop-blur-sm"
    >
        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-6 text-white group-hover:scale-110 group-hover:border-blue-400/50 transition-all duration-300 shadow-lg">
            <Icon size={26} />
        </div>
        <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
        <p className="text-gray-400 leading-relaxed text-sm font-medium">
            {desc}
        </p>
    </motion.div>
);

const StepItem = ({ num, title, desc }) => (
    <div className="relative pl-12 border-l-2 border-white/10 group hover:border-purple-500 transition-colors pb-12 last:pb-0">
        <div className="absolute top-0 left-[-17px] w-8 h-8 rounded-full bg-[#111] border-2 border-white/20 group-hover:border-purple-500 group-hover:bg-purple-500/20 text-xs font-black flex items-center justify-center text-white transition-all">
            {num}
        </div>
        <h4 className="text-2xl font-bold text-white mb-2">{title}</h4>
        <p className="text-gray-400 text-lg leading-relaxed">{desc}</p>
    </div>
);

export default LandingPage;
