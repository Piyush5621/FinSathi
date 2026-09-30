import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, Calendar, User, Menu } from 'lucide-react';

export function BottomNav({ onOpenMenu }) {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const role = currentUser?.role || 'Owner';
  const isOwner = role === 'Owner' || role === 'Admin' || !currentUser?.staff_id;
  const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const hasWildcard = permissions.includes('*') || isOwner;
  const hasPerm = (perm) => hasWildcard || permissions.includes(perm);

  // Role-tailored mobile bottom shortcuts
  let navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/billing', label: 'Billing', icon: ShoppingCart },
    { path: '/inventory', label: 'Stock', icon: Package },
    { path: '/customers', label: 'Customers', icon: Users },
  ];

  // For non-owner staff without sales or catalog permission (e.g. general staff or delivery)
  if (!isOwner && !hasPerm('create_sales') && !hasPerm('view_catalog')) {
    navItems = [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { path: '/staff?tab=attendance', label: 'Attendance', icon: Calendar },
      { path: '/profile', label: 'Profile', icon: User },
    ];
  }

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-app-surface/95 backdrop-blur-md border-t border-app-border px-2 flex items-center justify-around shadow-modal"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-btn transition-colors ${
                isActive
                  ? 'text-app-primary font-semibold'
                  : 'text-app-text-muted hover:text-app-text'
              }`
            }
          >
            <Icon size={19} />
            <span className="text-micro leading-none">{item.label}</span>
          </NavLink>
        );
      })}

      {/* Menu / More Button (Opens full domain-grouped drawer) */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-btn text-app-text-muted hover:text-app-text transition-colors cursor-pointer"
        aria-label="Open Full Menu"
      >
        <Menu size={19} />
        <span className="text-micro leading-none">More</span>
      </button>
    </nav>
  );
}

export default BottomNav;
