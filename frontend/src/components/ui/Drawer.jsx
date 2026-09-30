import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Drawer({ 
  isOpen, 
  onClose, 
  title, 
  description,
  children, 
  footer,
  maxWidth = 'max-w-md',
  closeOnEscape = true,
}) {
  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/50 dark:bg-black/70 backdrop-blur-[3px]"
          />

          {/* Slide-over Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`w-screen ${maxWidth} bg-app-surface text-app-text border-l border-app-border shadow-2xl flex flex-col`}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-app-border">
                <div className="flex flex-col gap-0.5">
                  {title && <h2 className="text-section-heading font-semibold text-app-text tracking-tight">{title}</h2>}
                  {description && <p className="text-small text-app-text-secondary">{description}</p>}
                </div>
                <button 
                  onClick={onClose}
                  className="p-1.5 text-app-text-muted hover:text-app-text hover:bg-app-surface-secondary rounded-btn transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
                  type="button"
                  aria-label="Close drawer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="p-4 px-5 bg-app-surface-secondary/50 border-t border-app-border flex items-center justify-end gap-2.5">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Drawer;
