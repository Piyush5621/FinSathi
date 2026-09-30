import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import CommandPalette from '../components/ui/CommandPalette';
import OfflineSyncIndicator from '../components/billing/OfflineSyncIndicator';
import AccessDenied from '../components/AccessDenied';

export default function AppLayout() {
  const loggedIn = localStorage.getItem('loggedIn');
  const location = useLocation();

  // Collapsible sidebar state (persisted)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Mobile sidebar drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Toggle collapse handler
  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut: `Ctrl+K` or `Cmd+K` for Command Palette, `[` for collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === '[' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        handleToggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // 1. Auth gate check
  if (!loggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 2. Authoritative Role-Based Route Gate
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const role = currentUser.role || (currentUser.staff_id ? 'Staff' : 'Owner');
  const isOwner = !currentUser.staff_id || role === 'Owner' || role === 'Admin';
  const currentPath = location.pathname;

  const getDenialReason = () => {
    if (isOwner) return null;

    // Owner-only system, settings, store management, and disaster recovery
    if (['/settings', '/stores', '/audit-center', '/backup-wizard'].includes(currentPath)) {
      return 'Business settings and system administration are restricted to the business owner.';
    }

    // GST compliance reports: Owner and Accountant only
    if (currentPath.startsWith('/reports/gst')) {
      if (role !== 'Accountant') {
        return 'GST tax compliance reports are restricted to business owners and accountants.';
      }
    }

    // Cashier restrictions: Cashier is focused on POS Billing, Sales Ledger, Khata, Attendance, Profile
    if (role === 'Cashier') {
      const cashierForbiddenPaths = [
        '/inventory', '/suppliers', '/expenses', '/pnl', 
        '/executive-analytics', '/reports', '/analytics'
      ];
      if (cashierForbiddenPaths.some(p => currentPath.startsWith(p))) {
        return 'Access restricted: Cashiers are authorized for POS Billing, Sales Ledger, and Customer Khata.';
      }
    }

    // Warehouse Staff restrictions
    if (role === 'Warehouse Staff') {
      const warehouseForbidden = [
        '/expenses', '/pnl', '/reports/gst', '/executive-analytics', 
        '/billing', '/reports', '/analytics'
      ];
      if (warehouseForbidden.some(p => currentPath.startsWith(p))) {
        return 'Access restricted: Warehouse staff are authorized for Stock and Purchasing.';
      }
    }

    return null;
  };

  const denialReason = getDenialReason();

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col antialiased">
      {/* 1. Offline Connectivity Indicator */}
      <OfflineSyncIndicator />

      {/* 2. Persistent Desktop & Mobile Drawer Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* 3. Main Workspace Container */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          isCollapsed ? 'md:pl-18' : 'md:pl-64'
        }`}
      >
        {/* Top Header */}
        <Header
          onMenuToggle={() => setMobileOpen(true)}
          onSearchClick={() => setCommandPaletteOpen(true)}
        />

        {/* Dynamic Page Content Outlet or Unauthorized Access Notice */}
        <main className="flex-1 pb-20 md:pb-8 focus:outline-none" tabIndex={-1}>
          {denialReason ? (
            <AccessDenied reason={denialReason} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* 4. Mobile Bottom Navigation Bar */}
      <BottomNav onOpenMenu={() => setMobileOpen(true)} />

      {/* 5. Global Command Palette (`Ctrl+K`) */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />
    </div>
  );
}
