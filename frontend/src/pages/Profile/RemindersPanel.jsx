import { useState, useEffect } from "react";
import API from "../../services/apiClient";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Bell, ShieldCheck, MessageSquare, Zap, BadgeAlert } from "lucide-react";
import toast from "react-hot-toast";

export default function RemindersPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    threshold: 500,
    days_past_due: 7,
    template: "",
    auto_send_on_create: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await API.get("/reminders/settings");
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put("/reminders/settings", settings);
      toast.success("Reminder automation updated!");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400 font-medium">Loading automation settings...</div>;

  return (
    <Card className="mt-8 border-t-4 border-indigo-600 bg-slate-50/50 border-slate-150">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bell className="text-indigo-600 animate-swing" size={20} /> Automated Due Reminders
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Automate your debt collections and bills delivery via SMS or WhatsApp.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
           <span className={`text-[10px] font-extrabold uppercase tracking-wider ${settings.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {settings.enabled ? "ACTIVE" : "DISABLED"}
           </span>
           <button 
             onClick={() => setSettings({...settings, enabled: !settings.enabled})}
             className={`w-10 h-5 rounded-full transition-colors relative focus:outline-none ${settings.enabled ? 'bg-emerald-500' : 'bg-slate-350'}`}
           >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.enabled ? 'right-0.5' : 'left-0.5'}`} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Rules Column */}
        <div className="space-y-4">
           {/* Card 1: Trigger Threshold */}
           <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-150 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                 <ShieldCheck size={20} />
              </div>
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trigger Threshold</label>
                 <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-slate-400 font-black">₹</span>
                    <input 
                      type="number"
                      value={settings.threshold}
                      onChange={(e) => setSettings({...settings, threshold: e.target.value})}
                      className="bg-transparent text-base font-extrabold text-slate-900 border-none focus:ring-0 p-0 w-24 outline-none"
                    />
                 </div>
                 <p className="text-[10px] text-slate-400 mt-1">Only remind if the customer due is above this amount.</p>
              </div>
           </div>

           {/* Card 2: Days Past Due */}
           <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-150 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                 <Zap size={20} />
              </div>
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Days Past Due</label>
                 <div className="flex items-center gap-1.5 mt-1">
                    <input 
                      type="number"
                      value={settings.days_past_due}
                      onChange={(e) => setSettings({...settings, days_past_due: e.target.value})}
                      className="bg-transparent text-base font-extrabold text-slate-900 border-none focus:ring-0 p-0 w-16 outline-none"
                    />
                    <span className="text-slate-400 font-semibold text-sm">Days</span>
                 </div>
                 <p className="text-[10px] text-slate-400 mt-1">Schedule automatic reminder messages X days after the due date.</p>
              </div>
           </div>

           {/* Card 3: Instant Receipt */}
           <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-150 shadow-sm relative group">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                 <BadgeAlert size={20} />
              </div>
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Instant Receipt Delivery</label>
                 <p className="text-[10px] text-slate-400 mt-1">Auto-send invoice summary via WhatsApp immediately when a new bill is saved.</p>
              </div>
              <div className="flex items-center">
                 <button 
                   onClick={() => setSettings({...settings, auto_send_on_create: !settings.auto_send_on_create})}
                   className={`w-10 h-5 rounded-full transition-colors relative focus:outline-none ${settings.auto_send_on_create ? 'bg-emerald-500' : 'bg-slate-350'}`}
                 >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.auto_send_on_create ? 'right-0.5' : 'left-0.5'}`} />
                 </button>
              </div>
           </div>
        </div>

        {/* Right Message Columns */}
        <div className="flex flex-col gap-2 p-4 bg-white rounded-2xl border border-slate-150 shadow-sm">
           <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                 <MessageSquare size={14} className="text-slate-400" /> Reminder Template
              </label>
              <div className="flex gap-1.5">
                 {['{CustomerName}', '{Amount}', '{InvoiceNo}'].map(tag => (
                   <button 
                     key={tag}
                     type="button"
                     onClick={() => setSettings({...settings, template: settings.template + ' ' + tag})}
                     className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors focus:outline-none"
                   >
                      {tag}
                   </button>
                 ))}
              </div>
           </div>
           <textarea 
             value={settings.template}
             onChange={(e) => setSettings({...settings, template: e.target.value})}
             rows={5}
             className="w-full mt-2 bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none custom-scrollbar"
             placeholder="Dear {CustomerName}, your pending payment of {Amount} is due. Please clear it ASAP."
           />
           <p className="text-[9px] text-slate-400 italic mt-1 font-medium">Placeholders will be substituted dynamically during message dispatch.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-4 border-t border-slate-100">
         <Button 
           onClick={handleSave} 
           disabled={saving} 
           className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
         >
            {saving ? "Saving..." : "Update Collection Rules"}
         </Button>
      </div>
    </Card>
  );
}
