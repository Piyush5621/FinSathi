import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import { 
  Target, Plus, MessageCircle, Phone, Mail, 
  ChevronRight, Calendar, User, DollarSign,
  AlertCircle, Briefcase, Activity, CheckCircle2, X
} from 'lucide-react';
import API from '../services/apiClient';
import toast from 'react-hot-toast';

const pipelineStages = [
  'New Lead',
  'Contacted',
  'Interested',
  'Quotation Sent',
  'Negotiation',
  'Won',
  'Lost'
];

export default function CrmPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [crmStats, setCrmStats] = useState(null);
  
  // Details/Modals
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadDetail, setLeadDetail] = useState(null); // activities & notes
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  
  // Forms
  const [newLead, setNewLead] = useState({
    name: '', business_name: '', phone: '', email: '', expected_revenue: '', source: '', assigned_to: ''
  });
  const [activityForm, setActivityForm] = useState({ type: 'Call', notes: '', date: '' });
  const [noteForm, setNoteForm] = useState({ content: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [leadsRes, statsRes, staffRes] = await Promise.all([
        API.get('/crm/leads'),
        API.get('/crm/analytics'),
        API.get('/staff') // load employees for assignment
      ]);
      setLeads(leadsRes.data?.data || []);
      setCrmStats(statsRes.data?.data || null);
      setStaffList(staffRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load CRM data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!newLead.name) return toast.error('Lead contact name is required');

    try {
      const res = await API.post('/crm/leads', {
        ...newLead,
        expected_revenue: Number(newLead.expected_revenue || 0)
      });
      if (res.data?.success) {
        toast.success('Sales lead created successfully!');
        setShowAddLeadModal(false);
        setNewLead({ name: '', business_name: '', phone: '', email: '', expected_revenue: '', source: '', assigned_to: '' });
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to add lead');
    }
  };

  const handleMoveStage = async (leadId, nextStatus) => {
    try {
      const res = await API.put(`/crm/leads/${leadId}`, { status: nextStatus });
      if (res.data?.success) {
        toast.success(`Lead moved to '${nextStatus}'`);
        fetchInitialData();
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(prev => ({ ...prev, status: nextStatus }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to update pipeline stage');
    }
  };

  const handleSelectLead = async (lead) => {
    setSelectedLead(lead);
    try {
      const res = await API.get(`/crm/leads/${lead.id}/activities`);
      setLeadDetail(res.data?.data || { activities: [], notes: [] });
    } catch (err) {
      toast.error('Failed to load lead activity log');
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!activityForm.notes) return toast.error('Activity description required');

    try {
      const res = await API.post(`/crm/leads/${selectedLead.id}/activities`, activityForm);
      if (res.data?.success) {
        toast.success('Activity logged successfully');
        setActivityForm({ type: 'Call', notes: '', date: '' });
        handleSelectLead(selectedLead); // Refresh details
      }
    } catch (err) {
      toast.error('Failed to log activity');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!noteForm.content) return toast.error('Note content is required');

    try {
      const res = await API.post(`/crm/leads/${selectedLead.id}/notes`, noteForm);
      if (res.data?.success) {
        toast.success('Note added to lead timeline');
        setNoteForm({ content: '' });
        handleSelectLead(selectedLead); // Refresh details
      }
    } catch (err) {
      toast.error('Failed to add note');
    }
  };

  const getStageLeads = (stage) => {
    return leads.filter(l => l.status === stage);
  };

  // Simple rule-based logic to flag leads requiring attention
  const getSuggestedFollowups = () => {
    return leads
      .filter(l => !['Won', 'Lost'].includes(l.status))
      .slice(0, 3); // For display inside CRM panel
  };

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Target size={26} className="text-indigo-600" />
            CRM & Pipeline Hub
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Track business inquiries, estimate deal valuations, log follow-ups, and calculate sales conversion ratios.
          </p>
        </div>
        <Button
          onClick={() => setShowAddLeadModal(true)}
          className="flex items-center gap-2 font-bold bg-indigo-600 border-none hover:bg-indigo-700 text-white shadow-md text-xs py-2 px-4"
        >
          <Plus size={16} /> Create Lead
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} height="100px" rounded="rounded-2xl" />)}
          </div>
          <Skeleton height="400px" rounded="rounded-[24px]" />
        </div>
      ) : (
        <>
          {/* Funnel Metrics Dashboard */}
          {crmStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border-slate-100 bg-white shadow-sm flex flex-col gap-2 rounded-[20px]">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Conversion Ratio</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-600">{crmStats.conversionRate}%</span>
                  <span className="text-xs font-semibold text-slate-400">Wins vs Total Leads</span>
                </div>
              </Card>
              <Card className="p-5 border-slate-100 bg-white shadow-sm flex flex-col gap-2 rounded-[20px]">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Expected Deal pipeline</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-600">₹{crmStats.expectedRevenue?.toLocaleString()}</span>
                  <span className="text-xs font-semibold text-slate-400">Weighted valuation</span>
                </div>
              </Card>
              <Card className="p-5 border-slate-100 bg-white shadow-sm flex flex-col gap-2 rounded-[20px]">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Active Deals</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-800">{crmStats.activeLeads}</span>
                  <span className="text-xs font-semibold text-slate-400">Under negotiations</span>
                </div>
              </Card>
              <Card className="p-5 border-slate-100 bg-white shadow-sm flex flex-col gap-2 rounded-[20px]">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Closed Deals</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-800">{crmStats.wonLeads} won</span>
                  <span className="text-xs font-semibold text-rose-500">/ {crmStats.lostLeads} lost</span>
                </div>
              </Card>
            </div>
          )}

          {/* AI Suggestion Box */}
          {getSuggestedFollowups().length > 0 && (
            <Card className="p-5 border-indigo-100 bg-indigo-50/20 rounded-[24px]">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">AI Coach: Recommended CRM Tasks</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    {getSuggestedFollowups().map(lead => (
                      <div key={lead.id} className="p-3 bg-white border border-indigo-50 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-slate-900">{lead.name}</span>
                          <Badge variant="blue" className="text-[8px] tracking-wide py-0.5">{lead.status}</Badge>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Inquiry regarding {lead.business_name || 'Individual Deal'}. Value: ₹{lead.expected_revenue?.toLocaleString()}.
                        </p>
                        <button
                          onClick={() => handleSelectLead(lead)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                        >
                          Open Timeline <ChevronRight size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Kanban Board Layout */}
          <div className="overflow-x-auto pb-4 no-scrollbar">
            <div className="flex gap-4 min-w-[1200px]">
              {pipelineStages.map((stage) => {
                const stageLeads = getStageLeads(stage);
                return (
                  <div key={stage} className="flex-1 max-w-[200px] bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">{stage}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 rounded-full px-1.5 py-0.5">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto no-scrollbar">
                      {stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => handleSelectLead(lead)}
                          className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm hover:border-indigo-500 cursor-pointer space-y-2 transition-all duration-150"
                        >
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{lead.name}</h4>
                          {lead.business_name && (
                            <p className="text-[10px] font-medium text-slate-400 line-clamp-1">{lead.business_name}</p>
                          )}
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-50">
                            <span className="text-[10px] font-bold text-indigo-600">₹{lead.expected_revenue?.toLocaleString()}</span>
                            <span className="text-[8px] font-semibold text-slate-400">{lead.source || 'Direct'}</span>
                          </div>
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="text-center py-8 text-[10px] text-slate-400 italic">No deals</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Lead details timeline modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-3xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                  CRM Detail
                </span>
                <h3 className="text-xl font-black text-slate-950 mt-2 tracking-tight">{selectedLead.name}</h3>
                {selectedLead.business_name && (
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">{selectedLead.business_name}</p>
                )}
              </div>
              <button onClick={() => { setSelectedLead(null); setLeadDetail(null); }} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <a
                href={selectedLead.phone ? `tel:${selectedLead.phone}` : '#'}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <Phone size={12} /> Call
              </a>
              <a
                href={selectedLead.phone ? `https://wa.me/${selectedLead.phone.replace(/\D/g, '')}` : '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <MessageCircle size={12} className="text-emerald-500" /> WhatsApp
              </a>
              <a
                href={selectedLead.email ? `mailto:${selectedLead.email}` : '#'}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <Mail size={12} /> Email
              </a>
              <div className="relative">
                <select
                  value={selectedLead.status}
                  onChange={(e) => handleMoveStage(selectedLead.id, e.target.value)}
                  className="w-full text-center py-2 px-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold focus:outline-none cursor-pointer"
                >
                  {pipelineStages.map(st => <option key={st} value={st} className="text-slate-900 bg-white">{st}</option>)}
                </select>
              </div>
            </div>

            {/* Details Grid: Left: Timeline Log, Right: Add Activity & Note forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Timeline Log */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Timeline Log</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar border border-slate-50 p-2 rounded-xl">
                  {/* Lead created log */}
                  <div className="flex gap-2">
                    <Circle size={8} className="text-indigo-500 fill-indigo-500 shrink-0 mt-1" />
                    <div className="text-[11px]">
                      <span className="font-bold text-slate-800">Lead Created</span>
                      <span className="text-slate-400 block text-[9px]">{new Date(selectedLead.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {leadDetail?.activities?.map((act) => (
                    <div key={act.id} className="flex gap-2">
                      <Circle size={8} className="text-emerald-500 fill-emerald-500 shrink-0 mt-1" />
                      <div className="text-[11px]">
                        <span className="font-bold text-slate-800">{act.type} logged</span>: {act.notes}
                        <span className="text-slate-400 block text-[9px]">{new Date(act.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}

                  {leadDetail?.notes?.map((n) => (
                    <div key={n.id} className="flex gap-2">
                      <Circle size={8} className="text-amber-500 fill-amber-500 shrink-0 mt-1" />
                      <div className="text-[11px]">
                        <span className="font-bold text-slate-800">Note added</span>: "{n.content}"
                        <span className="text-slate-400 block text-[9px]">{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interaction Forms */}
              <div className="space-y-4">
                {/* Log activity form */}
                <form onSubmit={handleAddActivity} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Log Interaction</span>
                  <div className="flex gap-3">
                    <select
                      value={activityForm.type}
                      onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                      className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value="Call">Call</option>
                      <option value="Email">Email</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Meeting">Meeting</option>
                    </select>
                    <input
                      type="date"
                      value={activityForm.date}
                      onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                  <Input
                    placeholder="Notes: e.g. Sharmaji requested quotation by Friday."
                    value={activityForm.notes}
                    onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                    required
                  />
                  <Button type="submit" size="sm" className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white border-none py-1.5">
                    Record Activity
                  </Button>
                </form>

                {/* Log note form */}
                <form onSubmit={handleAddNote} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Append Deal Notes</span>
                  <textarea
                    placeholder="Private notes (internal view only)"
                    rows={2}
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                    className="w-full px-4 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold resize-none"
                    required
                  />
                  <Button type="submit" size="sm" className="w-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white border-none py-1.5">
                    Save Note
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Create Sales Lead</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Add inquiry information to initialize conversion funnels.</p>
              </div>
              <button onClick={() => setShowAddLeadModal(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="space-y-4">
              <Input
                label="Contact Person Name *"
                placeholder="e.g. Rajesh Kumar"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                required
              />
              <Input
                label="Business / Store Name"
                placeholder="e.g. Kumar Retailers Noida"
                value={newLead.business_name}
                onChange={(e) => setNewLead({ ...newLead, business_name: e.target.value })}
              />
              <Input
                label="Phone Number"
                placeholder="e.g. 9876543210"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              />
              <Input
                label="Email"
                placeholder="e.g. rajesh@kumar.com"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
              <Input
                label="Expected Revenue (₹)"
                type="number"
                placeholder="e.g. 50000"
                value={newLead.expected_revenue}
                onChange={(e) => setNewLead({ ...newLead, expected_revenue: e.target.value })}
              />
              <Input
                label="Lead Source"
                placeholder="e.g. WhatsApp, Google, Walk-in"
                value={newLead.source}
                onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
              />

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Assign Employee</label>
                <select
                  value={newLead.assigned_to}
                  onChange={(e) => setNewLead({ ...newLead, assigned_to: e.target.value })}
                  className="w-full px-4 py-2 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="">-- Choose Employee --</option>
                  {staffList.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>)}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowAddLeadModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none">Save Lead</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
