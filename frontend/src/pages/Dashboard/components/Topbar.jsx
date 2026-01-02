import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Bell, Download, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { exportElementToPDF } from "../../../utils/exportPDF";
import API from "../../../services/apiClient";
import toast from "react-hot-toast";
import { supabase } from "../../../lib/supabaseClient";
import DarkModeToggle from "../../../components/DarkModeToggle";

const Topbar = ({ demoMode = false, onToggleDemo = () => { } }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Theme Toggle State
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

  // ... refs and other hooks ...

  // Scroll down to render...

  const dropdownRef = useRef();
  const notifRef = useRef();
  const exportRef = useRef();
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user"));
  const userName = storedUser?.name || "FinSathi User";
  const firstLetter = userName.charAt(0).toUpperCase();

  /** 🔔 Fetch Notifications Once */
  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // ✅ Subscribe to realtime DB events for notifications
    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotification = payload.new;
          setNotifications((prev) => [newNotification, ...prev]);
          toast.success(`🔔 ${newNotification.title}`, { duration: 3000 });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ⚙️ Export report
  const handleExport = async (mode = "client") => {
    try {
      if (mode === "client") {
        await exportElementToPDF("dashboard-root", "FinSathi-Report.pdf");
        toast.success("⚡ Quick Export completed (Client-side)");
      } else {
        const res = await API.get("/report/dashboard", { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "FinSathi-Report.pdf");
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("🖨️ Full Report downloaded (Server-side)");
      }
    } catch (err) {
      toast.error("Failed to export report ❌");
    } finally {
      setExportOpen(false);
    }
  };

  // 🔕 Mark all as read
  const handleMarkAllRead = () => {
    setNotifications([]);
    toast("All notifications marked as read ✅", { icon: "📭" });
  };

  // 🚪 Logout
  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged out successfully 👋");
    navigate("/");
  };

  const handleProfile = () => navigate("/profile");

  // 🧩 Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
      if (exportRef.current && !exportRef.current.contains(e.target))
        setExportOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between px-8 py-4 bg-white/10 backdrop-blur-lg border-b border-white/10 relative z-40">
      {/* 👋 Welcome */}
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="text-xl font-semibold text-white tracking-wide"
      >
        Welcome back,{" "}
        <span className="font-bold text-emerald-300">
          {userName.split(" ")[0]} 👋
        </span>
      </motion.h1>

      {/* 🎛 Controls */}
      <div className="flex items-center gap-6 relative">
        {/* 🔔 Notifications */}
        <div ref={notifRef} className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Open notifications"
            className="relative text-white hover:text-emerald-300 transition"
          >
            <Bell size={22} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] text-white px-1.5 py-[1px] rounded-full">
                {notifications.length}
              </span>
            )}
          </motion.button>

          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute right-0 top-10 w-80 bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-lg z-[999] overflow-hidden"
            >
              <div className="flex justify-between items-center px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-300 hover:text-indigo-100"
                  >
                    Mark all as read
                  </button>
                )}
                <X
                  size={16}
                  onClick={() => setNotifOpen(false)}
                  className="cursor-pointer hover:text-red-400 transition ml-2"
                />
              </div>

              {notifications.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto custom-scrollbar">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className="px-4 py-3 hover:bg-white/10 transition flex flex-col"
                    >
                      <span className="text-sm font-medium">{n.title}</span>
                      <span className="text-xs text-indigo-200">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-sm text-indigo-200 py-4">
                  No new notifications 🎉
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* 📄 Export */}
        <div ref={exportRef} className="relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setExportOpen(!exportOpen)}
            aria-label="Export report"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-emerald-500 hover:opacity-90 text-white px-3 py-2 rounded-lg text-sm font-medium transition shadow-md"
          >
            <Download size={18} />
            Export
          </motion.button>

          {exportOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute right-0 top-10 bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-lg shadow-xl overflow-hidden w-52 z-[999]"
            >
              <button
                onClick={() => handleExport("client")}
                className="block w-full text-left px-4 py-3 hover:bg-white/20 transition"
              >
                ⚡ Quick Export (Client)
              </button>
              <button
                onClick={() => handleExport("server")}
                className="block w-full text-left px-4 py-3 hover:bg-white/20 transition"
              >
                🖨️ Full Report (Server)
              </button>
            </motion.div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="hidden md:block">
          <DarkModeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
        </div>

        {/* 🧑 Profile */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          ref={dropdownRef}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-emerald-500 flex items-center justify-center text-white font-semibold cursor-pointer hover:scale-105 transition"
        >
          {firstLetter}
        </motion.div>

        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute right-0 top-12 bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-xl w-48 overflow-hidden z-[999]"
          >
            <button
              onClick={handleProfile}
              className="block w-full text-left px-4 py-3 hover:bg-white/20 transition"
            >
              👤 Profile
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="block w-full text-left px-4 py-3 hover:bg-white/20 transition"
            >
              ⚙️ Settings
            </button>
            <hr className="border-white/10" />
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-3 hover:bg-red-500/30 text-red-200 transition"
            >
              🚪 Logout
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
