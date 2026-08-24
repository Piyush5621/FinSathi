import { useState, useEffect } from 'react';
import { Search, ChevronDown, Store, User, ShieldCheck } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import { useStore } from '../contexts/StoreContext';
import NotificationDropdown from './Dashboard/NotificationDropdown';
import { Badge } from './ui/Badge';

const Header = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser.role || 'Owner';

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const { stores, activeStoreId, switchStore } = useStore();

  return (
    <header className="sticky top-0 z-30 w-full px-6 py-4 bg-card-light dark:bg-card-dark backdrop-blur-lg border-b border-border-light dark:border-border-dark">
      <div className="flex items-center justify-between">
        {/* Left section with active branch indicator */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:block">
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>{currentUser.business_name || 'Karobar'}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-indigo-600 font-bold">{userRole} Workspace</span>
            </h2>
          </div>

          {stores && stores.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm">
              <Store size={14} className="text-indigo-600 dark:text-indigo-400" />
              <select
                value={activeStoreId || ''}
                onChange={(e) => switchStore(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer border-none p-0 pr-6"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id} className="dark:bg-slate-800">
                    {s.name} {s.assigned_role ? `(${s.assigned_role})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right section with search, notifications, and profile */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-56 px-4 py-1.5 pl-10 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
              />
              <Search
                size={15}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {/* Theme Toggle */}
          <DarkModeToggle isDark={isDark} onToggle={toggleTheme} />

          {/* Notifications */}
          <NotificationDropdown />

          {/* Profile */}
          <div className="flex items-center">
            <div className="flex items-center space-x-3 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                  {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" title="Active Account"></div>
              </div>
              <div className="hidden md:block text-left pr-2">
                <p className="text-xs font-black text-slate-900 dark:text-slate-100">{currentUser.name || 'Staff User'}</p>
                <p className="text-[10px] text-slate-400 font-bold">{userRole}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
