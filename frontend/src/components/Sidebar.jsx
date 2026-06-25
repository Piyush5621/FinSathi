import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, Receipt, BarChart2, Settings, 
  Menu, X, LogOut, DollarSign, Briefcase, TrendingDown, 
  TrendingUp, ChevronDown, Target, HelpCircle, ShieldCheck, Globe,
  Truck
} from 'lucide-react';

const menuGroups = [
  {
    type: 'single',
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    type: 'group',
    label: 'Sales & Billing',
    icon: Receipt,
    items: [
      { path: '/billing', label: 'POS Terminal', icon: Receipt },
      { path: '/invoice-history', label: 'Invoice Ledger', icon: BarChart2 },
      { path: '/payments', label: 'Payments Inflow', icon: DollarSign },
      { path: '/reminders', label: 'Reminders Autopilot', icon: HelpCircle }
    ]
  },
  {
    type: 'group',
    label: 'Core Operations',
    icon: Briefcase,
    items: [
      { path: '/inventory', label: 'Inventory Catalog', icon: Package },
      { path: '/customers', label: 'Customer Registry', icon: Users },
      { path: '/staff', label: 'Staff Hub', icon: Users },
      { path: '/suppliers', label: 'Procurement POs', icon: Truck },
      { path: '/crm', label: 'CRM & Leads', icon: Target },
      { path: '/marketplace', label: 'Marketplace', icon: Globe }
    ]
  },
  {
    type: 'group',
    label: 'Finance & Analytics',
    icon: TrendingUp,
    items: [
      { path: '/pnl', label: 'P&L Analytics', icon: TrendingUp },
      { path: '/expenses', label: 'Expenses Outflow', icon: TrendingDown },
      { path: '/reports/gst', label: 'GST Tax Reports', icon: Receipt },
      { path: '/growth', label: 'Subsidy Matcher', icon: Target }
    ]
  },
  {
    type: 'group',
    label: 'Settings & Plans',
    icon: Settings,
    items: [
      { path: '/settings', label: 'Business Profile', icon: Settings },
      { path: '/stores', label: 'Branch Settings', icon: Settings },
      { path: '/rbac', label: 'Access Control', icon: ShieldCheck },
      { path: '/subscription/plans', label: 'Subscription Plans', icon: ShieldCheck }
    ]
  }
];

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const location = useLocation();

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

  const handleGroupToggle = (label) => {
    if (isCollapsed) {
      setIsCollapsed(false); // Expand sidebar when user expands a group
      setOpenGroups(prev => ({ ...prev, [label]: true }));
    } else {
      setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
    }
  };

  const sidebarContent = (
    <div className={`h-screen flex flex-col ${isCollapsed ? 'w-20' : 'w-72'} bg-[#0f172a] border-r border-slate-800 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] relative z-50`}>
      {/* Brand Header */}
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

      {/* Navigation Groups */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto no-scrollbar">
        {menuGroups.map((group) => {
          if (group.type === 'single') {
            const Icon = group.icon;
            const isActive = location.pathname === group.path;
            return (
              <Link
                key={group.path}
                to={group.path}
                className={`relative flex items-center p-3 rounded-xl transition-all duration-200 group overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/90 to-violet-600/80 text-white shadow-lg shadow-indigo-500/10 border-l-4 border-white'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                {!isCollapsed && <span className="text-sm font-semibold tracking-wide">{group.label}</span>}
              </Link>
            );
          }

          // Render group dropdown
          const GroupIcon = group.icon;
          const isGroupOpen = !!openGroups[group.label];
          const hasActiveChild = group.items.some(item => location.pathname === item.path);

          return (
            <div key={group.label} className="space-y-1">
              {/* Group Header Trigger */}
              <button
                onClick={() => handleGroupToggle(group.label)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 text-left ${
                  hasActiveChild && !isGroupOpen
                    ? 'bg-slate-800/30 text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <div className="flex items-center">
                  <GroupIcon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} ${hasActiveChild ? 'text-indigo-400' : 'text-slate-500 group-hover:text-white'}`} />
                  {!isCollapsed && <span className="text-sm font-semibold tracking-wide">{group.label}</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown
                    size={16}
                    className={`text-slate-500 transition-transform duration-200 ${isGroupOpen ? 'rotate-180 text-white' : ''}`}
                  />
                )}
              </button>

              {/* Group Child Items */}
              {!isCollapsed && isGroupOpen && (
                <div className="pl-4 ml-5 border-l border-slate-800/80 space-y-1 my-1">
                  {group.items.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = location.pathname === subItem.path;
                    return (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        className={`flex items-center p-2 rounded-lg text-xs font-semibold transition-all ${
                          isSubActive
                            ? 'text-indigo-400 bg-slate-800/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/10'
                        }`}
                      >
                        <SubIcon size={12} className={`mr-2.5 ${isSubActive ? 'text-indigo-455' : 'text-slate-600'}`} />
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

      {/* Bottom Section */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/30">
        <Link
          to="/login"
          onClick={() => {
            localStorage.clear();
          }}
          className={`flex items-center w-full p-3 rounded-xl text-slate-400 hover:text-rose-455 hover:bg-rose-500/10 transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && (
            <span className="text-sm font-semibold">Sign Out</span>
          )}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </div>

      {/* Mobile menu controls */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-800 text-white shadow-xl border border-slate-700 lg:hidden"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile side menu drawer */}
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
    </>
  );
};

export default Sidebar;
