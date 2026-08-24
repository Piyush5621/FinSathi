
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Package, DollarSign } from 'lucide-react';

const mobileNavItems = [
  { path: '/dashboard', label: 'Dash', icon: LayoutDashboard },
  { path: '/billing', label: 'POS', icon: Receipt },
  { path: '/inventory', label: 'Stock', icon: Package },
  { path: '/payments', label: 'Cash', icon: DollarSign },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-slate-900 border-t border-slate-800 z-50 px-2 py-3 pb-safe">
      <div className="flex justify-around items-center">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={24} className={isActive ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''} />
              <span className="text-[10px] font-bold tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
