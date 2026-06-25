import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/apiClient";
import CreditScoreCard from "../../components/Dashboard/CreditScoreCard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { 
  Bot, RefreshCw, Calendar, Sparkles, CheckCircle2, 
  HelpCircle, MessageSquare, AlertTriangle, ShieldCheck, 
  ArrowRight, ChevronRight, Zap
} from "lucide-react";
import toast from "react-hot-toast";

export default function FounderDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState(null);
  const [credit, setCredit] = useState(null);
  
  // AI Coach state
  const [coachTopic, setCoachTopic] = useState("");
  const [coachData, setCoachData] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);

  // Checked tasks (persisted in local state for dashboard snappiness)
  const [checkedTasks, setCheckedTasks] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [briefRes, creditRes] = await Promise.all([
        API.get("/intelligence/brief"),
        API.get("/intelligence/credit")
      ]);

      if (briefRes.data?.success) {
        setBrief(briefRes.data.data);
      }
      if (creditRes.data?.success) {
        setCredit(creditRes.data.data);
      }
    } catch (err) {
      console.error("Error loading founder dashboard metrics:", err);
      toast.error("Failed to load intelligence data");
    } finally {
      setLoading(false);
    }
  };

  const loadCoachAdvice = async (topic = "") => {
    try {
      setCoachLoading(true);
      const res = await API.get(`/intelligence/coach?topic=${encodeURIComponent(topic)}`);
      if (res.data?.success) {
        setCoachData(res.data.data);
      } else {
        toast.error("Failed to generate coach advice");
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Coach is currently offline");
    } finally {
      setCoachLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadCoachAdvice(); // Load initial general coaching advice
  }, []);

  const toggleTask = (idx) => {
    setCheckedTasks(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
    toast.success("Action marked as resolved!");
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-12 max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton height="35px" width="280px" />
          <Skeleton height="40px" width="120px" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton height="180px" rounded="rounded-[24px]" />
            <Skeleton height="320px" rounded="rounded-[24px]" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton height="280px" rounded="rounded-[24px]" />
            <Skeleton height="280px" rounded="rounded-[24px]" />
          </div>
        </div>
      </div>
    );
  }

  // Predefined coaching questions
  const preCoachingTopics = [
    { title: "Improve Cash Flow", topic: "Negative cash flow risk & recovery" },
    { title: "Collect Customer Dues", topic: "DSO reduction & outstanding dues collections" },
    { title: "GST Savings Tips", topic: "Input Tax Credit (ITC) optimization" },
  ];

  return (
    <div className="space-y-8 pb-16 max-w-[1400px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Founder Console
            <Badge variant="info" className="text-[9px] uppercase tracking-wider py-0.5 px-2 font-bold bg-indigo-50 border-indigo-100 text-indigo-700">
              AI Powered
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Operational cockpit & strategic recommendations for business owners.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/health-score')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <ShieldCheck size={13} className="text-emerald-500" />
            Health Score
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN (Daily brief cache & Action checklist) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Nightly Cache: Daily Brief Summary Card */}
          <Card className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white border-0 shadow-lg rounded-[24px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Daily Business Brief</h3>
                  <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider mt-0.5">Gemini Aggregated & Cached</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <Calendar size={11} />
                {brief?.briefDate ? new Date(brief.briefDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : "Today"}
              </div>
            </div>

            <p className="text-[13px] leading-relaxed text-slate-200 font-medium my-4">
              {brief?.summary || "Add new sales, payments, or expenses in FinSathi. Once data updates, the AI daily brief will auto-generate your morning summary."}
            </p>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] text-indigo-300 font-bold tracking-widest uppercase">
              <span>Status: Synced</span>
              <span>Generated: {brief?.generatedAt ? new Date(brief.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
            </div>
          </Card>

          {/* Action Center checklist */}
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-[24px]">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Prioritized Action Checklist</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Urgent operations checklist</p>
              </div>
              <span className="text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">
                {(brief?.actionItems || []).length} Actions
              </span>
            </div>

            <div className="space-y-3">
              {brief?.actionItems && brief.actionItems.length > 0 ? (
                brief.actionItems.map((item, idx) => {
                  const isChecked = !!checkedTasks[idx];
                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                        isChecked 
                          ? "bg-slate-50/50 border-slate-100 opacity-60 line-through" 
                          : "bg-white border-slate-150 hover:border-indigo-150 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTask(idx)}
                          className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className={`text-xs font-bold text-slate-800 tracking-tight`}>
                            {item.title}
                          </p>
                          <div className="flex gap-2 items-center mt-1">
                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              item.priority === "Critical" ? "bg-rose-50 text-rose-700" :
                              item.priority === "High" ? "bg-amber-50 text-amber-700" :
                              "bg-slate-50 text-slate-500"
                            }`}>
                              {item.priority}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              Category: {item.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Nav Link Button */}
                      {!isChecked && (
                        <button
                          onClick={() => {
                            if (item.type === "restock") navigate("/inventory");
                            else if (item.type === "collection") navigate("/invoice-history");
                            else if (item.type === "crm") navigate("/crm");
                            else navigate("/general");
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all shrink-0 cursor-pointer"
                        >
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center p-8 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="mx-auto text-emerald-500 w-8 h-8 mb-2" />
                  <p className="text-xs font-bold text-slate-700">No actions required today!</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Your MSME operations are running smoothly.</p>
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN (Credit card, AI Coach widget) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Credit Score Gauge Component */}
          <CreditScoreCard data={credit} loading={loading} />

          {/* AI Business Coach Widget */}
          <Card className="p-5 bg-white border border-slate-100 shadow-sm rounded-[24px] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sparkles size={14} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">AI Business Coach</h3>
            </div>

            {/* Quick Questions Buttons */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Coach Topics</p>
              <div className="flex flex-col gap-1.5">
                {preCoachingTopics.map((topic, i) => (
                  <button
                    key={i}
                    disabled={coachLoading}
                    onClick={() => {
                      setCoachTopic(topic.topic);
                      loadCoachAdvice(topic.topic);
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:text-indigo-700 border border-slate-150 rounded-xl hover:bg-indigo-50/30 transition-all cursor-pointer flex justify-between items-center disabled:opacity-50"
                  >
                    <span>{topic.title}</span>
                    <ArrowRight size={10} />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={coachTopic}
                onChange={(e) => setCoachTopic(e.target.value)}
                placeholder="Ask your coach anything..."
                disabled={coachLoading}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={() => loadCoachAdvice(coachTopic)}
                disabled={coachLoading || !coachTopic.trim()}
                className="px-3 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm shrink-0"
              >
                Go
              </button>
            </div>

            {/* Structural Layout Cards: Problem, Reason, Action, Impact */}
            {coachLoading ? (
              <div className="space-y-3 mt-2">
                <Skeleton height="45px" rounded="rounded-xl" />
                <Skeleton height="45px" rounded="rounded-xl" />
                <Skeleton height="45px" rounded="rounded-xl" />
                <Skeleton height="45px" rounded="rounded-xl" />
              </div>
            ) : coachData ? (
              <div className="space-y-3 mt-2">
                {/* Problem Card */}
                <div className="p-3 bg-rose-50/40 border border-rose-100 rounded-xl">
                  <span className="text-[8px] font-black text-rose-700 uppercase tracking-widest">Problem</span>
                  <p className="text-[11px] font-bold text-slate-800 mt-0.5">{coachData.problem}</p>
                </div>

                {/* Reason Card */}
                <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl">
                  <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest">Reason</span>
                  <p className="text-[11px] font-medium text-slate-700 mt-0.5">{coachData.reason}</p>
                </div>

                {/* Action Card */}
                <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                  <span className="text-[8px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                    <Zap size={8} /> Action Plan
                  </span>
                  <p className="text-[11px] font-bold text-indigo-900 mt-0.5">{coachData.action}</p>
                </div>

                {/* Impact Card */}
                <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl">
                  <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Expected Impact</span>
                  <p className="text-[11px] font-medium text-emerald-900 mt-0.5">{coachData.impact}</p>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 bg-slate-50/50 rounded-xl text-slate-400 text-xs">
                <HelpCircle className="mx-auto w-6 h-6 mb-1 opacity-50" />
                Select a topic above or ask a custom question to get coaching advice.
              </div>
            )}
          </Card>

        </div>

      </div>

    </div>
  );
}
