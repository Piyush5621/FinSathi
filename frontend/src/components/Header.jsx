import React, { useState } from 'react';
import { 
  Search, Store, User, LogOut, Settings, Calendar, DollarSign, 
  Menu, Sun, Moon, Monitor, ChevronDown, Check, ShieldCheck,
  Command, Building2
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../contexts/StoreContext';
import NotificationDropdown from './Dashboard/NotificationDropdown';
import Dropdown, { DropdownItem, DropdownSeparator, DropdownHeader } from './ui/Dropdown';
import { Badge } from './ui/Badge';
import { useNavigate, Link } from 'react-router-dom';

export function Header({ 
  onMenuToggle, 
  onSearchClick,
}) {
  const navigate = useNavigate();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const { stores, activeStoreId, activeStore, switchStore } = useStore();

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser.role || 'Owner';
  const isOwner = userRole === 'Owner' || userRole === 'Admin' || !currentUser.staff_id;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loggedIn');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 w-full h-16 bg-app-surface/90 backdrop-blur-md border-b border-app-border px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
      {/* Left Section: Menu Toggle & Active Context */}
      <div className="flex items-center gap-3 min-w-0">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="p-2 text-app-text-muted hover:text-app-text hover:bg-app-surface-secondary rounded-btn transition-colors shrink-0 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu size={19} />
          </button>
        )}

        {/* Business Title & Active Branch Context */}
        <div className="hidden sm:flex items-center gap-2 min-w-0 truncate">
          <span className="font-semibold text-app-text text-small truncate">
            {currentUser.business_name || 'Karobar Business'}
          </span>
          <span className="text-app-text-muted/40">•</span>
          <Badge variant="blue" size="sm">
            {userRole}
          </Badge>
        </div>
      </div>

      {/* Center Section: Global Search Bar Trigger */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4">
        <button
          type="button"
          onClick={onSearchClick}
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-small text-app-text-muted bg-app-surface-secondary hover:bg-app-surface-secondary/80 border border-app-border rounded-input transition-all cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary"
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <Search size={15} className="shrink-0 text-app-text-muted" />
            <span className="truncate">Search commands, products, bills...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-micro font-mono font-medium text-app-text-muted bg-app-surface border border-app-border rounded-control shadow-xs shrink-0">
            <Command size={10} /> K
          </kbd>
        </button>
      </div>

      {/* Right Section: Branch Switcher, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* 1. Branch / Store Switcher Dropdown (If stores exist) */}
        {stores && stores.length > 0 && (
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-small font-medium text-app-text bg-app-surface border border-app-border hover:bg-app-surface-secondary rounded-btn transition-colors shadow-xs"
                title="Active Store Branch"
              >
                <Store size={14} className="text-app-primary shrink-0" />
                <span className="hidden md:inline truncate max-w-[120px]">
                  {activeStore?.name || 'Main Branch'}
                </span>
                <ChevronDown size={13} className="text-app-text-muted shrink-0" />
              </button>
            }
          >
            <DropdownHeader>Switch Store Branch</DropdownHeader>
            {stores.map((s) => {
              const isSelected = s.id === activeStoreId;
              return (
                <DropdownItem
                  key={s.id}
                  onClick={() => switchStore(s.id)}
                  className={isSelected ? 'bg-app-primary-subtle/50 font-semibold' : ''}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{s.name}</span>
                    {isSelected && <Check size={14} className="text-app-primary" />}
                  </div>
                </DropdownItem>
              );
            })}
            {isOwner && (
              <>
                <DropdownSeparator />
                <DropdownItem
                  icon={<Building2 size={14} />}
                  onClick={() => navigate('/stores')}
                >
                  Manage Branches
                </DropdownItem>
              </>
            )}
          </Dropdown>
        )}

        {/* 2. System Notifications Dropdown */}
        <NotificationDropdown />

        {/* 3. Appearance / Theme Menu */}
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="p-2 text-app-text-muted hover:text-app-text hover:bg-app-surface-secondary rounded-btn transition-colors"
              title={`Theme: ${themeMode}`}
              aria-label="Appearance Mode"
            >
              {themeMode === 'dark' && <Moon size={17} />}
              {themeMode === 'light' && <Sun size={17} />}
              {themeMode === 'system' && <Monitor size={17} />}
            </button>
          }
        >
          <DropdownHeader>Appearance</DropdownHeader>
          <DropdownItem
            icon={<Sun size={15} />}
            onClick={() => setThemeMode('light')}
          >
            <div className="flex items-center justify-between w-full">
              <span>Light Mode</span>
              {themeMode === 'light' && <Check size={14} className="text-app-primary" />}
            </div>
          </DropdownItem>
          <DropdownItem
            icon={<Moon size={15} />}
            onClick={() => setThemeMode('dark')}
          >
            <div className="flex items-center justify-between w-full">
              <span>Dark Mode</span>
              {themeMode === 'dark' && <Check size={14} className="text-app-primary" />}
            </div>
          </DropdownItem>
          <DropdownItem
            icon={<Monitor size={15} />}
            onClick={() => setThemeMode('system')}
          >
            <div className="flex items-center justify-between w-full">
              <span>System Default</span>
              {themeMode === 'system' && <Check size={14} className="text-app-primary" />}
            </div>
          </DropdownItem>
        </Dropdown>

        {/* 4. User Profile & Account Menu */}
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 p-1 pl-1.5 text-left rounded-btn border border-app-border/80 hover:bg-app-surface-secondary transition-all cursor-pointer bg-app-surface shadow-xs"
              aria-label="User profile menu"
            >
              <div className="w-7 h-7 rounded-btn bg-app-primary text-white flex items-center justify-center font-bold text-micro shrink-0 shadow-xs">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:flex flex-col min-w-0 pr-1 leading-none">
                <span className="text-caption font-semibold text-app-text truncate max-w-[110px]">
                  {currentUser.name || 'User'}
                </span>
                <span className="text-micro text-app-text-muted mt-0.5">
                  {userRole}
                </span>
              </div>
              <ChevronDown size={12} className="text-app-text-muted hidden sm:block shrink-0" />
            </button>
          }
        >
          <div className="px-3.5 py-2.5 border-b border-app-border bg-app-surface-secondary/40">
            <p className="text-small font-semibold text-app-text truncate">{currentUser.name || 'Staff User'}</p>
            <p className="text-caption text-app-text-muted truncate">{currentUser.email || ''}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge variant="blue" size="sm">{userRole}</Badge>
              {activeStore && (
                <span className="text-micro text-app-text-secondary truncate">
                  • {activeStore.name}
                </span>
              )}
            </div>
          </div>

          <DropdownItem
            icon={<User size={15} />}
            onClick={() => navigate('/profile')}
          >
            My Account
          </DropdownItem>

          {!isOwner && (
            <>
              <DropdownItem
                icon={<Calendar size={15} />}
                onClick={() => navigate('/staff?tab=attendance')}
              >
                My Attendance
              </DropdownItem>
              <DropdownItem
                icon={<DollarSign size={15} />}
                onClick={() => navigate('/staff?tab=payroll')}
              >
                My Payslips
              </DropdownItem>
            </>
          )}

          {isOwner && (
            <DropdownItem
              icon={<Settings size={15} />}
              onClick={() => navigate('/settings')}
            >
              Business Settings
            </DropdownItem>
          )}

          <DropdownSeparator />

          <DropdownItem
            icon={<LogOut size={15} />}
            danger
            onClick={handleLogout}
          >
            Sign Out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}

export default Header;
