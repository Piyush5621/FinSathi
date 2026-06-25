import { useState, lazy, Suspense } from 'react';

const RemindersPanel = lazy(() => import("./Profile/RemindersPanel"));
const GstReportsPage = lazy(() => import("./GstReportsPage"));
const GrowthPage = lazy(() => import("./GrowthPage"));
const DemoHub = lazy(() => import("./DemoHub"));
import { 
  MessageSquare, Zap, ShieldCheck, History, Wallet, 
  MessageCircle, Receipt, ArrowRight, Settings2, Sparkles, Globe,
  FileSpreadsheet
} from "lucide-react";
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const initialFeatures = [
  { id: 'whatsapp', title: 'WhatsApp PDF Bills', desc: 'Auto-send GST invoices to WhatsApp.', icon: MessageCircle, category: 'Sales', badge: 'Active', enabled: true },
  { id: 'pos', title: 'Keyboard POS', desc: 'Accelerated billing via shortcuts.', icon: Zap, category: 'Sales', badge: 'Pro', enabled: true },
  { id: 'attendance', title: 'Staff Attendance', desc: 'QR based clock-in/out.', icon: ShieldCheck, category: 'HR', badge: 'Active', enabled: true, link: '/staff' },
  { id: 'marketplace', title: 'App Marketplace', desc: 'Extend FS with 3rd party plugins.', icon: Globe, category: 'General', badge: 'New', enabled: false },
  { id: 'audit', title: 'Security Logs', desc: 'Track every action for security.', icon: History, category: 'System', badge: 'Premium', enabled: true },
];

const tabs = [
  { id: 'modules', label: 'Feature Modules', icon: Settings2, desc: 'Configure modular extensions' },
  { id: 'reminders', label: 'Reminders Autopilot', icon: MessageSquare, desc: 'Automate due collections' },
  { id: 'gst', label: 'GST Compliance', icon: FileSpreadsheet, desc: 'Tax reports & filings' },
  { id: 'growth', label: 'Subsidy Matcher', icon: Sparkles, desc: 'Government scheme discoveries' },
  { id: 'marketplace', label: 'App Marketplace', icon: Globe, desc: 'Extend FS capabilities' }
];

export default function GeneralPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("modules");
  const [features, setFeatures] = useState(initialFeatures);

  const toggleFeature = (id) => {
    setFeatures(prev => prev.map(f => {
      if (f.id === id) {
        if (f.badge === 'New') {
            toast.error("Connecting to server... Feature in review.");
            return f;
        }
        toast.success(`${f.title} ${!f.enabled ? 'Enabled' : 'Disabled'}`);
        return { ...f, enabled: !f.enabled };
      }
      return f;
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in-up md:max-w-7xl mx-auto pb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] flex items-center gap-2">
            <Settings2 size={24} className="text-indigo-600" /> Utility & General Hub
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Configure advanced automation tools and modular business extensions.</p>
        </div>
        <Badge variant="indigo" className="w-fit py-1.5 px-4 font-black tracking-widest text-[10px]">VERIFIED PARTNER</Badge>
      </div>

      {/* Tabs Sub-navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="mt-8 transition-all duration-300">
        {activeTab === 'modules' && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
                <Sparkles size={18} className="text-amber-500" />
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Feature Modules</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map(feature => {
                    const Icon = feature.icon;
                    return (
                        <Card key={feature.id} className="p-5 hover:border-indigo-200 transition-all group overflow-hidden relative">
                             <div className="flex justify-between items-start mb-4">
                                <div className={`p-2.5 rounded-xl transition-colors ${feature.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <Icon size={20} />
                                </div>
                                <Badge variant={feature.enabled ? 'success' : 'gray'} className="text-[9px] font-black uppercase">{feature.badge}</Badge>
                             </div>

                             <div onClick={() => feature.link && navigate(feature.link)} className={feature.link ? 'cursor-pointer' : ''}>
                                 <h3 className="text-sm font-black text-[#0F172A] flex items-center justify-between">
                                    {feature.title}
                                    {feature.link && <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-600" />}
                                 </h3>
                                 <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed h-[32px]">
                                    {feature.desc}
                                 </p>
                             </div>

                             <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-50">
                                 <span className={`text-[9px] font-black uppercase tracking-widest ${feature.enabled ? 'text-indigo-600' : 'text-slate-300'}`}>
                                    {feature.enabled ? 'Active' : 'Inactive'}
                                 </span>
                                 <button 
                                    onClick={() => toggleFeature(feature.id)}
                                    className={`w-9 h-5 rounded-full relative transition-all duration-300 ${feature.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                 >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${feature.enabled ? 'left-5' : 'left-1'}`} />
                                 </button>
                             </div>
                        </Card>
                    )
                })}
            </div>
          </section>
        )}

        {activeTab === 'reminders' && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
                <MessageSquare size={18} className="text-indigo-600" />
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Automated Collections</h2>
            </div>
            <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                <Suspense fallback={<div className="p-12 text-center text-slate-400 text-xs font-semibold">Loading Reminders Autopilot...</div>}>
                    <RemindersPanel />
                </Suspense>
            </div>
          </section>
        )}

        {activeTab === 'gst' && (
          <Suspense fallback={<div className="p-12 text-center text-slate-400 text-xs font-semibold">Loading GST compliance...</div>}>
            <GstReportsPage />
          </Suspense>
        )}

        {activeTab === 'growth' && (
          <Suspense fallback={<div className="p-12 text-center text-slate-400 text-xs font-semibold">Loading Subsidy Matcher...</div>}>
            <GrowthPage />
          </Suspense>
        )}

        {activeTab === 'marketplace' && (
          <Suspense fallback={<div className="p-12 text-center text-slate-400 text-xs font-semibold">Loading App Marketplace...</div>}>
            <DemoHub />
          </Suspense>
        )}
      </div>
    </div>
  );
}
