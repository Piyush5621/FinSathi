import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, ShoppingCart, LayoutDashboard, User, Lock, Store } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export default function AccessDenied({ 
  reason = 'You do not have sufficient permissions to access this section.',
  requiredAccess = 'Store Owner or Manager'
}) {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser.role || (currentUser.staff_id ? 'Staff' : 'Owner');
  const isCashier = userRole === 'Cashier';

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 antialiased">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden text-center">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-rose-500/10 dark:bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon Shield */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center shadow-inner mb-5">
          <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 text-rose-600 dark:text-rose-400" />
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs">
            <Lock size={12} />
          </div>
        </div>

        {/* Role Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-micro font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 mb-3">
          <span>Current Role:</span>
          <Badge variant="rose" size="sm">{userRole}</Badge>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          You Are Not Authorized
        </h1>

        {/* Reason */}
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
          {reason}
        </p>

        {/* Business & Owner Context Card */}
        <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-left text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Store size={13} className="text-amber-600 dark:text-amber-400" />
              Store / Business:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
              {currentUser.shop_name || currentUser.business_name || 'My Store'}
            </span>
          </div>
          {currentUser.owner_name && (
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-medium">Store Owner:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                {currentUser.owner_name}
              </span>
            </div>
          )}
          {currentUser.store_name && (
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-medium">Assigned Branch:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                {currentUser.store_name}
              </span>
            </div>
          )}
          <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
            💡 If your duties require access to this section, please ask your store owner to enable permissions for your account.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {isCashier ? (
            <Button
              variant="primary"
              onClick={() => navigate('/billing')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <ShoppingCart size={15} />
              Go to POS Billing Register
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <LayoutDashboard size={15} />
              Return to Dashboard
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => navigate('/profile')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5"
          >
            <User size={15} />
            My Permissions
          </Button>

          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} />
            Go Back
          </Button>
        </div>

      </div>
    </div>
  );
}
