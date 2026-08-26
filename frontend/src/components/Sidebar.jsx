import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, FileText, Wallet, Package, 
  Users, Truck, MessageSquare, TrendingDown, TrendingUp, 
  HeartPulse, Bot, Globe, ArrowLeftRight, ShieldCheck, 
  Settings, LayoutGrid, Calendar, Lock, ChevronLeft, ChevronRight,
  ChevronDown, ShieldAlert, Database, Sparkles, BarChart2, DollarSign,
  HelpCircle, Wifi, WifiOff, X, Bell, Compass, Zap, Building2
} from 'lucide-react';
import Logo from './Logo';
import { useSubscription } from '../contexts/SubscriptionContext';
import Tooltip from './ui/Tooltip';

export const getRoleNavigation = (user) => {
  const role = user?.role || 'Owner';
  const isOwner = role === 'Owner' || role === 'Admin' || !user?.staff_id;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const hasWildcard = permissions.includes('*') || isOwner;
  const hasPerm = (perm) => hasWildcard || permissions.includes(perm);

  const b2bTypes = ['distributor', 'manufacturer', 'wholesaler', 'b2b'];
  const isB2B = b2bTypes.includes(user?.business_type?.toLowerCase());
  const hasMultiStore = user?.multi_store_enabled === true;

  const sections = [
    {
      type: 'single',
      path: '/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
    }
  ];

  // 1. OPERATIONS SECTION
  const operationItems = [];
  
  // Sales Sub-group or items
  if (hasPerm('create_sales') || hasPerm('view_billing') || role === 'Cashier' || role === 'Manager') {
    operationItems.push({
      path: '/billing',
      label: 'POS Billing',
      icon: ShoppingCart,
    });
    operationItems.push({
      path: '/invoice-history',
      label: 'Invoice Ledger',
      icon: FileText,
    });
  }

  // Inventory
  if (hasPerm('view_catalog') || hasPerm('edit_catalog') || hasPerm('run_counts') || role === 'Warehouse Staff' || role === 'Manager') {
    operationItems.push({
      path: '/inventory',
      label: 'Stock & Inventory',
      icon: Package,
    });
  }

  // Purchases / Suppliers
  if (hasPerm('approve_po') || hasPerm('post_invoices') || role === 'Warehouse Staff' || role === 'Manager' || role === 'Accountant') {
    operationItems.push({
      path: '/suppliers',
      label: 'Purchases & Receiving',
      icon: Truck,
    });
  }

  // Customers Khata
  if (hasPerm('view_billing') || hasPerm('create_sales') || role === 'Cashier' || role === 'Manager' || role === 'Accountant') {
    operationItems.push({
      path: '/customers',
      label: 'Customer Registry',
      icon: Users,
    });
  }

  // CRM
  if (isOwner || (isB2B && role === 'Manager')) {
    operationItems.push({
      path: '/crm',
      label: 'CRM & Pipeline',
      icon: MessageSquare,
    });
  }

  if (operationItems.length > 0) {
    sections.push({
      type: 'group',
      label: 'OPERATIONS',
      items: operationItems,
    });
  }

  // 2. FINANCE SECTION
  const financeItems = [];

  if (hasPerm('view_billing') || role === 'Cashier' || role === 'Manager' || role === 'Accountant') {
    financeItems.push({
      path: '/payments',
      label: 'Payments Inflow',
      icon: Wallet,
    });
  }

  if (isOwner || role === 'Accountant' || role === 'Manager') {
    financeItems.push({
      path: '/expenses',
      label: 'Expenses Outflow',
      icon: TrendingDown,
    });
  }

  if (isOwner || hasPerm('adjust_costs')) {
    financeItems.push({
      path: '/pnl',
      label: 'P&L Financials',
      icon: TrendingUp,
    });
  }

  if (isOwner || role === 'Accountant' || role === 'Manager') {
    financeItems.push({
      path: '/reports/gst',
      label: 'GST & Tax Reports',
      icon: FileText,
    });
  }

  if (isOwner || role === 'Manager') {
    financeItems.push({
      path: '/health-score',
      label: 'Business Health',
      icon: HeartPulse,
    });
  }

  if (isOwner) {
    financeItems.push({
      path: '/executive-analytics',
      label: 'Executive Analytics',
      icon: BarChart2,
    });
  }

  if (financeItems.length > 0) {
    sections.push({
      type: 'group',
      label: 'FINANCE',
      items: financeItems,
    });
  }

  // 3. BUSINESS NETWORK SECTION
  if (isOwner || role === 'Manager' || role === 'Accountant') {
    sections.push({
      type: 'group',
      label: 'NETWORK',
      items: [
        { path: '/network', label: 'Business Network', icon: Globe },
        { path: '/network/exchange', label: 'Business Exchange', icon: ArrowLeftRight },
      ],
    });
  }

  // 4. PEOPLE / WORKFORCE SECTION
  if (isOwner || hasPerm('admin_setup') || role === 'Manager') {
    sections.push({
      type: 'group',
      label: 'PEOPLE',
      items: [
        { path: '/staff', label: 'Staff Hub', icon: Users },
        { path: '/staff?tab=payroll', label: 'Payroll & Salary', icon: Wallet },
      ],
    });
  } else {
    sections.push({
      type: 'group',
      label: 'MY RECORDS',
      items: [
        { path: '/staff?tab=attendance', label: 'My Attendance', icon: Calendar },
        { path: '/staff?tab=payroll', label: 'My Payslips', icon: DollarSign },
      ],
    });
  }

  // 5. INTELLIGENCE SECTION
  if (isOwner || role === 'Manager') {
    sections.push({
      type: 'group',
      label: 'INTELLIGENCE',
      items: [
        { path: '/ai-advisor', label: 'AI Copilot (KaroBar AI)', icon: Bot },
        { path: '/alerts', label: 'Smart Alerts & Automation', icon: Bell },
        { path: '/forecasting', label: 'Predictive Forecasting', icon: Compass },
        { path: '/workflows', label: 'Workflow Autopilot', icon: Zap },
        { path: '/multi-store', label: 'Multi-Store Intelligence', icon: Building2 },
        ...(isOwner ? [{ path: '/founder-dashboard', label: 'Founder Console', icon: Sparkles }] : []),
      ],
    });
  }

  // 6. SYSTEM SECTION
  if (isOwner || hasPerm('admin_setup')) {
    sections.push({
      type: 'group',
      label: 'SYSTEM',
      items: [
        { path: '/settings', label: 'Business Settings', icon: Settings },
        ...(hasMultiStore ? [{ path: '/stores', label: 'Store Branches', icon: LayoutGrid }] : []),
        { path: '/subscription/plans', label: 'Subscription Plans', icon: ShieldCheck },
        { path: '/audit-center', label: 'Audit Center', icon: ShieldAlert },
        { path: '/backup-wizard', label: 'Backup Wizard', icon: Database },
      ],
    });
  }

  return sections;
};

