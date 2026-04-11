import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, Package, Users, MoreHorizontal, LogOut, 
  TrendingDown, TrendingUp, Settings, Wallet, FileText, LayoutGrid, 
  Truck, MessageSquare, Search, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import Logo from '../components/Logo';

const desktopMenu = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Operations' },
  { path: '/billing', label: 'Sales/POS', icon: Receipt, category: 'Operations' },
  { path: '/invoice-history', label: 'Invoices History', icon: FileText, category: 'Operations' },
  { path: '/payments', label: 'Payments In', icon: Wallet, category: 'Operations' },
  { path: '/inventory', label: 'Inventory', icon: Package, category: 'Management' },
  { path: '/customers', label: 'Customers', icon: Users, category: 'Management' },
  { path: '/staff', label: 'Staff Hub', icon: Users, category: 'Management' },
  { path: '/logistics', label: 'Logistics Hub', icon: Truck, category: 'Enterprise' },
  { path: '/expenses', label: 'Expenses', icon: TrendingDown, category: 'Enterprise' },
  { path: '/pnl', label: 'Reports', icon: TrendingUp, category: 'Enterprise' },
  { path: '/reminders', label: 'General', icon: MessageSquare, category: 'General' },
];

const secondaryMenu = [
  { path: '/settings', label: 'Settings', icon: Settings },
];

const mobileMenu = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/billing', label: 'Billing', icon: Receipt },
  { path: '/invoice-history', label: 'Invoices', icon: FileText },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/tools', label: 'More', icon: MoreHorizontal },
];

export default function AppLayout() {
  const loggedIn = localStorage.getItem('loggedIn');
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  const filteredMenu = useMemo(() => {
    if (!searchTerm) return desktopMenu;
    return desktopMenu.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const categories = useMemo(() => {
    return [...new Set(filteredMenu.map(item => item.category))];
  }, [filteredMenu]);

  const renderMenuItem = (item) => {
    const isActive = location.pathname.startsWith(item.path);
    const Icon = item.icon;
    return (
      <Link 
        key={item.path} 
        to={item.path}
        title={isCollapsed ? item.label : ""}
        className={`flex items-center gap-[12px] px-[16px] py-[12px] rounded-xl transition-all duration-300 font-bold text-[13px] relative group ${
          isActive 
            ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/20 backdrop-blur-md' 
            : 'text-slate-400 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon size={20} className={`shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="truncate"
          >
            {item.label}
          </motion.span>
        )}
        {isCollapsed && isActive && (
          <div className="absolute right-0 w-1 h-6 bg-indigo-500 rounded-l-full" />
        )}
      </Link>
    );
  };

  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const userInitial = userObj.name?.charAt(0).toUpperCase() || 'U';
  const userAvatar = userObj.avatar_url || userObj.logo_url;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-inter text-[#1E293B]">
      {/* DESKTOP SIDEBAR */}
      <motion.aside 
        animate={{ width: isCollapsed ? 88 : 280 }}
        className="hidden md:flex flex-col bg-[#0F172A] shrink-0 sticky top-0 h-screen z-50 shadow-2xl overflow-visible"
      >
        {/* Logo Section */}
        <div className="p-6 flex items-center justify-between overflow-hidden">
           <Logo collapsed={isCollapsed} />
        </div>

        {/* Search Bar */}
        {!isCollapsed && (
          <div className="px-6 mb-6">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input 
                  type="text"
                  placeholder="Jump to..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 transition-all font-medium"
                />
             </div>
          </div>
        )}
        
        <nav className="flex-1 px-4 py-2 space-y-8 overflow-y-auto no-scrollbar">
           {categories.map(cat => (
             <div key={cat}>
                {!isCollapsed && (
                  <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">{cat}</p>
                )}
                <div className="space-y-1">
                   {filteredMenu.filter(i => i.category === cat).map(renderMenuItem)}
                </div>
             </div>
           ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 bg-black/20 mt-auto">
          <div className="space-y-1">
            {secondaryMenu.map(item => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-[13px] ${
                      isActive ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            <button 
              onClick={() => { localStorage.clear(); window.location.href='/login'; }} 
              className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all text-sm font-bold"
            >
              <LogOut size={20} className="shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>

        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 shadow-xl hover:bg-indigo-600 hover:text-white transition-all z-[60]"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        {/* DESKTOP TOP HEADER */}
        <header className="hidden md:flex items-center justify-between h-[80px] px-10 bg-white border-b border-slate-100 shrink-0 shadow-sm z-40">
           <div className="flex flex-col">
              <h2 className="text-xl font-black text-slate-900 capitalize tracking-tight">
                 {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 Active Session
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="hidden lg:flex flex-col items-end">
                 <p className="text-sm font-black text-slate-900 leading-none">{userObj.name || 'Admin'}</p>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Enterprise Owner</p>
              </div>
              <Link to="/profile">
                <div className="w-12 h-12 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center text-lg font-black hover:scale-105 hover:rotate-3 hover:shadow-2xl transition-all cursor-pointer overflow-hidden border-2 border-white ring-4 ring-slate-50">
                  {userAvatar ? <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" /> : userInitial}
               </div>
              </Link>
           </div>
        </header>

        {/* MOBILE HEADER */}
        <header className="md:hidden flex items-center justify-between h-20 px-6 bg-[#0F172A] shrink-0 shadow-lg z-40">
           <h1 className="text-xl font-black text-white tracking-tighter">FinSathi</h1>
           <Link to="/profile">
             <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-black border-2 border-white/20 overflow-hidden shadow-2xl">
                {userAvatar ? <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" /> : userInitial}
             </div>
           </Link>
        </header>

        {/* CONTENT WRAPPER */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar pb-32 md:pb-10">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-xl border border-white/20 p-2 rounded-2xl shadow-2xl z-50">
        <div className="flex items-center justify-around">
          {mobileMenu.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link 
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all ${
                  isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-[8px] font-black uppercase tracking-tighter mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
