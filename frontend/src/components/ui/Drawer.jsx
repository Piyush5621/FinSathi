
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Drawer({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-100 flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
