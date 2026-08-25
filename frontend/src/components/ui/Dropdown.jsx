import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Dropdown({
  trigger,
  children,
  align = 'right', // 'left' | 'right'
  className = '',
  menuClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer inline-flex">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-50 mt-1.5 min-w-[180px] bg-app-surface text-app-text border border-app-border rounded-panel shadow-elevated py-1.5 focus:outline-none ${
              align === 'right' ? 'right-0' : 'left-0'
            } ${menuClassName}`}
            role="menu"
            aria-orientation="vertical"
          >
            <div onClick={() => setIsOpen(false)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  icon,
  danger = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full text-left flex items-center gap-2 px-3.5 py-2 text-small transition-colors duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? 'text-app-danger hover:bg-app-danger-subtle'
          : 'text-app-text hover:bg-app-surface-secondary'
      } ${className}`}
      role="menuitem"
      {...props}
    >
      {icon && <span className="shrink-0 text-app-text-muted">{icon}</span>}
      <span className="truncate flex-1">{children}</span>
    </button>
  );
}

export function DropdownSeparator({ className = '' }) {
  return <div className={`my-1 h-px bg-app-border ${className}`} role="separator" />;
}

export function DropdownHeader({ children, className = '' }) {
  return (
    <div className={`px-3.5 py-1 text-micro font-semibold uppercase tracking-wider text-app-text-muted ${className}`}>
      {children}
    </div>
  );
}

export default Dropdown;