export function Sidebar({ 
  isCollapsed = false, 
  onToggleCollapse, 
  mobileOpen = false, 
  onMobileClose 
}) {
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const navSections = getRoleNavigation(currentUser);
  const { subscription, usage, planDetails } = useSubscription();

  const isCurrentPath = (path) => {
    if (!path) return false;
    const current = location.pathname + location.search;
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path.includes('?')) return current === path;
    return location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
  };

  const content = (
    <div className="h-full flex flex-col justify-between bg-app-surface text-app-text border-r border-app-border">
      {/* 1. Header / Logo Area */}
      <div className="p-4 flex items-center justify-between border-b border-app-border h-16 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary rounded-btn">
          <Logo collapsed={isCollapsed} />
        </Link>

        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 text-app-text-muted hover:text-app-text rounded-btn transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 2. Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
        {navSections.map((sec, idx) => {
          if (sec.type === 'single') {
            const active = isCurrentPath(sec.path);
            const Icon = sec.icon;
            return (
              <div key={sec.path || idx}>
                {isCollapsed ? (
                  <Tooltip content={sec.label} position="right">
                    <Link
                      to={sec.path}
                      onClick={onMobileClose}
                      className={`flex items-center justify-center w-10 h-10 mx-auto rounded-btn transition-colors duration-150 ${
                        active
                          ? 'bg-app-primary text-white font-semibold'
                          : 'text-app-text-secondary hover:bg-app-surface-secondary hover:text-app-text'
                      }`}
                    >
                      <Icon size={18} />
                    </Link>
                  </Tooltip>
                ) : (
                  <Link
                    to={sec.path}
                    onClick={onMobileClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-btn text-small transition-all duration-150 relative ${
                      active
                        ? 'bg-app-primary text-white font-semibold shadow-sm'
                        : 'text-app-text-secondary hover:bg-app-surface-secondary hover:text-app-text'
                    }`}
                  >
                    <Icon size={17} className={active ? 'text-white' : 'text-app-text-muted'} />
                    <span className="truncate">{sec.label}</span>
                  </Link>
                )}
              </div>
            );
          }

          // Section Group
          return (
            <div key={sec.label || idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-micro font-semibold uppercase tracking-wider text-app-text-muted select-none">
                  {sec.label}
                </div>
              )}
              {sec.items.map((item) => {
                const active = isCurrentPath(item.path);
                const Icon = item.icon;

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.path} content={item.label} position="right">
                      <Link
                        to={item.path}
                        onClick={onMobileClose}
                        className={`flex items-center justify-center w-10 h-10 mx-auto rounded-btn transition-colors duration-150 ${
                          active
                            ? 'bg-app-primary text-white font-semibold'
                            : 'text-app-text-secondary hover:bg-app-surface-secondary hover:text-app-text'
                        }`}
                      >
                        <Icon size={18} />
                      </Link>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onMobileClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-btn text-small transition-all duration-150 relative ${
                      active
                        ? 'bg-app-primary text-white font-semibold shadow-sm'
                        : 'text-app-text-secondary hover:bg-app-surface-secondary hover:text-app-text'
                    }`}
                  >
                    <Icon size={17} className={active ? 'text-white' : 'text-app-text-muted'} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 3. Footer / Subscription & Collapse Bar */}
      <div className="p-3 border-t border-app-border space-y-2 shrink-0 bg-app-surface-secondary/40">
        {/* Subscription Plan Chip (Expanded view only) */}
        {!isCollapsed && subscription && (
          <div className="p-2.5 rounded-card bg-app-surface border border-app-border/80 flex flex-col gap-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-micro font-bold uppercase tracking-wider text-app-text-muted">
                {subscription.plan || 'Free'} Plan
              </span>
              {subscription.plan !== 'enterprise' && (
                <Link
                  to="/subscription/plans"
                  className="text-micro font-bold text-app-primary hover:underline"
                >
                  Upgrade
                </Link>
              )}
            </div>
            {usage?.invoices && (
              <div className="w-full bg-app-surface-secondary h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-app-primary h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (usage.invoices.used / (usage.invoices.limit || 1)) * 100)}%` }} 
                />
              </div>
            )}
          </div>
        )}

        {/* Collapse Toggle Button (Desktop only) */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center w-full py-1.5 text-app-text-muted hover:text-app-text hover:bg-app-surface rounded-btn transition-colors text-caption gap-2 cursor-pointer border border-transparent hover:border-app-border"
            title={isCollapsed ? "Expand Sidebar ([)" : "Collapse Sidebar ([)"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse sidebar</span></>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside 
        className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity" 
            onClick={onMobileClose} 
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-fade-in">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
