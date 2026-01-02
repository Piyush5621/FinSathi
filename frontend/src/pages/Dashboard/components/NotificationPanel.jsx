import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import API from "../../../services/apiClient";
import { supabase } from "../../../lib/supabaseClient";
import toast from "react-hot-toast";

const notificationIcons = {
  success: <CheckCircle2 size={18} className="text-emerald-400" />,
  warning: <AlertTriangle size={18} className="text-amber-400" />,
  info: <Info size={18} className="text-indigo-400" />,
};

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ✅ Fetch live notifications from backend
  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to fetch notifications:", err.message);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch every 15 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);

    // Subscribe to realtime notifications so panel updates immediately
    let notifChannel;
    try {
      notifChannel = supabase
        .channel("public:notifications")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          (payload) => {
            setNotifications((prev) => [payload.new, ...prev]);
            setLastUpdated(new Date().toLocaleTimeString());
            toast.success(`🔔 ${payload.new.title}`);
          }
        )
        .subscribe();
    } catch (e) {
      console.debug("Supabase notifications realtime not available", e.message || e);
    }

    return () => {
      clearInterval(interval);
      if (notifChannel) supabase.removeChannel(notifChannel);
    };
  }, []);

  const handleDismiss = (id) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const activeNotifications = notifications.filter(
    (n) => !dismissedIds.has(n.id)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="h-full flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Bell size={22} className="text-emerald-300" />
          <h3 className="text-lg font-semibold">Recent Notifications</h3>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-300">
            Updated at {lastUpdated}
          </span>
        )}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <p className="text-indigo-200 text-sm text-center py-6 animate-pulse">
            Loading notifications...
          </p>
        ) : activeNotifications.length > 0 ? (
          <ul className="space-y-3">
            <AnimatePresence>
              {activeNotifications.map((n) => (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex justify-between items-start bg-white/5 hover:bg-white/10 transition rounded-xl px-4 py-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {notificationIcons[n.type] || notificationIcons.info}
                    </div>
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-xs text-gray-300">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss(n.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">
            No new notifications 🎉
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationPanel;
