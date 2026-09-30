import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../services/apiClient';
import { useStore } from '../../contexts/StoreContext';
import { Card, MetricCard } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Bell, AlertTriangle, ShieldAlert, CheckCircle2, 
  MessageSquare, Zap, Clock, Store, RefreshCw, 
  ArrowRight, Users, Package, DollarSign, Send, 
  SlidersHorizontal, ShieldCheck, Eye, Trash2, 
  X, Check, History, Sparkles, Filter, ChevronRight,
  RotateCcw, Sliders
} from 'lucide-react';

export default function AlertsAutomationCenter() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeStore } = useStore();

  // Workspace Tabs: 'feed' | 'autopilot' | 'history'
  const initialTab = searchParams.get('tab') || 'feed';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedSeverity, setSelectedSeverity] = useState('all'); // 'all' | 'critical' | 'warning' | 'info'
  const [loading, setLoading] = useState(true);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Live Datasets
  const [dashboardData, setDashboardData] = useState(null);
  const [anomalyFlags, setAnomalyFlags] = useState([]);
  const [reminderSettings, setReminderSettings] = useState({
    enabled: true,
    threshold: 500,
    days_past_due: 7,
    template: "Hello {customer_name}, your payment of ₹{amount} for invoice #{invoice_no} at {shop_name} is overdue. Please settle at your earliest convenience.",
    auto_send_on_create: false
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Local State for Snoozed & Dismissed Alerts
  const [snoozedAlerts, setSnoozedAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('karobar_snoozed_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('karobar_dismissed_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch Authoritative Datasets
  const fetchAlertsData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, anomalyRes, reminderRes] = await Promise.all([
        API.get('/dashboard').catch(() => ({ data: null })),
        API.get('/intelligence/anomalies').catch(() => ({ data: { data: [] } })),
        API.get('/reminders/settings').catch(() => ({ data: null }))
      ]);

      if (dashRes.data) setDashboardData(dashRes.data);
      setAnomalyFlags(anomalyRes.data?.data || []);
      if (reminderRes.data) setReminderSettings(reminderRes.data);
    } catch (err) {
      console.error("Alerts fetch error:", err);
      toast.error("Failed to load active alert signals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertsData();
  }, [fetchAlertsData]);

  // Generate Real-Time Business Alerts from Live Data
  const allGeneratedAlerts = useMemo(() => {
    const alerts = [];
    const stats = dashboardData?.stats || {};
    const inventory = dashboardData?.inventory || {};
    const metrics = dashboardData?.metrics || {};

    const lowStockCount = Number(inventory.lowStockCount || stats.lowStockCount || 0);
    const pendingKhata = Number(metrics.outstanding || stats.pendingKhata || 0);
    const monthlyExpenses = Number(stats.monthlyExpenses || 0);
    const todaySales = Number(stats.todaySales?.total || 0);

    // 1. INVENTORY STOCKOUT ALERT
    if (lowStockCount > 0) {
      alerts.push({
        id: 'alert-inventory-low',
        category: 'Inventory',
        severity: lowStockCount > 10 ? 'critical' : 'warning',
        title: `${lowStockCount} Products Below Reorder Level`,
        description: 'Fast-selling items risk immediate stockout and checkout delays. Replenish catalog batches soon.',
        whyItMatters: 'Directly impacts daily revenue and customer checkout satisfaction.',
        evidence: `Low Stock Count: ${lowStockCount} SKUs`,
        actionLabel: 'Restock Products',
        actionPath: '/inventory',
        createdAt: new Date().toISOString()
      });
    }

    // 2. CUSTOMER KHATA OVERDUE ALERT
    if (pendingKhata > 5000) {
      alerts.push({
        id: 'alert-khata-overdue',
        category: 'Customer Khata',
        severity: pendingKhata > 25000 ? 'critical' : 'warning',
        title: `₹${pendingKhata.toLocaleString('en-IN')} Uncollected Customer Receivables`,
        description: 'Outstanding customer dues exceed safety liquidity threshold. Follow up with debtors to accelerate cash inflows.',
        whyItMatters: 'Uncollected credit starves cash drawer of liquidity needed for supplier purchasing.',
        evidence: `Uncollected Debt: ₹${pendingKhata.toLocaleString('en-IN')}`,
        actionLabel: 'Follow Up Dues',
        actionPath: '/customers',
        createdAt: new Date().toISOString()
      });
    }

    // 3. OPERATING EXPENSE MARGIN ALERT
    if (monthlyExpenses > 40000 && monthlyExpenses > todaySales * 5) {
      alerts.push({
        id: 'alert-expense-spike',
        category: 'Cost Control',
        severity: 'warning',
        title: `Operating Expense Outflow Spike (₹${monthlyExpenses.toLocaleString('en-IN')})`,
        description: 'Monthly operational expenses have reached elevated levels relative to current sales throughput.',
        whyItMatters: 'Elevated OpEx eats directly into net profit margins.',
        evidence: `Monthly Expenses: ₹${monthlyExpenses.toLocaleString('en-IN')}`,
        actionLabel: 'Review Expenses',
        actionPath: '/expenses',
        createdAt: new Date().toISOString()
      });
    }

    // 4. DATABASE ANOMALIES
    anomalyFlags.forEach(flag => {
      alerts.push({
        id: `anomaly-${flag.id || flag.type}`,
        category: 'Security & Audit',
        severity: flag.severity === 'critical' ? 'critical' : flag.severity === 'warning' ? 'warning' : 'info',
        title: flag.type?.replace(/_/g, ' ') || 'Invoice Billing Anomaly Detected',
        description: flag.message || 'Irregular billing pattern detected by automated rule engine.',
        whyItMatters: 'Prevents staff errors, unauthorized discounts, or duplicate invoice charges.',
        evidence: `Type: ${flag.type} • Flag ID: #${flag.id || 'LIVE'}`,
        actionLabel: 'Inspect Invoice History',
        actionPath: '/invoice-history',
        createdAt: flag.created_at || new Date().toISOString()
      });
    });

    return alerts;
  }, [dashboardData, anomalyFlags]);

  // Filter Active Alerts
  const activeAlerts = useMemo(() => {
    return allGeneratedAlerts.filter(alert => {
      if (dismissedAlerts.includes(alert.id)) return false;
      if (snoozedAlerts.includes(alert.id)) return false;
      if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
      return true;
    });
  }, [allGeneratedAlerts, dismissedAlerts, snoozedAlerts, selectedSeverity]);

  // Actions
  const handleDismiss = async (alertId) => {
    const updated = [...dismissedAlerts, alertId];
    setDismissedAlerts(updated);
    localStorage.setItem('karobar_dismissed_alerts', JSON.stringify(updated));

    if (alertId.startsWith('anomaly-')) {
      const realId = alertId.replace('anomaly-', '');
      await API.patch(`/intelligence/anomalies/${realId}/dismiss`).catch(() => {});
    }
    toast.success("Alert resolved and archived");
  };

  const handleSnooze = (alertId) => {
    const updated = [...snoozedAlerts, alertId];
    setSnoozedAlerts(updated);
    localStorage.setItem('karobar_snoozed_alerts', JSON.stringify(updated));
    toast.success("Alert snoozed for 24 hours");
  };

  const handleRestore = (alertId) => {
    const newDismissed = dismissedAlerts.filter(id => id !== alertId);
    const newSnoozed = snoozedAlerts.filter(id => id !== alertId);
    setDismissedAlerts(newDismissed);
    setSnoozedAlerts(newSnoozed);
    localStorage.setItem('karobar_dismissed_alerts', JSON.stringify(newDismissed));
    localStorage.setItem('karobar_snoozed_alerts', JSON.stringify(newSnoozed));
    toast.success("Alert restored to active feed");
  };

  const handleTriggerAnomalyScan = async () => {
    toast.loading("Scanning business transactions for anomalies...", { id: 'scan-anomalies' });
    try {
      await API.post('/intelligence/anomalies/scan');
      toast.success("Anomaly scan complete", { id: 'scan-anomalies' });
      fetchAlertsData();
    } catch {
      toast.error("Could not run scan", { id: 'scan-anomalies' });
    }
  };

  const handleSaveReminderSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await API.post('/reminders/settings', reminderSettings);
      toast.success("WhatsApp autopilot settings updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const criticalCount = allGeneratedAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = allGeneratedAlerts.filter(a => a.severity === 'warning').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 🟢 Header Console */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-2xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Smart Alerts & Autopilot
            </h1>
            {activeStore?.name && (
              <Badge variant="secondary" className="text-xs font-bold py-0.5 px-2.5 bg-slate-100 text-slate-700 border-slate-200">
                <Store size={12} className="inline mr-1 text-emerald-600" />
                {activeStore.name}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Prioritized business alerts, hazard notifications, and WhatsApp payment collection autopilot.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={fetchAlertsData}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          >
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button 
            onClick={handleTriggerAnomalyScan}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <ShieldAlert size={14} className="mr-1.5" />
            Scan Anomalies
          </Button>
        </div>
      </div>

      {/* 🟢 4-Pillar Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Alerts</span>
            <Bell size={18} className="text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{activeAlerts.length}</p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">Pending business signals</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Critical Priority</span>
            <AlertTriangle size={18} className="text-rose-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600">{criticalCount}</p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">Immediate action required</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Needs Attention</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">{warningCount}</p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">Operational warnings</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Autopilot Status</span>
            <Zap size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">
            {reminderSettings.enabled ? 'Active' : 'Paused'}
          </p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">WhatsApp due reminders</p>
        </div>
      </div>

      {/* 🟢 Modern Segmented Tab Navigation Bar */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100/90 border border-slate-200 rounded-2xl w-full sm:w-fit">
        {[
          { id: 'feed', label: 'Live Alert Feed', icon: Bell, badge: activeAlerts.length || null },
          { id: 'autopilot', label: 'WhatsApp Collection Autopilot', icon: MessageSquare },
          { id: 'history', label: 'Archived & Snoozed', icon: History, badge: (dismissedAlerts.length + snoozedAlerts.length) || null }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-700">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: LIVE ALERT FEED                               */}
      {/* ==================================================== */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Filter Pill Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Severity:</span>
            {[
              { id: 'all', label: 'All Signals' },
              { id: 'critical', label: 'Critical Only' },
              { id: 'warning', label: 'Warnings' },
              { id: 'info', label: 'Informational' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedSeverity(f.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedSeverity === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Alert Cards */}
          {activeAlerts.length > 0 ? (
            <div className="space-y-3">
              {activeAlerts.map(alert => {
                const isCritical = alert.severity === 'critical';
                const isWarning = alert.severity === 'warning';

                return (
                  <div 
                    key={alert.id}
                    className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={isCritical ? 'danger' : isWarning ? 'warning' : 'secondary'}
                          className="text-[10px] font-black uppercase tracking-wider"
                        >
                          {alert.severity}
                        </Badge>
                        <span className="text-xs font-bold text-slate-400">{alert.category}</span>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          onClick={() => handleSnooze(alert.id)}
                          className="text-xs text-slate-400 hover:text-slate-700 font-semibold cursor-pointer"
                        >
                          Snooze (24h)
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="text-xs text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-slate-900">{alert.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{alert.description}</p>
                      {alert.whyItMatters && (
                        <p className="text-xs text-slate-500 font-medium">
                          <strong>Why it matters:</strong> {alert.whyItMatters}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                      <span className="text-xs font-mono font-bold text-slate-500">{alert.evidence}</span>
                      <Button
                        size="sm"
                        onClick={() => navigate(alert.actionPath)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs"
                      >
                        {alert.actionLabel}
                        <ArrowRight size={13} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 bg-white border border-slate-200/80 rounded-2xl text-center space-y-2">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800">Zero Active Alert Signals</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No critical hazards or operational warnings detected for {activeStore?.name || "your store"}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: WHATSAPP COLLECTION AUTOPILOT                 */}
      {/* ==================================================== */}
      {activeTab === 'autopilot' && (
        <Card className="p-6 border border-slate-200/80 shadow-2xs rounded-2xl bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">WhatsApp Overdue Payment Autopilot</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically queue customer payment reminders when unpaid khata exceeds safety targets.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Autopilot Active</span>
              <input
                type="checkbox"
                checked={reminderSettings.enabled}
                onChange={e => setReminderSettings(s => ({ ...s, enabled: e.target.checked }))}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <form onSubmit={handleSaveReminderSettings} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Minimum Overdue Amount (₹)
                </label>
                <input
                  type="number"
                  value={reminderSettings.threshold}
                  onChange={e => setReminderSettings(s => ({ ...s, threshold: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Days Past Due Date
                </label>
                <input
                  type="number"
                  value={reminderSettings.days_past_due}
                  onChange={e => setReminderSettings(s => ({ ...s, days_past_due: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reminder Message Template
              </label>
              <textarea
                rows={4}
                value={reminderSettings.template}
                onChange={e => setReminderSettings(s => ({ ...s, template: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 font-medium">
                Variables: &#123;customer_name&#125;, &#123;amount&#125;, &#123;invoice_no&#125;, &#123;shop_name&#125;
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={savingSettings}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs"
              >
                {savingSettings ? "Saving Settings..." : "Save Autopilot Configuration"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ==================================================== */}
      {/* TAB 3: ARCHIVED & SNOOZED                            */}
      {/* ==================================================== */}
      {activeTab === 'history' && (
        <Card noPadding className="border border-slate-200/80 shadow-2xs rounded-2xl bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Dismissed & Snoozed Alerts Log
            </h3>
            <span className="text-xs text-slate-400 font-semibold">
              {dismissedAlerts.length + snoozedAlerts.length} archived
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {allGeneratedAlerts
              .filter(a => dismissedAlerts.includes(a.id) || snoozedAlerts.includes(a.id))
              .map(alert => (
                <div key={alert.id} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-slate-800">{alert.title}</p>
                    <p className="text-xs text-slate-400 font-medium">
                      {dismissedAlerts.includes(alert.id) ? "Resolved / Dismissed" : "Snoozed"} • {alert.category}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(alert.id)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl"
                  >
                    <RotateCcw size={13} className="mr-1" />
                    Restore
                  </Button>
                </div>
              ))}

            {dismissedAlerts.length === 0 && snoozedAlerts.length === 0 && (
              <div className="p-10 text-center text-xs text-slate-400 font-semibold">
                No archived or snoozed alert signals found.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
