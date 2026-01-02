import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Receipt,
  BarChart2,
  Settings,
  Menu,
  X,
  LogOut,
  DollarSign,
  Briefcase
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/billing', label: 'Billing / POS', icon: Receipt },
  { path: '/invoice-history', label: 'Invoices', icon: BarChart2 },
  { path: '/payments', label: 'Payments', icon: DollarSign },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const MenuItem = ({ item, isActive, isCollapsed }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className={`relative flex items-center p-3 mb-2 rounded-r-xl transition-all duration-300 group overflow-hidden ${isActive
        ? 'bg-gradient-to-r from-indigo-600/90 to-violet-600/80 text-white shadow-xl shadow-indigo-500/20 border-l-4 border-white' // Active State
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white' // Inactive State
        } ${isCollapsed ? 'justify-center rounded-xl' : 'rounded-xl'}`}
    >
      {/* Active Indicator Glow */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 z-[-1]" />
      )}

      <Icon
        className={`h-5 w-5 relative z-10 transition-transform duration-300 group-hover:scale-110 ${isCollapsed ? '' : 'mr-3'} ${isActive
          ? 'text-white'
          : 'text-slate-500 group-hover:text-white'
          }`}
      />
      {!isCollapsed && (
        <span className="text-sm font-semibold tracking-wide relative z-10">{item.label}</span>
      )}
    </Link>
  );
};

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const sidebarContent = (
    <div className={`h-screen flex flex-col ${isCollapsed ? 'w-20' : 'w-72'
      } bg-[#0f172a] border-r border-slate-800 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] relative z-50`}
    >
      {/* Logo */}
      <div className="flex flex-col p-6 mb-2">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
                <Briefcase className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  FinSathi
                </h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                  Business OS
                </p>
              </div>
            </motion.div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <MenuItem
            key={item.path}
            item={item}
            isActive={location.pathname === item.path}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/30">
        <Link
          to="/logout"
          className={`flex items-center w-full p-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} group-hover:text-rose-400`} />
          {!isCollapsed && (
            <span className="text-sm font-semibold">Sign Out</span>
          )}
        </Link>
      </div>
    </div>
  );

  // Mobile menu button
  const mobileMenuButton = (
    <button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-800 text-white shadow-xl border border-slate-700 lg:hidden"
    >
      {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
    </button>
  );

  // Mobile sidebar (drawer)
  const mobileSidebar = (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 z-50 lg:hidden h-full shadow-2xl"
          >
            {sidebarContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </div>
      {mobileMenuButton}
      {mobileSidebar}
    </>
  );
};

export default Sidebar;
