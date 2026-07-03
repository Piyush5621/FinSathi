import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { TYPOGRAPHY, LAYOUT } from '../utils/networkConstants';

/**
 * Standardized KPI Card for high-level metrics.
 * 
 * @param {Object} props
 * @param {string} props.label - e.g. "Active Partners"
 * @param {string|number} props.value - e.g. 42 or "₹50K"
 * @param {string} [props.sub] - Secondary description
 * @param {React.ElementType} props.icon - Lucide icon
 * @param {string} [props.color='text-indigo-600'] - Tailwind text color class
 * @param {string} [props.link] - Route to navigate on click
 * @param {string} [props.trend] - 'up' or 'down'
 * @param {string} [props.trendValue] - e.g. "12%"
 */
export default function KPICard({ 
  label, value, sub, icon: Icon, color = 'text-indigo-600', link, trend, trendValue 
}) {
  const content = (
    <Card className={`${LAYOUT.card} group`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{sub}</p>}
          
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-bold ${trend === 'up' ? 'text-emerald-600' : 'text-rose-500'}`}>
              {trend === 'up' ? <ArrowUpRight size={10} aria-hidden="true" /> : <ArrowDownRight size={10} aria-hidden="true" />}
              <span>{trendValue} <span className="text-slate-400 font-medium">vs last month</span></span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${color.replace('text-', 'bg-').replace(/-\d+/, '-100')} ${color.includes('white') ? 'bg-slate-100' : ''}`}>
          <Icon size={18} className={color === 'text-white' ? 'text-slate-600' : color} aria-hidden="true" />
        </div>
      </div>
      
      {link && (
        <div className="flex items-center gap-1 mt-3 text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
          View details <ArrowRight size={10} aria-hidden="true" />
        </div>
      )}
    </Card>
  );

  if (link) {
    return (
      <Link to={link} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-[20px]" aria-label={`View details for ${label}`}>
        {content}
      </Link>
    );
  }

  return content;
}
