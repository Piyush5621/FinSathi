import { useState, useEffect } from "react";
import API from "../../services/apiClient";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Bell, ShieldCheck, MessageSquare, Zap } from "lucide-react";
import toast from "react-hot-toast";

export default function RemindersPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    threshold: 500,
    days_past_due: 7,
    template: ""
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

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400">Loading automation settings...</div>;

  return (
    <Card className="mt-8 border-t-4 border-indigo-600 bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Bell className="text-indigo-600" /> Automated Due Reminders
          </h3>
          <p className="text-sm text-slate-500 font-medium">Auto-pilot your debt collection via SMS/WhatsApp.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
           <span className={`text-[10px] font-black uppercase tracking-widest ${settings.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {settings.enabled ? "ACTIVE" : "DISABLED"}
           </span>
           <button 
             onClick={() => setSettings({...settings, enabled: !settings.enabled})}
             className={`w-12 h-6 rounded-full transition-colors relative ${settings.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
           >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enabled ? 'right-1' : 'left-1'}`} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
           <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                 <ShieldCheck size={20} />
              </div>
              <div className="flex-1">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Trigger Threshold</label>
                 <div className="flex items-center gap-2 mt-1">
                    <span className="text-slate-400 font-bold">₹</span>
                    <input 
                      type="number"
                      value={settings.threshold}
                      onChange={(e) => setSettings({...settings, threshold: e.target.value})}
                      className="bg-transparent text-lg font-black text-slate-900 border-none focus:ring-0 p-0 w-24"
                    />
                 </div>
                 <p className="text-[10px] text-slate-400 mt-1">Only remind if due is above this amount.</p>
              </div>
           </div>

           <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                 <Zap size={20} />
              </div>
              <div className="flex-1">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Days Past Due</label>
                 <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="number"
                      value={settings.days_past_due}
                      onChange={(e) => setSettings({...settings, days_past_due: e.target.value})}
                      className="bg-transparent text-lg font-black text-slate-900 border-none focus:ring-0 p-0 w-16"
                    />
                    <span className="text-slate-400 font-bold">Days</span>
                 </div>
                 <p className="text-[10px] text-slate-400 mt-1">Schedule message X days after due date.</p>
              </div>
           </div>
        </div>

        <div className="flex flex-col gap-2 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                 <MessageSquare size={14} /> Message Template
              </label>
              <div className="flex gap-1">
                 {['{CustomerName}', '{Amount}', '{InvoiceNo}'].map(tag => (
                   <button 
                     key={tag}
                     type="button"
                     onClick={() => setSettings({...settings, template: settings.template + ' ' + tag})}
                     className="text-[9px] px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
                   >
                      {tag}
                   </button>
                 ))}
              </div>
           </div>
           <textarea 
             value={settings.template}
             onChange={(e) => setSettings({...settings, template: e.target.value})}
             rows={4}
             className="w-full mt-2 bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
             placeholder="Hi {CustomerName}, your pending due..."
           />
           <p className="text-[10px] text-slate-400 italic mt-1">Tags will be automatically replaced with customer data.</p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
         <Button 
           onClick={handleSave} 
           disabled={saving} 
           loading={saving}
           className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
         >
            Update Collection Rules
         </Button>
      </div>
    </Card>
  );
}
