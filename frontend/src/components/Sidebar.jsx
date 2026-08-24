import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, Receipt, BarChart2, Settings, 
  Menu, X, LogOut, DollarSign, Briefcase, TrendingDown, 
  TrendingUp, ChevronDown, Target, HelpCircle, ShieldCheck, Globe,
  Truck, Calendar, ShoppingCart, Lock
} from 'lucide-react';

const getFilteredMenuGroups = (user) => {
  const role = user?.role || 'Owner';
  const isOwner = role === 'Owner' || !user?.staff_id;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const hasWildcard = permissions.includes('*') || isOwner;

  const hasPerm = (perm) => hasWildcard || permissions.includes(perm);

  // Dynamic menu construction based on real RBAC capabilities:
  const groups = [
    {
      type: 'single',
      path: '/dashboard',
      label: isOwner ? 'Dashboard' : `${role} Workspace`,
      icon: LayoutDashboard
    }
  ];

  // Sales & Billing
  const salesItems = [];
  if (hasPerm('create_sales') || role === 'Cashier' || role === 'Manager') {
    salesItems.push({ path: '/billing', label: 'POS Terminal', icon: Receipt });
  }
  if (hasPerm('view_billing') || role === 'Cashier' || role === 'Manager' || role === 'Accountant') {
    salesItems.push({ path: '/invoice-history', label: 'Invoice Ledger', icon: BarChart2 });
  }
  if (isOwner || role === 'Cashier' || role === 'Manager' || role === 'Accountant') {
    salesItems.push({ path: '/payments', label: 'Payments Inflow', icon: DollarSign });
  }
  if (isOwner || role === 'Manager') {
    salesItems.push({ path: '/reminders', label: 'Reminders Autopilot', icon: HelpCircle });
  }
  if (salesItems.length > 0) {
    groups.push({
      type: 'group',
      label: 'Sales & Billing',
      icon: Receipt,
      items: salesItems
    });
  }

  // Core Operations & Inventory
  const opsItems = [];
  if (hasPerm('view_catalog') || hasPerm('edit_catalog') || hasPerm('run_counts') || role === 'Warehouse Staff' || role === 'Manager') {
    opsItems.push({ path: '/inventory', label: 'Inventory', icon: Package });
  }
  if (hasPerm('view_billing') || hasPerm('create_sales') || role === 'Cashier' || role === 'Manager' || role === 'Accountant') {
    opsItems.push({ path: '/customers', label: 'Customer Registry', icon: Users });
  }
  if (hasPerm('approve_po') || hasPerm('post_invoices') || role === 'Warehouse Staff' || role === 'Manager' || role === 'Accountant') {
    opsItems.push({ path: '/suppliers', label: 'Purchases & Receiving', icon: Truck });
  }
  if (isOwner) {
    opsItems.push({ path: '/crm', label: 'CRM & Leads', icon: Target });
    opsItems.push({ path: '/marketplace', label: 'Marketplace', icon: Globe });
  }
  if (opsItems.length > 0) {
    groups.push({
      type: 'group',
      label: 'Core Operations',
      icon: Briefcase,
      items: opsItems
    });
  }

  // Staff Hub / My Work
  if (isOwner || hasPerm('admin_setup') || role === 'Manager') {
    groups.push({
      type: 'single',
      path: '/staff',
      label: 'Staff Hub',
      icon: Users
    });
  } else {
    groups.push({
      type: 'group',
      label: 'My Work & Records',
      icon: Users,
      items: [
        { path: '/staff?tab=attendance', label: 'My Attendance', icon: Calendar },
        { path: '/staff?tab=payroll', label: 'My Payslips', icon: DollarSign }
      ]
    });
  }

  // Finance & Analytics
  const finItems = [];
  if (isOwner || hasPerm('adjust_costs')) {
    finItems.push({ path: '/pnl', label: 'P&L Analytics', icon: TrendingUp });
  }
  if (isOwner || role === 'Accountant' || role === 'Manager') {
    finItems.push({ path: '/expenses', label: 'Expenses Outflow', icon: TrendingDown });
    finItems.push({ path: '/reports/gst', label: 'GST Tax Reports', icon: Receipt });
  }
  if (isOwner) {
    finItems.push({ path: '/growth', label: 'Subsidy Matcher', icon: Target });
  }
  if (finItems.length > 0) {
    groups.push({
      type: 'group',
      label: 'Finance & Analytics',
      icon: TrendingUp,
      items: finItems
    });
  }

  // Settings & Plans (Owner Only)
  if (isOwner || hasPerm('admin_setup')) {
    groups.push({
      type: 'group',
      label: 'Settings & Admin',
      icon: Settings,
      items: [
        { path: '/settings', label: 'Business Profile', icon: Settings },
        { path: '/stores', label: 'Branch Settings', icon: Settings },
        { path: '/subscription/plans', label: 'Subscription Plans', icon: ShieldCheck }
      ]
    });
  }

  return groups;
};

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const location = useLocation();

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const menuGroups = getFilteredMenuGroups(currentUser);

  useEffect(() => {
    menuGroups.forEach(group => {
      if (group.type === 'group') {
        const hasActiveChild = group.items?.some(item => location.pathname === item.path);
        if (hasActiveChild) {
          setOpenGroups(prev => ({ ...prev, [group.label]: true }));
        }
      }
    });
  }, [location.pathname]);

  const handleGroupToggle = (label) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenGroups(prev => ({ ...prev, [label]: true }));
    } else {
      setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
    }
  };

  return (
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
                  Karobar
                </h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                  {currentUser.role ? `${currentUser.role} Workspace` : 'Business OS'}
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

          const GroupIcon = group.icon;
          const isGroupOpen = !!openGroups[group.label];
          const hasActiveChild = group.items?.some(item => location.pathname === item.path);

          return (
            <div key={group.label} className="space-y-1">
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

              {!isCollapsed && isGroupOpen && (
                <div className="pl-4 ml-5 border-l border-slate-800/80 space-y-1 my-1">
                  {group.items?.map((subItem) => {
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
                        <SubIcon size={12} className={`mr-2.5 ${isSubActive ? 'text-indigo-400' : 'text-slate-600'}`} />
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
    </div>
  );
};

export default Sidebar;
