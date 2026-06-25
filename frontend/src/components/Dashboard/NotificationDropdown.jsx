import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, ShieldCheck, AlertTriangle, Sparkles, X, Check } from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

export default function NotificationDropdown() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const loggedIn = localStorage.getItem('loggedIn');

  // Query notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await API.get('/notifications');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: !!loggedIn,
    refetchInterval: 30000, // Poll every 30s
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Mark as read mutation
  const readMutation = useMutation({
    mutationFn: async (id) => {
      const res = await API.patch(`/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleMarkAsRead = (id, e) => {
    e.stopPropagation();
    readMutation.mutate(id);
  };

  const getSeverityStyle = (severity) => {
    if (severity === 'critical') return 'bg-rose-50 text-rose-600 dark:bg-rose-950/20';
    if (severity === 'warning') return 'bg-amber-50 text-amber-600 dark:bg-amber-950/20';
    return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return <AlertTriangle size={14} className="shrink-0" />;
    if (severity === 'warning') return <AlertTriangle size={14} className="shrink-0" />;
    return <Sparkles size={14} className="shrink-0" />;
  };

  return (
    <div className="relative">
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-text-light dark:hover:text-text-dark rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay to close */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl p-4 space-y-3 animate-fade-in-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">System Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all ${
                    n.is_read
                      ? 'border-slate-50 bg-slate-50/20 text-slate-400'
                      : 'border-indigo-100/50 bg-indigo-50/10 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${getSeverityStyle(n.severity)}`}>
                    {getSeverityIcon(n.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${n.is_read ? 'font-medium' : 'font-bold'}`}>{n.title}</p>
                    {n.message && (
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{n.message}</p>
                    )}
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="p-1 text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-50"
                      title="Mark as read"
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                  )}
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="text-center py-8 text-xs font-bold text-slate-400">
                  <ShieldCheck size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                  No notifications yet
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
