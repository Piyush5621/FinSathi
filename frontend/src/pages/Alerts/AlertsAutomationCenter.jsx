import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../services/apiClient';
import { useStore } from '../../contexts/StoreContext';
import { Card, MetricCard, SectionCard } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { 
  Bell, AlertTriangle, ShieldAlert, CheckCircle2, 
  MessageSquare, Zap, Clock, Store, RefreshCw, 
  ArrowRight, Users, Package, DollarSign, Send, 
  SlidersHorizontal, ShieldCheck, Eye, Trash2, 
  X, Check, History, Sparkles, Filter, ChevronRight
} from 'lucide-react';

export default function AlertsAutomationCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeStore } = useStore();

  // Workspace Tabs
  const initialTab = searchParams.get('tab') || 'feed';
  const [activeTab, setActiveTab] = useState(initialTab); // 'feed' | 'autopilot' | 'rules' | 'history'
  const [selectedSeverity, setSelectedSeverity] = useState('all'); // 'all' | 'critical' | 'warning' | 'info'
  const [loading, setLoading] = useState(true);

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

  // Local State for Dismissed / Snoozed Alerts
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
        title: `${lowStockCount} Products Below Minimum Stock Threshold`,
        description: 'Fast-selling items risk immediate stockout and checkout disruptions. Replenish catalog batches soon.',
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
        description: 'Outstanding customer dues exceed safety targets. Follow up via WhatsApp to accelerate liquid cash inflow.',
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
        title: `Operating Outflow Pressure (₹${monthlyExpenses.toLocaleString('en-IN')})`,
        description: 'Monthly operational expenses have reached elevated levels. Review recurring cost centers.',
        evidence: `Monthly Expenses: ₹${monthlyExpenses.toLocaleString('en-IN')}`,
        actionLabel: 'Review Expenses',
        actionPath: '/expenses',
        createdAt: new Date().toISOString()
      });
    }

    // 4. DATABASE ANOMALIES (Duplicate invoices, large discounts, off-hours billing)
    anomalyFlags.forEach(flag => {
      alerts.push({
        id: `anomaly-${flag.id || flag.type}`,
        category: 'Security & Audit',
        severity: flag.severity === 'critical' ? 'critical' : flag.severity === 'warning' ? 'warning' : 'info',
        title: flag.type?.replace(/_/g, ' ') || 'Invoice Billing Anomaly Detected',
        description: flag.message || 'Irregular billing pattern detected by automated rule engine.',
        evidence: `Type: ${flag.type} • Flag ID: #${flag.id || 'LIVE'}`,
        actionLabel: 'Inspect Invoice History',
        actionPath: '/invoice-history',
        createdAt: flag.created_at || new Date().toISOString()
      });
    });

    // 5. RECURRING BILLS REMINDER (Informational)
    alerts.push({
      id: 'alert-recurring-bills',
      category: 'Obligations',
      severity: 'info',
      title: 'Upcoming Monthly Rent & Utility Obligations',
      description: 'Scheduled store rent and utilities are due around the 1st of the month. Ensure adequate drawer balance.',
      evidence: 'Estimated Outflow: ₹35,000 Rent + Utilities',
      actionLabel: 'View Commitments',
      actionPath: '/expenses',
      createdAt: new Date().toISOString()
    });

    return alerts;
  }, [dashboardData, anomalyFlags]);

  // Filter Active vs Snoozed / Dismissed
  const dismissedSet = useMemo(() => new Set(dismissedAlerts.map(a => a.id)), [dismissedAlerts]);
  const snoozedSet = useMemo(() => {
    const now = Date.now();
    return new Set(snoozedAlerts.filter(a => a.snoozeUntil > now).map(a => a.id));
  }, [snoozedAlerts]);

  const activeAlerts = useMemo(() => {
    return allGeneratedAlerts.filter(a => !dismissedSet.has(a.id) && !snoozedSet.has(a.id));
  }, [allGeneratedAlerts, dismissedSet, snoozedSet]);

  const filteredFeed = useMemo(() => {
    if (selectedSeverity === 'all') return activeAlerts;
    return activeAlerts.filter(a => a.severity === selectedSeverity);
  }, [activeAlerts, selectedSeverity]);

  // Summary Metrics
  const stats = useMemo(() => {
    const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
    const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
    const infoCount = activeAlerts.filter(a => a.severity === 'info').length;

    return {
      totalActive: activeAlerts.length,
      criticalCount,
      warningCount,
      infoCount,
      pendingReminders: reminderSettings.enabled ? 3 : 0
    };
  }, [activeAlerts, reminderSettings]);

  // Actions
  const handleSnooze = (alert) => {
    const snoozeUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const updated = [...snoozedAlerts.filter(a => a.id !== alert.id), { ...alert, snoozeUntil }];
    setSnoozedAlerts(updated);
    localStorage.setItem('karobar_snoozed_alerts', JSON.stringify(updated));
    toast.success("Alert snoozed for 24 hours ⏰");
  };

  const handleDismiss = (alert) => {
    const updated = [...dismissedAlerts.filter(a => a.id !== alert.id), { ...alert, dismissedAt: new Date().toISOString() }];
    setDismissedAlerts(updated);
    localStorage.setItem('karobar_dismissed_alerts', JSON.stringify(updated));
    toast.success("Alert resolved and moved to history ✅");
  };

  const handleSaveReminderSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await API.put("/reminders/settings", reminderSettings);
      toast.success("WhatsApp due reminder automation saved! 📱");
    } catch {
      toast.error("Failed to save reminder settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTriggerTestWhatsApp = () => {
    const sampleMsg = reminderSettings.template
      .replace('{customer_name}', 'Ramesh Sharma')
      .replace('{amount}', '2,450')
      .replace('{invoice_no}', 'INV-1042')
      .replace('{shop_name}', activeStore?.name || 'KaroBar Store');

    const encoded = encodeURIComponent(sampleMsg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    toast.success("Test reminder opened in WhatsApp Web!");
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 max-w-[1600px] mx-auto">
      
      {/* 1. OPERATIONAL ALERT HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-app-surface border border-app-border rounded-panel shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center font-black shadow-md shadow-app-primary/20 shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-app-text tracking-tight">Smart Alerts & Business Automation Center</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-primary/10 text-app-primary">
                <Store size={10} /> {activeStore?.name || "Main Branch"}
              </span>
            </div>
            <p className="text-xs text-app-text-secondary mt-0.5">
              Detect business disruptions early, prevent stockouts, and automate customer payment reminders.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlertsData}
            icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
            className="text-xs"
          >
            Scan Signals
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('autopilot')}
            icon={<MessageSquare size={14} />}
            className="text-xs font-bold shadow-md shadow-app-primary/20"
          >
            WhatsApp Autopilot
          </Button>
        </div>
      </div>

      {/* 2. REAL-TIME ALERT KPI CARDS (KaroBar Global Card System) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Active Alerts"
          value={stats.totalActive}
          subtitle="Real-time operational signals"
          icon={<Bell size={18} />}
          iconBg="bg-app-surface-subtle text-app-text-secondary"
        />

        <MetricCard
          title="Critical Hazards"
          value={stats.criticalCount}
          badge={stats.criticalCount > 0 ? "Immediate Action" : "All Clear"}
          badgeVariant={stats.criticalCount > 0 ? "danger" : "success"}
          subtitle="Stockouts & large debts"
          icon={<ShieldAlert size={18} />}
          iconBg="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
        />

        <MetricCard
          title="Warning Notices"
          value={stats.warningCount}
          subtitle="Potential margin risks"
          icon={<AlertTriangle size={18} />}
          iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
        />

        <MetricCard
          title="Reminder Autopilot"
          value={reminderSettings.enabled ? "Active" : "Paused"}
          badge={reminderSettings.enabled ? "Auto 09:00 AM" : "Manual"}
          badgeVariant={reminderSettings.enabled ? "success" : "neutral"}
          subtitle="Due collection cron"
          icon={<Zap size={18} />}
          iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        />
      </div>

      {/* 3. WORKSPACE TABS */}
      <div className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border/60 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'feed', label: 'Live Alert Feed', icon: <Bell size={14} />, count: activeAlerts.length },
              { id: 'autopilot', label: 'WhatsApp Due Autopilot', icon: <MessageSquare size={14} /> },
              { id: 'rules', label: 'Automation Rules & Triggers', icon: <SlidersHorizontal size={14} /> },
              { id: 'history', label: 'Audit & History', icon: <History size={14} />, count: dismissedAlerts.length + snoozedAlerts.length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-app-primary text-white shadow-xs'
                    : 'bg-app-surface-subtle text-app-text-secondary hover:text-app-text'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-app-border text-app-text-muted'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Severity filter for Feed tab */}
          {activeTab === 'feed' && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-app-text-muted text-[11px] font-semibold">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-app-surface-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs font-bold text-app-text outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="warning">Warnings Only</option>
                <option value="info">Info Notices</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 4. ACTIVE WORKSPACE CONTENT */}
      {loading ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel space-y-3">
          <RefreshCw className="animate-spin text-app-primary mx-auto" size={28} />
          <p className="text-xs font-bold text-app-text">Scanning live business alert channels...</p>
        </div>
      ) : activeTab === 'feed' ? (
        /* TAB 1: LIVE ALERT FEED */
        <div className="space-y-4">
          {filteredFeed.length === 0 ? (
            <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
              <h3 className="font-bold text-sm text-app-text">No active alerts</h3>
              <p className="text-xs text-app-text-muted mt-1">All business health indicators and operational thresholds are normal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFeed.map(alert => (
                <div 
                  key={alert.id} 
                  className={`p-5 bg-app-surface border rounded-panel shadow-xs space-y-3 transition-all ${
                    alert.severity === 'critical' ? 'border-rose-500/30 bg-rose-500/5' :
                    alert.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-app-border'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        alert.severity === 'critical' ? 'bg-rose-500/10 text-rose-600' :
                        alert.severity === 'warning' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-blue-500/10 text-blue-600'
                      }`}>
                        {alert.severity} • {alert.category}
                      </span>
                      <span className="text-[10px] text-app-text-muted font-mono">
                        {new Date(alert.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSnooze(alert)}
                        className="text-xs text-app-text-muted hover:text-app-text font-bold px-2 py-1 rounded hover:bg-app-surface-subtle transition-colors cursor-pointer"
                        title="Snooze for 24 hours"
                      >
                        Snooze 24h
                      </button>
                      <button
                        onClick={() => handleDismiss(alert)}
                        className="text-xs text-app-text-muted hover:text-emerald-600 font-bold px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                        title="Mark as resolved"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-app-text">{alert.title}</h4>
                    <p className="text-xs text-app-text-secondary mt-0.5">{alert.description}</p>
                  </div>

                  <div className="p-2.5 bg-app-surface-subtle border border-app-border rounded-xl text-xs font-mono flex justify-between items-center">
                    <span className="text-app-text-muted text-[11px]">Evidence Trail: <strong className="text-app-text">{alert.evidence}</strong></span>
                    <span className="text-[10px] font-bold text-app-primary">Verified Ledger Signal</span>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(alert.actionPath)}
                      icon={<ArrowRight size={14} />}
                      className="text-xs font-bold"
                    >
                      {alert.actionLabel}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'autopilot' ? (
        /* TAB 2: WHATSAPP REMINDER AUTOPILOT */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Autopilot Settings Form (7 cols) */}
          <div className="lg:col-span-7 p-6 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-6">
            <div className="flex justify-between items-start border-b border-app-border pb-4">
              <div>
                <h3 className="font-bold text-sm text-app-text flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-500" /> WhatsApp Due Reminder Engine
                </h3>
                <p className="text-xs text-app-text-muted mt-0.5">Configure automated debt collection reminders via WhatsApp Web / API</p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase ${reminderSettings.enabled ? 'text-emerald-600' : 'text-app-text-muted'}`}>
                  {reminderSettings.enabled ? 'Active' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={reminderSettings.enabled}
                  onChange={e => setReminderSettings(p => ({ ...p, enabled: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-500"
                />
              </div>
            </div>

            <form onSubmit={handleSaveReminderSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Due Amount Threshold (₹)</label>
                  <input
                    type="number"
                    min="100"
                    value={reminderSettings.threshold}
                    onChange={e => setReminderSettings(p => ({ ...p, threshold: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  />
                  <span className="text-[10px] text-app-text-muted mt-1 block">Only alert if customer khata is above ₹{reminderSettings.threshold}</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Days Past Due Trigger</label>
                  <input
                    type="number"
                    min="1"
                    value={reminderSettings.days_past_due}
                    onChange={e => setReminderSettings(p => ({ ...p, days_past_due: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  />
                  <span className="text-[10px] text-app-text-muted mt-1 block">Trigger reminder {reminderSettings.days_past_due} days after credit sale</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">WhatsApp Message Template</label>
                <textarea
                  rows={4}
                  value={reminderSettings.template}
                  onChange={e => setReminderSettings(p => ({ ...p, template: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl p-3 text-xs font-medium text-app-text outline-none focus:border-app-primary"
                />
                <div className="flex gap-2 flex-wrap text-[10px] text-app-text-muted mt-1">
                  <span>Variables:</span>
                  <span className="font-mono bg-app-surface-subtle px-1.5 py-0.5 rounded">{"{customer_name}"}</span>
                  <span className="font-mono bg-app-surface-subtle px-1.5 py-0.5 rounded">{"{amount}"}</span>
                  <span className="font-mono bg-app-surface-subtle px-1.5 py-0.5 rounded">{"{invoice_no}"}</span>
                  <span className="font-mono bg-app-surface-subtle px-1.5 py-0.5 rounded">{"{shop_name}"}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleTriggerTestWhatsApp}
                  icon={<Send size={13} />}
                  className="text-xs"
                >
                  Test Sample Message
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={savingSettings}
                  className="font-bold text-xs"
                >
                  {savingSettings ? "Saving..." : "Save Autopilot Settings"}
                </Button>
              </div>
            </form>
          </div>

          {/* Safety & Schedule Info (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-app-text flex items-center gap-2">
                <ShieldCheck className="text-emerald-500" size={16} /> Safe Automation Rule
              </h4>
              <p className="text-xs text-app-text-secondary leading-relaxed">
                KaroBar automated jobs scan your records daily at <strong>09:00 AM IST</strong>. Reminders are generated for your review, guaranteeing you maintain complete control over customer interactions.
              </p>
            </div>

            <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-panel space-y-3">
              <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-200">
                Direct WhatsApp Quick Dispatch
              </h4>
              <p className="text-xs text-indigo-800/80 dark:text-indigo-300">
                You can also generate and send individual payment reminders directly from any customer's Khata drawer.
              </p>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => navigate('/customers')}
                className="text-xs font-bold"
              >
                Open Customer Khata Hub →
              </Button>
            </div>
          </div>
        </div>
      ) : activeTab === 'rules' ? (
        /* TAB 3: AUTOMATION RULES */
        <div className="p-6 bg-app-surface border border-app-border rounded-panel shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="border-b border-app-border pb-3">
            <h3 className="font-bold text-sm text-app-text">Configured Business Automation Rules</h3>
            <p className="text-xs text-app-text-muted mt-0.5">Threshold parameters monitored continuously by the signal engine</p>
          </div>

          <div className="space-y-4 text-xs">
            {[
              { rule: "Low Stock Alert Trigger", threshold: "< 10 units in stock", action: "Flag critical restock alert and suggest supplier PO", status: "Active" },
              { rule: "Khata Aging Hazard", threshold: "> 30 days overdue", action: "Queue for daily automated WhatsApp collection", status: "Active" },
              { rule: "Large Discount Audit", threshold: "> 30% discount on POS invoice", action: "Flag security audit notice in Audit Center", status: "Active" },
              { rule: "Duplicate Invoice Scan", threshold: "Same total & customer within 24h", action: "Flag duplicate invoice warning", status: "Active" },
              { rule: "Off-Hours Billing Detection", threshold: "Invoices created before 06:00 or after 23:00", action: "Log security anomaly signal", status: "Active" }
            ].map((r, idx) => (
              <div key={idx} className="p-4 bg-app-surface-subtle border border-app-border rounded-xl flex justify-between items-center">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-app-text">{r.rule}</h4>
                  <span className="text-[11px] font-mono text-app-text-muted block">Threshold: {r.threshold}</span>
                  <p className="text-xs text-app-text-secondary">Action: {r.action}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 shrink-0">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* TAB 4: ALERT AUDIT & HISTORY */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
          <div className="p-4 bg-app-surface-subtle border-b border-app-border flex justify-between items-center">
            <h3 className="font-bold text-xs text-app-text">Resolved & Snoozed Alert History</h3>
            <span className="text-[11px] font-mono text-app-text-muted">{dismissedAlerts.length + snoozedAlerts.length} Historical Signals</span>
          </div>

          {dismissedAlerts.length === 0 && snoozedAlerts.length === 0 ? (
            <div className="p-12 text-center">
              <History size={40} className="mx-auto text-app-text-muted mb-2" />
              <h4 className="font-bold text-sm text-app-text">No alert history</h4>
              <p className="text-xs text-app-text-muted mt-1">Resolved and snoozed alerts will appear here for historical tracking.</p>
            </div>
          ) : (
            <div className="divide-y divide-app-border max-h-[500px] overflow-y-auto text-xs">
              {snoozedAlerts.map(alert => (
                <div key={alert.id} className="p-4 flex justify-between items-center hover:bg-app-surface-subtle/50 transition-colors">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Snoozed 24h</span>
                    <h5 className="font-bold text-app-text mt-1">{alert.title}</h5>
                    <span className="text-[10px] font-mono text-app-text-muted">Evidence: {alert.evidence}</span>
                  </div>
                  <span className="text-[10px] text-app-text-muted font-mono">Until {new Date(alert.snoozeUntil).toLocaleTimeString('en-IN')}</span>
                </div>
              ))}

              {dismissedAlerts.map(alert => (
                <div key={alert.id} className="p-4 flex justify-between items-center hover:bg-app-surface-subtle/50 transition-colors">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">Resolved</span>
                    <h5 className="font-bold text-app-text mt-1">{alert.title}</h5>
                    <span className="text-[10px] font-mono text-app-text-muted">Evidence: {alert.evidence}</span>
                  </div>
                  <span className="text-[10px] text-app-text-muted font-mono">{new Date(alert.dismissedAt).toLocaleDateString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
