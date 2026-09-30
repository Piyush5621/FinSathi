import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  description,
  children, 
  footer,
  maxWidth = 'max-w-lg',
  showClose = true,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/50 dark:bg-black/70 backdrop-blur-[3px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ type: "spring", duration: 0.25, bounce: 0 }}
            className={`relative bg-app-surface text-app-text border border-app-border rounded-modal shadow-modal w-full my-auto overflow-hidden z-10 ${maxWidth}`}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-start justify-between p-5 pb-4 border-b border-app-border">
                <div className="flex flex-col gap-0.5">
                  {title && <h2 className="text-section-heading font-semibold text-app-text tracking-tight">{title}</h2>}
                  {description && <p className="text-small text-app-text-secondary">{description}</p>}
                </div>
                {showClose && (
                  <button 
                    onClick={onClose}
                    className="p-1.5 text-app-text-muted hover:text-app-text hover:bg-app-surface-secondary rounded-btn transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
                    type="button"
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-130px)] custom-scrollbar">
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
      )}
    </AnimatePresence>
  );
}

export default Modal;
