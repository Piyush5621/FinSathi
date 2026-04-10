import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Users, 
  MoreHorizontal,
  LogOut,
  TrendingDown,
  TrendingUp,
  Settings,
  Wallet,
  FileText,
  LayoutGrid,
  Truck
} from 'lucide-react';

const desktopMenu = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/billing', label: 'Sales/POS', icon: Receipt },
  { path: '/invoice-history', label: 'Invoices History', icon: FileText },
  { path: '/payments', label: 'Payments In', icon: Wallet },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/staff', label: 'Staff Hub', icon: Users },
  { path: '/logistics', label: 'Logistics Hub', icon: Truck },
  { path: '/expenses', label: 'Expenses', icon: TrendingDown },
  { path: '/pnl', label: 'Reports', icon: TrendingUp },
  { path: '/tools', label: 'More Tools', icon: MoreHorizontal },
  { path: '/marketplace', label: 'Explore Apps', icon: LayoutGrid },
];

const secondaryMenu = [
  { path: '/settings', label: 'Settings', icon: Settings },
];

const mobileMenu = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/billing', label: 'Sales', icon: Receipt },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const loggedIn = localStorage.getItem('loggedIn');
  const location = useLocation();

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  const renderMenuItem = (item) => {
    const isActive = location.pathname.startsWith(item.path);
    const Icon = item.icon;
    return (
      <Link 
        key={item.path} 
        to={item.path}
        className={`flex items-center gap-[12px] px-[16px] py-[12px] rounded-lg transition-colors font-medium text-[14px] ${
          isActive ? 'bg-brand-blue text-white shadow-sm' : 'text-[#CBD5F5] hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Icon size={20} />
        {item.label}
      </Link>
    );
  };

  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const userInitial = userObj.name?.charAt(0).toUpperCase() || 'U';
  const userAvatar = userObj.avatar_url || userObj.logo_url;

  return (
    <div className="min-h-screen bg-bg-page flex flex-col md:flex-row font-inter text-text-body">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-[260px] bg-[#1E293B] shrink-0 sticky top-0 h-screen">
        <div className="p-[24px]">
          <h1 className="text-[22px] font-bold text-white tracking-tight">FinSathi</h1>
        </div>
        
        <nav className="flex-1 px-[16px] py-[8px] space-y-[24px] overflow-y-auto custom-scrollbar">
          {/* Operations Section */}
          <div>
            <p className="px-[16px] text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] mb-[12px]">Operations</p>
            <div className="space-y-[4px]">
               {desktopMenu.slice(0, 4).map(renderMenuItem)}
            </div>
          </div>

          {/* Management Section */}
          <div>
            <p className="px-[16px] text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] mb-[12px]">Management</p>
            <div className="space-y-[4px]">
               {desktopMenu.slice(4, 7).map(renderMenuItem)}
            </div>
          </div>

          {/* Analysis & Tools */}
          <div>
            <p className="px-[16px] text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] mb-[12px]">Enterprise</p>
            <div className="space-y-[4px]">
               {desktopMenu.slice(7).map(renderMenuItem)}
            </div>
          </div>
        </nav>

        <div className="px-[16px] py-[16px] mt-auto">
          <div className="h-[1px] bg-slate-700/50 mb-[16px] mx-[16px]" />
          {secondaryMenu.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-[12px] px-[16px] py-[12px] rounded-lg transition-colors font-medium text-[14px] mb-[4px] ${
                  isActive ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
          <button onClick={() => { localStorage.clear(); window.location.href='/login'; }} className="w-full flex items-center gap-[12px] px-[16px] py-[12px] text-slate-400 hover:text-white transition-colors text-[14px] font-medium mt-2">
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        {/* DESKTOP TOP HEADER */}
        <header className="hidden md:flex items-center justify-between h-[80px] px-[40px] bg-white border-b border-gray-100 shrink-0 shadow-sm">
           <h2 className="text-[18px] font-bold text-[#0F172A] capitalize">
              {location.pathname.replace('/', '') || 'Dashboard'}
           </h2>
           <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end mr-2">
                 <p className="text-[14px] font-black text-[#0F172A] leading-none mb-[2px]">{userObj.name || 'Admin'}</p>
                 <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Business Owner</p>
              </div>
              <Link to="/profile">
                <div className="w-[52px] h-[52px] rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[20px] font-black hover:scale-105 hover:shadow-xl hover:shadow-slate-200 transition-all cursor-pointer overflow-hidden border-2 border-white ring-2 ring-slate-100">
                  {userAvatar ? <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" /> : userInitial}
               </div>
              </Link>
           </div>
        </header>

        {/* MOBILE HEADER */}
        <header className="md:hidden flex items-center justify-between h-[72px] px-[20px] bg-[#1E293B] shrink-0 shadow-lg">
           <h1 className="text-[18px] font-bold text-white tracking-tight">FinSathi</h1>
           <div className="flex items-center gap-3">
              <p className="text-[12px] font-bold text-white/90">{userObj.name?.split(' ')[0] || 'User'}</p>
              <Link to="/profile">
                <div className="w-[44px] h-[44px] rounded-full bg-brand-blue text-white flex items-center justify-center text-[16px] font-black border-2 border-white/20 overflow-hidden shadow-inner">
                   {userAvatar ? <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" /> : userInitial}
                </div>
              </Link>
           </div>
        </header>

        {/* CONTENT WRAPPER */}
        <main className="flex-1 overflow-y-auto p-[16px] md:p-[32px] custom-scrollbar bg-bg-page pb-[90px] md:pb-[32px]">
          <div className="max-w-[1200px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {mobileMenu.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link 
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-[60px] h-[52px] gap-1 transition-colors ${
                  isActive ? 'text-brand-blue' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <Icon size={22} className={isActive ? 'fill-brand-blue/10' : ''} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
