import React from "react";
import { Card } from "../ui/Card";
import { AlertCircle, IndianRupee, ShieldCheck, Sparkles, TrendingUp, Wallet } from "lucide-react";

export default function CreditScoreCard({ data, loading }) {
  if (loading) {
    return (
      <Card className="p-6 bg-white border border-slate-100/80 shadow-sm flex flex-col items-center justify-center min-h-[350px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <p className="text-slate-400 text-xs font-semibold mt-4">Computing credit intelligence...</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6 bg-white border border-slate-100/80 shadow-sm flex flex-col items-center justify-center min-h-[350px]">
        <AlertCircle className="text-slate-300 w-10 h-10 mb-2" />
        <p className="text-slate-500 text-xs font-semibold">Credit profile could not be loaded</p>
      </Card>
    );
  }

  const { score, rating, metrics, explanation } = data;

  // Percentage for gauge (300 to 900)
  const percent = Math.max(0, Math.min(100, ((score - 300) / 600) * 100));

  let scoreColor = "text-rose-500";
  let scoreStroke = "#EF4444";
  let badgeClass = "bg-rose-50 text-rose-700 border-rose-100";

  if (score >= 750) {
    scoreColor = "text-emerald-500";
    scoreStroke = "#10B981";
    badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
  } else if (score >= 680) {
    scoreColor = "text-indigo-500";
    scoreStroke = "#6366F1";
    badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-100";
  } else if (score >= 580) {
    scoreColor = "text-amber-500";
    scoreStroke = "#F59E0B";
    badgeClass = "bg-amber-50 text-amber-700 border-amber-100";
  }

  return (
    <Card className="p-6 bg-white border border-slate-100/80 shadow-sm rounded-[24px] flex flex-col justify-between h-full">
      
      {/* Title */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Credit Intelligence</h3>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Eligibility & GST Estimate</p>
        </div>
        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-lg uppercase tracking-wider ${badgeClass}`}>
          Rating: {rating}
        </span>
      </div>

      {/* Main Grid: Dial & Sub-metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Dial */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="60"
                stroke="#F1F5F9"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="60"
                stroke={scoreStroke}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 60}
                strokeDashoffset={2 * Math.PI * 60 * (1 - percent / 100)}
                className="transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black tracking-tight ${scoreColor}`}>{score}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">CIBIL Range</span>
              <span className="text-[8px] font-medium text-slate-400">300 - 900</span>
            </div>
          </div>
        </div>

        {/* Local Formula Computed Metrics */}
        <div className="md:col-span-7 space-y-3.5">
          {/* GST Due */}
          <div className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <IndianRupee size={15} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. GST Due (30d)</p>
                <p className="text-xs text-slate-500 font-medium leading-none mt-0.5">Output GST less Input Credit</p>
              </div>
            </div>
            <span className="text-sm font-extrabold text-slate-800">
              ₹{metrics.estimatedGstDue.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Ratios row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50/30 rounded-2xl border border-slate-100/60 text-center">
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">DSCR Ratio</p>
              <p className="text-sm font-black text-slate-800 mt-1">{metrics.workingCapitalRatio >= 1 ? metrics.workingCapitalRatio.toFixed(2) : "1.00"}</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Target &gt; 1.25</p>
            </div>
            <div className="p-3 bg-slate-50/30 rounded-2xl border border-slate-100/60 text-center">
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Collection Speed</p>
              <p className="text-sm font-black text-slate-800 mt-1">{metrics.dso.toFixed(0)} days</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Target &lt; 30 days</p>
            </div>
          </div>
        </div>

      </div>

      {/* Gemini AI Coach Explanation */}
      <div className="mt-5 p-4 bg-indigo-950 text-indigo-200/90 rounded-[20px] border border-indigo-850 relative overflow-hidden">
        <div className="absolute right-3 top-3 opacity-20 text-indigo-300">
          <Sparkles size={16} />
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldCheck size={14} className="text-indigo-400 shrink-0" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300">AI Credit Explanation</h4>
        </div>
        <p className="text-[11px] leading-relaxed font-medium">
          {explanation}
        </p>
      </div>

    </Card>
  );
}
