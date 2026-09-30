import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, ChevronDown, 
  X, Sparkles
} from 'lucide-react';
import Logo from './Logo';
import { useSubscription } from '../contexts/SubscriptionContext';
import Tooltip from './ui/Tooltip';
import { Badge } from './ui/Badge';
import { getNavigationSections } from '../constants/navigation';

// Exported alias for backward compatibility
export const getRoleNavigation = getNavigationSections;

export function Sidebar({ 
  isCollapsed = false, 
  onToggleCollapse, 
  mobileOpen = false, 
  onMobileClose 
}) {
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const navSections = getNavigationSections(currentUser);
  const { subscription, usage } = useSubscription();

  // Active path checking helper
  const isCurrentPath = (path) => {
    if (!path) return false;
    const current = location.pathname + location.search;
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path.includes('?')) return current === path;
    return location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
  };

  // Track expanded state for domain sections
  const [expandedSections, setExpandedSections] = useState(() => {
    const initial = {};
    navSections.forEach(s => {
      initial[s.id] = s.defaultExpanded ?? true;
    });
    return initial;
  });

  // Auto-expand section containing the currently active route
  useEffect(() => {
    navSections.forEach(section => {
      const hasActiveItem = section.items.some(item => isCurrentPath(item.path));
      if (hasActiveItem) {
        setExpandedSections(prev => ({ ...prev, [section.id]: true }));
      }
    });
  }, [location.pathname, location.search]);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const content = (
    <div className="h-full flex flex-col justify-between bg-app-surface text-app-text border-r border-app-border select-none">
      {/* 1. Header / Logo Area */}
      <div className="p-4 flex items-center justify-between border-b border-app-border h-16 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary rounded-btn">
          <Logo collapsed={isCollapsed} />
        </Link>

        {/* Mobile close button */}
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden p-1.5 text-app-text-muted hover:text-app-text rounded-btn transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 2. Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {navSections.map((section) => {
          const isExpanded = expandedSections[section.id] ?? false;
          const hasActiveChild = section.items.some(item => isCurrentPath(item.path));

          return (
            <div key={section.id} className="space-y-1">
              {/* Domain Header (Visible in expanded desktop and mobile drawer) */}
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-micro font-bold uppercase tracking-wider rounded-btn transition-colors cursor-pointer text-left group ${
                    hasActiveChild ? 'text-app-primary font-black' : 'text-app-text-muted hover:text-app-text hover:bg-app-surface-secondary/60'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {section.label}
                    {hasActiveChild && !isExpanded && (
                      <span className="w-1.5 h-1.5 rounded-full bg-app-primary animate-pulse" />
                    )}
                  </span>
                  <ChevronDown 
                    size={13} 
                    className={`transition-transform duration-200 text-app-text-muted group-hover:text-app-text ${
                      isExpanded ? 'rotate-0' : '-rotate-90'
                    }`} 
                  />
                </button>
              )}

              {/* Collapsed view divider */}
              {isCollapsed && (
                <div className="w-6 h-px mx-auto my-2 bg-app-border/60" />
              )}

              {/* Items List (Collapsible on expanded view, always rendered as icon column on collapsed view) */}
              {(isCollapsed || isExpanded) && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isCurrentPath(item.path);
                    const Icon = item.icon;

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.id} content={item.label} position="right">
                          <Link
                            to={item.path}
                            onClick={onMobileClose}
                            className={`flex items-center justify-center w-10 h-10 mx-auto rounded-btn transition-colors duration-150 ${
                              active
                                ? 'bg-app-primary text-white font-semibold shadow-xs'
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
                        key={item.id}
                        to={item.path}
                        onClick={onMobileClose}
                        className={`flex items-center justify-between px-3 py-2 rounded-btn text-small transition-all duration-150 relative group ${
                          active
                            ? 'bg-app-primary text-white font-semibold shadow-xs'
                            : 'text-app-text-secondary hover:bg-app-surface-secondary hover:text-app-text'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon 
                            size={16} 
                            className={`shrink-0 transition-colors ${
                              active ? 'text-white' : 'text-app-text-muted group-hover:text-app-text'
                            }`} 
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${
                            active ? 'bg-white/20 text-white' : 'bg-app-primary-subtle text-app-primary'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
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
            type="button"
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
