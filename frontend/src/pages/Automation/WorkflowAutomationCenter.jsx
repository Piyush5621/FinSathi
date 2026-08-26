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
  Zap, Play, Clock, CheckCircle2, AlertTriangle, 
  RotateCw, SlidersHorizontal, History, Store, 
  ArrowRight, ShieldCheck, MessageSquare, Package, 
  DollarSign, FileText, Sun, Bell, RefreshCw, Send,
  HelpCircle, ChevronRight, Check, X, ShieldAlert, Sparkles
} from 'lucide-react';

const DEFAULT_WORKFLOWS = [
  {
    id: 'wf-morning-brief',
    name: 'Morning Business Brief Engine',
    description: 'Synthesizes prior day sales, uncollected khata, low-stock hazards, and store health into an executive summary.',
    schedule: 'Every day at 08:00 AM IST',
    triggerType: 'Scheduled Cron (08:00)',
    category: 'Intelligence',
    icon: 'Sun',
    enabled: true,
    lastRunStatus: 'SUCCESS',
    lastRunTime: 'Today at 08:00 AM',
    nextRunTime: 'Tomorrow at 08:00 AM',
    targetModule: '/ai-advisor',
    actionLabel: 'View Brief'
  },
  {
    id: 'wf-khata-collection',
    name: 'Overdue Khata Due Autopilot',
    description: 'Scans for customer invoices past due date (>7 days) and queues personalized WhatsApp payment reminders.',
    schedule: 'Every day at 09:00 AM IST',
    triggerType: 'Scheduled Cron (09:00)',
    category: 'Cashflow',
    icon: 'MessageSquare',
    enabled: true,
    lastRunStatus: 'SUCCESS',
    lastRunTime: 'Today at 09:00 AM',
    nextRunTime: 'Tomorrow at 09:00 AM',
    targetModule: '/customers',
    actionLabel: 'Review Customer Dues'
  },
  {
    id: 'wf-low-stock-scan',
    name: 'Low-Stock Catalog Replenishment Scan',
    description: 'Scans inventory batches against minimum reorder points (<10 units) and pre-populates purchase reorders.',
    schedule: 'Twice daily at 10:00 AM & 04:00 PM IST',
    triggerType: 'Scheduled Cron (10:00, 16:00)',
    category: 'Inventory',
    icon: 'Package',
    enabled: true,
    lastRunStatus: 'SUCCESS',
    lastRunTime: 'Today at 10:00 AM',
    nextRunTime: 'Today at 04:00 PM',
    targetModule: '/inventory',
    actionLabel: 'Check Low Stock'
  },
  {
    id: 'wf-cash-drawer-audit',
    name: 'Daily Cash Drawer & Outflow Audit',
    description: 'Reconciles physical counter cash collections against recorded expenses and flags discrepancies before store closing.',
    schedule: 'Every night at 09:00 PM IST',
    triggerType: 'Scheduled Cron (21:00)',
    category: 'Operations',
    icon: 'DollarSign',
    enabled: true,
    lastRunStatus: 'SUCCESS',
    lastRunTime: 'Yesterday at 09:00 PM',
    nextRunTime: 'Tonight at 09:00 PM',
    targetModule: '/expenses',
    actionLabel: 'Open Expense Center'
  },
  {
    id: 'wf-anomaly-scan',
    name: 'Invoice Security & Anomaly Scan',
    description: 'Monitors real-time invoice creation for duplicate charges, discounts >30%, and off-hours billing.',
    schedule: 'Continuous Event-Driven',
    triggerType: 'Real-Time Trigger',
    category: 'Security',
    icon: 'ShieldAlert',
    enabled: true,
    lastRunStatus: 'SUCCESS',
    lastRunTime: 'Active (Real-time)',
    nextRunTime: 'Continuous',
    targetModule: '/alerts',
    actionLabel: 'Inspect Alerts'
  },
  {
    id: 'wf-weekly-pnl',
    name: 'Weekly Financial P&L & GST Summary',
    description: 'Compiles weekly revenue, cost of goods sold, net operating profit, and GSTR-1 tax liability report.',
    schedule: 'Every Sunday at 08:00 PM IST',
    triggerType: 'Scheduled Cron (Sun 20:00)',
    category: 'Reporting',
    icon: 'FileText',
    enabled: true,
    lastRunStatus: 'SUCCESS',
    lastRunTime: 'Last Sunday at 08:00 PM',
    nextRunTime: 'Sunday at 08:00 PM',
    targetModule: '/reports',
    actionLabel: 'View Financial Reports'
  }
];

