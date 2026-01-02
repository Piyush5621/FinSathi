import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    BarChart2,
    ShieldCheck,
    Zap,
    Globe,
    ChevronRight
} from 'lucide-react';
import logo from '../assets/logo.png'; // Assuming logo exists here based on other files

const LandingPage = () => {
    const navigate = useNavigate();
    const isLoggedIn = localStorage.getItem('loggedIn');

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white font-sans overflow-x-hidden">

            {/* 🟢 NAVBAR */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-white/20 dark:border-gray-800 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <img src={logo} alt="FinSathi" className="w-10 h-10 object-contain" />
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">FinSathi</span>
                    </div>

                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600 dark:text-gray-300">
                        <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">How it Works</a>
                        <a href="#testimonials" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Testimonials</a>
                    </div>

                    <div className="flex items-center space-x-4">
                        {isLoggedIn ? (
                            <Link
                                to="/dashboard"
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all duration-200"
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="px-4 py-2 text-sm font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* 🚀 HERO SECTION */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] mix-blend-multiply animate-blob" />
                    <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-multiply animate-blob animation-delay-2000" />
                </div>

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-8 border border-blue-100 dark:border-blue-800"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
                        New: GST Billing Support Available
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-gray-400"
                    >
                        Manage Business. <br />
                        <span className="text-blue-600">Multiply Growth.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed"
                    >
                        All-in-one platform for Indian MSMEs to manage billing, inventory, and customer insights.
                        Experience the power of smart automation.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            to="/register"
                            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            Start Free Trial <ArrowRight size={20} />
                        </Link>
                        <Link
                            to="/demo"
                            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
                        >
                            Watch Demo
                        </Link>
                    </motion.div>

                    {/* Hero Dashboard Preview (Glass Card) */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="mt-20 relative mx-auto max-w-5xl"
                    >
                        <div className="glass-card rounded-2xl p-4 border border-white/20 shadow-2xl overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 via-transparent to-transparent z-10 opacity-50"></div>
                            <img
                                src="https://cdn.dribbble.com/userupload/12470768/file/original-53badcf572ec574885567b5b2913e64b.png?resize=1200x900"
                                alt="FinSathi Dashboard"
                                className="w-full rounded-lg shadow-lg"
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ✨ FEATURES SECTION */}
            <section id="features" className="py-24 bg-white dark:bg-gray-900 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why FinSathi?</h2>
                        <p className="text-gray-500 dark:text-gray-400">Everything you need to run your business smoothly.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={BarChart2}
                            title="Smart Analytics"
                            desc="Visualize your sales trends, top products, and customer growth instantly."
                            color="text-blue-500"
                        />
                        <FeatureCard
                            icon={Zap}
                            title="Superfast Billing"
                            desc="Create GST-compliant invoices in seconds. Share directly via WhatsApp/Email."
                            color="text-yellow-500"
                        />
                        <FeatureCard
                            icon={ShieldCheck}
                            title="Secure & Reliable"
                            desc="Bank-grade security ensures your business data is safe and always accessible."
                            color="text-green-500"
                        />
                    </div>
                </div>
            </section>

            {/* 🦶 FOOTER */}
            <footer className="py-12 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-900">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center gap-2 mb-4 md:mb-0">
                        <img src={logo} alt="FinSathi" className="w-8 h-8 grayscale opacity-70" />
                        <span className="font-semibold text-gray-500">FinSathi</span>
                    </div>
                    <div className="text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} FinSathi Inc. All rights reserved.
                    </div>
                    <div className="flex gap-6 mt-4 md:mt-0">
                        <a href="#" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Globe size={20} /></a>
                    </div>
                </div>
            </footer>

        </div>
    );
};

// Sub-component for Feature Cards
const FeatureCard = ({ icon: Icon, title, desc, color }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl transition-all duration-300"
    >
        <div className={`w-12 h-12 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center mb-6 shadow-sm ${color}`}>
            <Icon size={24} />
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
            {desc}
        </p>
    </motion.div>
);

export default LandingPage;
