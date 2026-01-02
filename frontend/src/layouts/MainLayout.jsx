import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../pages/Dashboard/components/Topbar";

const pathToName = (path) => {
  if (!path) return "Dashboard";
  if (path.startsWith("/customers")) return "Customers";
  if (path.startsWith("/inventory")) return "Inventory";
  if (path.startsWith("/billing")) return "Billing";
  if (path.startsWith("/pos")) return "POS";
  if (path.startsWith("/reports")) return "Reports";
  if (path.startsWith("/cloud")) return "Cloud";
  if (path.startsWith("/settings")) return "Settings";
  if (path.startsWith("/profile")) return "Profile";
  return "Dashboard";
};

export default function MainLayout() {
  const location = useLocation();
  const [active, setActive] = useState(pathToName(location.pathname));

  useEffect(() => {
    setActive(pathToName(location.pathname));
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-[#0f172a] text-slate-100 font-inter">
      <Sidebar active={active} onNavigate={setActive} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Background Ambient Glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <Topbar demoMode={false} onToggleDemo={() => { }} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
