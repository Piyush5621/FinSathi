import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardTitle } from '../ui/Card';
import { ArrowRight, AlertTriangle, ShieldAlert, HelpCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

export default function HealthScoreWidget({ data }) {
  const navigate = useNavigate();

  if (!data) {
    return (
      <Card className="flex flex-col h-full bg-white relative overflow-hidden p-6 items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-blue"></div>
        <p className="text-slate-400 text-xs font-semibold mt-4">Analyzing business health...</p>
      </Card>
    );
  }

  const { score, riskLevel, recommendations } = data;

  let colorClass = 'text-rose-500';
  let badgeColor = 'bg-rose-50 text-rose-700 border-rose-100/60';
  if (riskLevel === 'Excellent') {
    colorClass = 'text-emerald-500';
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100/60';
  } else if (riskLevel === 'Healthy') {
    colorClass = 'text-teal-500';
    badgeColor = 'bg-teal-50 text-teal-700 border-teal-100/60';
  } else if (riskLevel === 'Needs Attention') {
    colorClass = 'text-amber-500';
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-100/60';
  }

  return (
    <Card className="flex flex-col h-full bg-white relative overflow-hidden border border-slate-100/80 shadow-sm p-5">
      <div className="flex justify-between items-center mb-5">
        <CardTitle className="text-slate-900 font-bold text-sm tracking-tight">Business Health</CardTitle>
        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-lg uppercase tracking-wider ${badgeColor}`}>
          {riskLevel}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center mb-6">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90">
            <circle 
              cx="56" 
              cy="56" 
              r="48" 
              stroke="#F1F5F9" 
              strokeWidth="8" 
              fill="transparent" 
            />
            <circle 
              cx="56" 
              cy="56" 
              r="48" 
              stroke="currentColor" 
              strokeWidth="8" 
              fill="transparent" 
              strokeDasharray={2 * Math.PI * 48} 
              strokeDashoffset={2 * Math.PI * 48 * (1 - score / 100)}
              className={`transition-all duration-1000 ${colorClass}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{score}</span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">/ 100</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-50/50 -mx-5 -mb-5 p-5 border-t border-slate-100">
        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-1.5">
          <ShieldAlert size={12} className="text-slate-500" /> Focus Areas
        </p>
        <div className="space-y-2.5">
          {recommendations && recommendations.length > 0 ? (
            recommendations.map((rec) => (
              <button 
                key={rec.id}
                onClick={() => navigate(rec.link)}
                className="w-full text-left bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-start justify-between hover:border-brand-blue/40 hover:shadow-md transition-all group gap-3 cursor-pointer"
              >
                <div className="flex gap-2">
                  <div className="mt-0.5 shrink-0">
                    {rec.priority === 'critical' ? (
                      <AlertTriangle size={13} className="text-rose-500" />
                    ) : rec.priority === 'high' ? (
                      <AlertTriangle size={13} className="text-amber-500" />
                    ) : (
                      <HelpCircle size={13} className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 tracking-tight group-hover:text-brand-blue transition-colors">
                      {rec.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                      {rec.message}
                    </p>
                  </div>
                </div>
                <ArrowRight 
                  size={12} 
                  className="text-slate-400 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all shrink-0 mt-1" 
                />
              </button>
            ))
          ) : (
            <div className="text-center p-4 bg-white rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-emerald-600">🎉 All metrics are in excellent shape!</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
