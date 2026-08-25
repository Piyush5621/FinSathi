import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, Menu } from 'lucide-react';

export function BottomNav({ onOpenMenu }) {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/billing', label: 'POS Billing', icon: ShoppingCart },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/customers', label: 'Customers', icon: Users },
  ];

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

      {/* Menu / More Button */}
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
