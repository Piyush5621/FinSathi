import {  useState, useEffect  } from 'react';
import { Search, ChevronDown, Store } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import { useStore } from '../contexts/StoreContext';
import NotificationDropdown from './Dashboard/NotificationDropdown';

const Header = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

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
        {/* Left section with tagline & store selection */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:block">
            <h2 className="text-lg font-medium text-text-light dark:text-text-dark">
              Your business. Your growth.{' '}
              <span className="text-primary-600 font-semibold">Your FinSathi.</span>
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
                    {s.name}
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
                className="w-64 px-4 py-2 pl-10 text-sm text-text-light dark:text-text-dark bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:border-primary-500"
              />
              <Search
                size={18}
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
            <button className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
              <div className="relative">
                <img
                  src="https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff"
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card-light dark:border-card-dark"></div>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-text-light dark:text-text-dark">User Name</p>
                <p className="text-xs text-gray-400">Business Owner</p>
              </div>
              <ChevronDown size={16} className="hidden md:block text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
