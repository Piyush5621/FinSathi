import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, ShieldCheck, AlertTriangle, Sparkles, X, Check } from 'lucide-react';
import API from '../../services/apiClient';

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
    if (severity === 'critical') return 'bg-app-danger-subtle text-app-danger';
    if (severity === 'warning') return 'bg-app-warning-subtle text-app-warning';
    return 'bg-app-primary-subtle text-app-primary';
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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-app-text-muted hover:text-app-text hover:bg-app-surface-secondary rounded-btn transition-colors cursor-pointer"
        aria-label="System Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-app-danger text-micro font-bold text-white ring-2 ring-app-surface">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay to close */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 sm:w-96 z-50 bg-app-surface text-app-text border border-app-border rounded-modal shadow-elevated p-4 space-y-3 animate-fade-in">
            <div className="flex justify-between items-center pb-2.5 border-b border-app-border">
              <h3 className="text-caption font-semibold uppercase tracking-wider text-app-text-muted">
                System Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-micro font-bold text-app-primary bg-app-primary-subtle px-2 py-0.5 rounded-control">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2.5 p-3 rounded-card border transition-all ${
                    n.is_read
                      ? 'border-app-border/40 bg-app-surface-secondary/30 text-app-text-muted opacity-75'
                      : 'border-app-border bg-app-surface text-app-text shadow-xs'
                  }`}
                >
                  <div className={`p-1.5 rounded-btn shrink-0 ${getSeverityStyle(n.severity)}`}>
                    {getSeverityIcon(n.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-small ${n.is_read ? 'font-normal text-app-text-secondary' : 'font-semibold text-app-text'}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-caption text-app-text-secondary mt-0.5 leading-normal">
                        {n.message}
                      </p>
                    )}
                  </div>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="p-1 text-app-text-muted hover:text-app-success rounded-btn hover:bg-app-surface-secondary cursor-pointer"
                      title="Mark as read"
                    >
                      <Check size={13} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="text-center py-8 text-small text-app-text-muted">
                  <ShieldCheck size={28} className="mx-auto mb-2 opacity-30" />
                  No notifications
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