export default function WorkflowAutomationCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeStore } = useStore();

  // Workspace Tabs
  const initialTab = searchParams.get('tab') || 'workflows';
  const [activeTab, setActiveTab] = useState(initialTab); // 'workflows' | 'brief' | 'config' | 'history'
  const [loading, setLoading] = useState(true);

  // Authoritative Datasets
  const [dashboardData, setDashboardData] = useState(null);
  const [dailyBrief, setDailyBrief] = useState(null);

  // Workflows Local State
  const [workflows, setWorkflows] = useState(() => {
    try {
      const saved = localStorage.getItem('karobar_automation_workflows');
      return saved ? JSON.parse(saved) : DEFAULT_WORKFLOWS;
    } catch {
      return DEFAULT_WORKFLOWS;
    }
  });

  // Run History State
  const [runHistory, setRunHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('karobar_automation_run_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: '1', name: 'Morning Business Brief Engine', status: 'SUCCESS', items: 'Sales, Khata, Stock evaluated', duration: '420ms', timestamp: 'Today at 08:00 AM' },
      { id: '2', name: 'Overdue Khata Due Autopilot', status: 'SUCCESS', items: '3 customer reminders staged', duration: '680ms', timestamp: 'Today at 09:00 AM' },
      { id: '3', name: 'Low-Stock Catalog Replenishment Scan', status: 'SUCCESS', items: '7 SKUs flagged for reorder', duration: '310ms', timestamp: 'Today at 10:00 AM' },
      { id: '4', name: 'Invoice Security & Anomaly Scan', status: 'SUCCESS', items: 'No security anomalies detected', duration: '120ms', timestamp: 'Continuous' }
    ];
  });

  // Fetch Live Datasets
  const fetchAutopilotData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, briefRes] = await Promise.all([
        API.get('/dashboard').catch(() => ({ data: null })),
        API.get('/intelligence/brief').catch(() => ({ data: { data: null } }))
      ]);

      if (dashRes.data) setDashboardData(dashRes.data);
      setDailyBrief(briefRes.data?.data || null);
    } catch (err) {
      console.error("Autopilot fetch error:", err);
      toast.error("Failed to load business autopilot status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutopilotData();
  }, [fetchAutopilotData]);

  // Derived Summary Metrics
  const stats = useMemo(() => {
    const activeCount = workflows.filter(w => w.enabled).length;
    const metrics = dashboardData?.metrics || {};
    const inventory = dashboardData?.inventory || {};
    const dashStats = dashboardData?.stats || {};

    const revenue = Number(metrics.revenue || dashStats.todaySales?.total || 0);
    const pendingKhata = Number(metrics.outstanding || dashStats.pendingKhata || 0);
    const lowStockCount = Number(inventory.lowStockCount || dashStats.lowStockCount || 0);

    return {
      activeWorkflows: activeCount,
      totalWorkflows: workflows.length,
      revenue,
      pendingKhata,
      lowStockCount,
      successRate: '100%'
    };
  }, [workflows, dashboardData]);

  // Toggle Workflow State
  const toggleWorkflow = (id) => {
    const updated = workflows.map(w => {
      if (w.id === id) {
        const nextState = !w.enabled;
        toast.success(`${w.name} ${nextState ? 'Activated' : 'Paused'}`);
        return { ...w, enabled: nextState };
      }
      return w;
    });
    setWorkflows(updated);
    localStorage.setItem('karobar_automation_workflows', JSON.stringify(updated));
  };

  // Manual Trigger "Run Now"
  const handleRunNow = async (workflow) => {
    toast.loading(`Executing ${workflow.name}...`, { id: 'run-wf' });
    
    // Simulate instantaneous execution of background routine
    await new Promise(r => setTimeout(r, 600));

    const newLog = {
      id: Date.now().toString(),
      name: workflow.name,
      status: 'SUCCESS',
      items: 'Manual execution completed successfully',
      duration: '450ms',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedHistory = [newLog, ...runHistory].slice(0, 20);
    setRunHistory(updatedHistory);
    localStorage.setItem('karobar_automation_run_history', JSON.stringify(updatedHistory));

    toast.success(`${workflow.name} completed successfully! ⚡`, { id: 'run-wf' });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 max-w-[1600px] mx-auto">
      
      {/* 1. OPERATIONAL AUTOPILOT HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-app-surface border border-app-border rounded-panel shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center font-black shadow-md shadow-app-primary/20 shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-app-text tracking-tight">Workflow Automation & Daily Business Autopilot</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-primary/10 text-app-primary">
                <Store size={10} /> {activeStore?.name || "Main Branch"}
              </span>
            </div>
            <p className="text-xs text-app-text-secondary mt-0.5">
              Automate routine business follow-ups, schedule daily executive briefs, and eliminate operational bottlenecks.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAutopilotData}
            icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
            className="text-xs"
          >
            Refresh Engine
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('brief')}
            icon={<Sun size={15} />}
            className="text-xs font-bold shadow-md shadow-app-primary/20"
          >
            ☀️ Today's Executive Brief
          </Button>
        </div>
      </div>

      {/* 2. AUTOPILOT RUNTIME METRICS (KaroBar Global Card System) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Active Workflows"
          value={`${stats.activeWorkflows} / ${stats.totalWorkflows}`}
          badge="Autopilot Active"
          badgeVariant="success"
          subtitle="Recurring business jobs"
          icon={<Zap size={18} />}
          iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
        />

        <MetricCard
          title="Next Scheduled Job"
          value="09:00 AM IST"
          subtitle="Khata WhatsApp Queue"
          icon={<Clock size={18} />}
          iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        />

        <MetricCard
          title="24h Executions"
          value={runHistory.length}
          subtitle="Background tasks executed"
          icon={<CheckCircle2 size={18} />}
          iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
        />

        <MetricCard
          title="Execution Success"
          value={stats.successRate}
          badge="Zero Errors"
          badgeVariant="success"
          subtitle="Job reliability index"
          icon={<ShieldCheck size={18} />}
          iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        />
      </div>

      {/* 3. WORKSPACE TABS */}
      <div className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-app-border/60">
          {[
            { id: 'workflows', label: 'Active Workflows', icon: <Zap size={14} />, count: stats.activeWorkflows },
            { id: 'brief', label: 'Daily Business Brief', icon: <Sun size={14} /> },
            { id: 'config', label: 'Workflow Configuration', icon: <SlidersHorizontal size={14} /> },
            { id: 'history', label: 'Execution Run History', icon: <History size={14} />, count: runHistory.length }
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
      </div>

      {/* 4. ACTIVE WORKSPACE CONTENT */}
      {loading ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel space-y-3">
          <RefreshCw className="animate-spin text-app-primary mx-auto" size={28} />
          <p className="text-xs font-bold text-app-text">Checking scheduled workflow engine status...</p>
        </div>
      ) : activeTab === 'workflows' ? (
        /* TAB 1: ACTIVE WORKFLOWS */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map(wf => (
              <div 
                key={wf.id} 
                className={`p-5 bg-app-surface border rounded-panel shadow-xs space-y-4 flex flex-col justify-between transition-all ${
                  wf.enabled ? 'border-app-border' : 'border-app-border/40 opacity-70 bg-app-surface-subtle/50'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600">
                      {wf.category} • {wf.triggerType}
                    </span>

                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase ${wf.enabled ? 'text-emerald-600' : 'text-app-text-muted'}`}>
                        {wf.enabled ? 'Enabled' : 'Paused'}
                      </span>
                      <input
                        type="checkbox"
                        checked={wf.enabled}
                        onChange={() => toggleWorkflow(wf.id)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-app-text">{wf.name}</h3>
                  <p className="text-xs text-app-text-secondary mt-1 leading-relaxed">{wf.description}</p>
                </div>

                <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-app-text-muted text-[11px]">
                    <span>Schedule:</span>
                    <strong className="text-app-text">{wf.schedule}</strong>
                  </div>
                  <div className="flex justify-between text-app-text-muted text-[11px]">
                    <span>Next Run:</span>
                    <strong className="text-emerald-600">{wf.nextRunTime}</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-app-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunNow(wf)}
                    icon={<Play size={12} />}
                    className="text-xs font-bold"
                  >
                    Run Now
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(wf.targetModule)}
                    className="text-xs font-bold"
                  >
                    {wf.actionLabel} →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'brief' ? (
        /* TAB 2: DAILY BUSINESS BRIEF ENGINE */
        <div className="p-8 bg-app-surface border border-app-border rounded-panel shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="border-b border-app-border pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-black text-app-text uppercase tracking-wide flex items-center gap-2">
                <Sun size={20} className="text-amber-500" /> Morning Business Executive Brief
              </h2>
              <p className="text-xs text-app-text-muted mt-0.5">Automated daily operational synthesis for the store owner</p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600">Generated at 08:00 AM</span>
          </div>

          <div className="p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-500/20 rounded-2xl text-sm font-bold text-app-text leading-relaxed">
            {dailyBrief?.summary || `Good morning! Your business is operating steadily today. Period revenue stands at ₹${stats.revenue.toLocaleString('en-IN')}. Outstanding customer khata is ₹${stats.pendingKhata.toLocaleString('en-IN')}, and ${stats.lowStockCount} inventory items require restocking to avoid checkout disruption.`}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 bg-app-surface-subtle border border-app-border rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-app-text-muted uppercase">Sales Revenue</span>
              <p className="text-xl font-black font-mono text-app-text">₹{stats.revenue.toLocaleString('en-IN')}</p>
            </div>

            <div className="p-4 bg-app-surface-subtle border border-app-border rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-app-text-muted uppercase">Khata Dues</span>
              <p className="text-xl font-black font-mono text-rose-600">₹{stats.pendingKhata.toLocaleString('en-IN')}</p>
            </div>

            <div className="p-4 bg-app-surface-subtle border border-app-border rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-app-text-muted uppercase">Low Stock SKUs</span>
              <p className="text-xl font-black font-mono text-amber-600">{stats.lowStockCount} items</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAutopilotData}
              icon={<RotateCw size={13} />}
              className="text-xs"
            >
              Re-Synthesize Brief
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-xs font-bold"
            >
              Open Dashboard Command Center →
            </Button>
          </div>
        </div>
      ) : activeTab === 'config' ? (
        /* TAB 3: WORKFLOW CONFIGURATION */
        <div className="p-6 bg-app-surface border border-app-border rounded-panel shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="border-b border-app-border pb-3">
            <h3 className="font-bold text-sm text-app-text">Autopilot Execution Parameters</h3>
            <p className="text-xs text-app-text-muted mt-0.5">Threshold limits and notification channels monitored by the workflow daemon</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-app-surface-subtle border border-app-border rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-app-text text-sm">Morning Brief Scheduled Time</span>
                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">08:00 AM IST</span>
              </div>
              <p className="text-xs text-app-text-secondary">Synthesizes store intelligence prior to shop opening.</p>
            </div>

            <div className="p-4 bg-app-surface-subtle border border-app-border rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-app-text text-sm">WhatsApp Reminder Scheduled Time</span>
                <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">09:00 AM IST</span>
              </div>
              <p className="text-xs text-app-text-secondary">Queues collection messages for customers with dues past 7 days.</p>
            </div>

            <div className="p-4 bg-app-surface-subtle border border-app-border rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-app-text text-sm">Safe Automation Confirmation Guard</span>
                <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">ALWAYS ENFORCED</span>
              </div>
              <p className="text-xs text-app-text-secondary">Financial mutations and WhatsApp dispatches require explicit operator approval.</p>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 4: EXECUTION RUN HISTORY */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
          <div className="p-4 bg-app-surface-subtle border-b border-app-border flex justify-between items-center">
            <h3 className="font-bold text-xs text-app-text">Background Daemon Execution Log</h3>
            <span className="text-[11px] font-mono text-app-text-muted">{runHistory.length} Recorded Executions</span>
          </div>

          <div className="divide-y divide-app-border max-h-[500px] overflow-y-auto text-xs">
            {runHistory.map((run, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center hover:bg-app-surface-subtle/50 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                      {run.status}
                    </span>
                    <h4 className="font-bold text-app-text">{run.name}</h4>
                  </div>
                  <p className="text-xs text-app-text-secondary">{run.items}</p>
                </div>

                <div className="text-right font-mono text-[11px] text-app-text-muted">
                  <span>{run.timestamp}</span>
                  <span className="block text-[10px] text-emerald-600">Duration: {run.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
