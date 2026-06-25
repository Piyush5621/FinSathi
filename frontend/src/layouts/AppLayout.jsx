import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, Package, Users, MoreHorizontal, LogOut, 
  TrendingDown, TrendingUp, Settings, Wallet, FileText, LayoutGrid, 
  MessageSquare, Search, ChevronLeft, ChevronRight, Sparkles,
  ShoppingCart, FileSpreadsheet, ChevronDown, ShieldCheck, Settings2, Bot, HeartPulse, BarChart2, ShieldAlert, History,
  Globe, Users2, Inbox, Send, Star, CreditCard, RotateCcw, BookOpen, CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import Logo from '../components/Logo';
import { useSubscription } from '../contexts/SubscriptionContext';
import CommandPalette from '../components/ui/CommandPalette';
import { WifiOff, Wifi } from 'lucide-react';

const menuGroups = [
  {
    type: 'single',
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    type: 'single',
    path: '/founder-dashboard',
    label: 'Founder Console',
    icon: Sparkles
  },
  {
    type: 'group',
    label: 'Sales & Billing',
    icon: Receipt,
    items: [
      { path: '/billing', label: 'POS Terminal', icon: ShoppingCart },
      { path: '/invoice-history', label: 'Invoice Ledger', icon: FileText },
      { path: '/payments', label: 'Payments Inflow', icon: Wallet }
    ]
  },
  {
    type: 'group',
    label: 'Core Operations',
    icon: Package,
    items: [
      { path: '/inventory', label: 'Inventory Catalog', icon: Package },
      { path: '/customers', label: 'Customer Registry', icon: Users },
      { path: '/crm', label: 'CRM / Loyalty', icon: MessageSquare },
      { path: '/suppliers', label: 'Local Suppliers', icon: Package }
    ]
  },
  {
    type: 'group',
    label: 'Finance & Analytics',
    icon: TrendingUp,
    items: [
      { path: '/pnl', label: 'P&L Analytics', icon: TrendingUp },
      { path: '/expenses', label: 'Expenses Outflow', icon: TrendingDown },
      { path: '/health-score', label: 'Business Health', icon: HeartPulse },
      { path: '/ai-advisor', label: 'AI Advisor', icon: Bot },
      { path: '/executive-analytics', label: 'Executive Analytics', icon: BarChart2 }
    ]
  },
  {
    type: 'group',
    label: 'Business Network',
    icon: Globe,
    items: [
      { path: '/network/overview', label: 'Network Overview', icon: Globe },
      { path: '/network/connections', label: 'Connections', icon: Users2 },
      { path: '/network/inbox', label: 'Purchase Inbox', icon: Inbox },
      { path: '/network/outbox', label: 'Sales Outbox', icon: Send },
      { path: '/network/partners', label: 'Product Partners', icon: Star },
      { path: '/network/trade-credit', label: 'Trade Credits', icon: CreditCard },
      { path: '/network/trade-returns', label: 'Trade Returns', icon: RotateCcw },
      { path: '/network/shared-catalogs', label: 'Shared Catalogs', icon: BookOpen },
      { path: '/network/trade-history', label: 'Trade History', icon: History },
      { path: '/network/analytics', label: 'Analytics', icon: BarChart2 }
    ]
  },
  {
    type: 'single',
    path: '/general',
    label: 'General Hub',
    icon: Settings2
  },
  {
    type: 'group',
    label: 'Workforce & Access',
    icon: Users,
    items: [
      { path: '/workforce/employees', label: 'Employees', icon: Users },
      { path: '/workforce/payroll', label: 'Payroll & Attendance', icon: Wallet },
      { path: '/workforce/roles', label: 'Roles', icon: ShieldCheck },
      { path: '/workforce/matrix', label: 'Access Matrix', icon: LayoutGrid },
      { path: '/workforce/approvals', label: 'Approval Workflows', icon: CheckSquare },
      { path: '/workforce/audit', label: 'Audit Trail', icon: History }
    ]
  },
  {
    type: 'group',
    label: 'Settings & Plans',
    icon: Settings,
    items: [
      { path: '/settings', label: 'Business Profile', icon: Settings },
      { path: '/stores', label: 'Store Management', icon: LayoutGrid },
      { path: '/subscription/plans', label: 'Subscription Plans', icon: ShieldCheck },
      { path: '/audit-center', label: 'Security Alerts', icon: ShieldAlert },
      { path: '/backup-wizard', label: 'Backup & Restore', icon: History }
    ]
  }
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
  const { subscription, usage, planDetails } = useSubscription();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-expand folder group on page load/navigation if a child route is active
  useEffect(() => {
    menuGroups.forEach(group => {
      if (group.type === 'group') {
        const hasActiveChild = group.items.some(item => location.pathname === item.path);
        if (hasActiveChild) {
          setOpenGroups(prev => ({ ...prev, [group.label]: true }));
        }
      }
    });
  }, [location.pathname]);

  // Auto-expand groups when searching
  useEffect(() => {
    if (searchTerm) {
      const newOpen = {};
      menuGroups.forEach(group => {
        if (group.type === 'group') {
          newOpen[group.label] = true;
        }
      });
      setOpenGroups(prev => ({ ...prev, ...newOpen }));
    }
  }, [searchTerm]);

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  const filteredMenuGroups = useMemo(() => {
    if (!searchTerm) return menuGroups;
    
    return menuGroups.map(group => {
      if (group.type === 'single') {
        const matches = group.label.toLowerCase().includes(searchTerm.toLowerCase());
        return matches ? group : null;
      }
      
      const filteredItems = group.items.filter(item => 
        item.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (filteredItems.length > 0) {
        return {
          ...group,
          items: filteredItems
        };
      }
      return null;
    }).filter(Boolean);
  }, [searchTerm]);

  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const userInitial = userObj.name?.charAt(0).toUpperCase() || 'U';
  const userAvatar = userObj.avatar_url || userObj.logo_url;

  return (
    <div className="min-h-screen bg-bg-page flex flex-col md:flex-row font-inter text-slate-800">
      <CommandPalette />
      {/* DESKTOP SIDEBAR */}
      <motion.aside 
        animate={{ width: isCollapsed ? 76 : 260 }}
        className="hidden md:flex flex-col bg-[#090D16] shrink-0 sticky top-0 h-screen z-50 border-r border-white/5 shadow-xl overflow-visible"
      >
        {/* Logo Section */}
        <div className="p-5 flex items-center justify-between overflow-hidden">
           <Logo collapsed={isCollapsed} />
        </div>

        {/* Search Bar */}
        {!isCollapsed && (
          <div className="px-4 mb-4">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-blue transition-colors" size={14} />
                <input 
                  type="text"
                  placeholder="Search... (Ctrl+K)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 focus:bg-white/10 focus:border-brand-blue/50 transition-all font-medium"
                />
             </div>
          </div>
        )}
        
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto no-scrollbar">
           {filteredMenuGroups.map(group => {
             if (group.type === 'single') {
               const Icon = group.icon;
               const isActive = location.pathname === group.path;
               return (
                 <Link 
                   key={group.path} 
                   to={group.path}
                   title={isCollapsed ? group.label : ""}
                   className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold text-xs relative group ${
                     isActive 
                       ? 'bg-brand-blue text-white shadow-sm shadow-brand-blue/15' 
                       : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                   } ${isCollapsed ? 'justify-center' : ''}`}
                 >
                   <Icon size={16} className={`shrink-0 ${isActive ? 'scale-105' : 'group-hover:scale-105'} transition-transform`} />
                   {!isCollapsed && (
                     <motion.span 
                       initial={{ opacity: 0, x: -5 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="truncate"
                     >
                       {group.label}
                     </motion.span>
                   )}
                   {isCollapsed && isActive && (
                     <div className="absolute right-0 w-1 h-5 bg-brand-blue rounded-l-full" />
                   )}
                 </Link>
               );
             }

             const GroupIcon = group.icon;
             const isGroupOpen = !!openGroups[group.label];
             const hasActiveChild = group.items.some(item => location.pathname.startsWith(item.path));

             return (
               <div key={group.label} className="space-y-1">
                 {/* Group Header Trigger */}
                 <button
                   onClick={() => {
                     if (isCollapsed) {
                       setIsCollapsed(false);
                       setOpenGroups(prev => ({ ...prev, [group.label]: true }));
                     } else {
                       setOpenGroups(prev => ({ ...prev, [group.label]: !prev[group.label] }));
                     }
                   }}
                   className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-left font-semibold text-xs ${
                     hasActiveChild && !isGroupOpen
                       ? 'bg-white/5 text-brand-blue'
                       : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                   } ${isCollapsed ? 'justify-center' : ''}`}
                 >
                   <div className="flex items-center gap-3">
                     <GroupIcon size={16} className={`shrink-0 ${hasActiveChild ? 'text-brand-blue' : 'text-slate-500 group-hover:text-slate-200'}`} />
                     {!isCollapsed && <span>{group.label}</span>}
                   </div>
                   {!isCollapsed && (
                     <ChevronDown
                       size={14}
                       className={`text-slate-500 transition-transform duration-200 ${isGroupOpen ? 'rotate-180 text-slate-200' : ''}`}
                     />
                   )}
                 </button>

                 {/* Group Child Items */}
                 {!isCollapsed && isGroupOpen && (
                   <div className="pl-4 ml-5 border-l border-white/5 space-y-1 my-1">
                     {group.items.map((subItem) => {
                       const SubIcon = subItem.icon;
                       const isSubActive = location.pathname === subItem.path;
                       return (
                         <Link
                           key={subItem.path}
                           to={subItem.path}
                           className={`flex items-center gap-2.5 p-2 rounded-lg text-[11px] font-semibold transition-all ${
                             isSubActive
                               ? 'text-brand-blue bg-white/5'
                               : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                           }`}
                         >
                           <SubIcon size={12} className={`shrink-0 ${isSubActive ? 'text-brand-blue' : 'text-slate-600'}`} />
                           {subItem.label}
                         </Link>
                       );
                     })}
                   </div>
                 )}
               </div>
             );
           })}
        </nav>

        {/* Connection Status */}
        <div className={`px-5 py-2 border-t border-white/5 flex items-center gap-2 ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {!isCollapsed && (
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {isOnline ? 'System Online' : 'Offline Mode'}
            </span>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/5 mt-auto bg-black/10">
          {!isCollapsed && subscription && (
            <div className="mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black text-brand-blue uppercase tracking-wider">{subscription.plan} Plan</span>
                <Link to="/subscription/plans" className="text-[9px] font-bold text-white bg-brand-blue px-2 py-0.5 rounded-lg hover:bg-blue-600 transition-colors">Upgrade</Link>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-2 mb-1">
                <span>Invoices</span>
                <span>{usage?.invoices_per_month || 0} / {planDetails?.limits?.invoices_per_month === -1 ? '∞' : (planDetails?.limits?.invoices_per_month || 50)}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1">
                <div 
                  className="bg-brand-blue h-1 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, ((usage?.invoices_per_month || 0) / (planDetails?.limits?.invoices_per_month === -1 ? 100 : (planDetails?.limits?.invoices_per_month || 50))) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <button 
              onClick={() => { localStorage.clear(); window.location.href='/login'; }} 
              className="w-full flex items-center gap-3 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all text-xs font-semibold"
            >
              <LogOut size={16} className="shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>

        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-500 shadow-md hover:bg-brand-blue hover:text-white transition-all z-[60] cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        {/* DESKTOP TOP HEADER */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 bg-white border-b border-slate-100/85 shrink-0 z-40">
           <div className="flex flex-col">
              <h2 className="text-sm font-bold text-slate-900 capitalize tracking-tight">
                 {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
              </h2>
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                 {isOnline ? (
                   <>
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-slate-400">System Connected</span>
                   </>
                 ) : (
                   <>
                     <WifiOff size={10} className="text-amber-500 animate-bounce" />
                     <span className="text-amber-500">Working Offline</span>
                   </>
                 )}
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end">
                 <p className="text-xs font-semibold text-slate-900 leading-none">{userObj.name || 'Admin'}</p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Owner</p>
              </div>
              <Link to="/profile">
                <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center text-xs font-black hover:scale-105 transition-all cursor-pointer overflow-hidden border border-slate-200">
                  {userAvatar ? <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" /> : userInitial}
               </div>
              </Link>
           </div>
        </header>

        {/* MOBILE HEADER */}
        <header className="md:hidden flex items-center justify-between h-16 px-6 bg-[#090D16] shrink-0 border-b border-white/5 z-40">
           <h1 className="text-base font-bold text-white tracking-tight">FinSathi</h1>
           <Link to="/profile">
             <div className="w-8 h-8 rounded-xl bg-brand-blue text-white flex items-center justify-center text-xs font-black border border-white/10 overflow-hidden shadow-md">
                {userAvatar ? <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" /> : userInitial}
             </div>
           </Link>
        </header>

        {/* CONTENT WRAPPER */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
          {!isOnline && (
            <div className="mb-6 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 animate-pulse">
              <WifiOff className="text-amber-600" size={18} />
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-tight">Offline Mode</p>
                <p className="text-[10px] text-amber-600 font-bold">You are currently disconnected. Some actions like billing and search may use locally cached data.</p>
              </div>
            </div>
          )}
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200/80 p-1.5 rounded-xl shadow-lg z-50">
        <div className="flex items-center justify-around">
          {mobileMenu.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link 
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-11 h-11 rounded-lg transition-all ${
                  isActive ? 'bg-brand-blue text-white shadow-sm shadow-brand-blue/15' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={16} />
                <span className="text-[8px] font-bold uppercase tracking-tight mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
