import React from 'react';
import Card from './Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function KpiCard({
  title,
  value,
  subtitle,
  change,
  changeType = 'increase', // 'increase' | 'decrease' | 'neutral'
  changePeriod,
  icon,
  iconBg = 'bg-app-primary-subtle text-app-primary',
  onClick,
  className = '',
  loading = false,
}) {
  const isPositive = changeType === 'increase';
  const isNegative = changeType === 'decrease';

  return (
    <Card 
      onClick={onClick} 
      hover={!!onClick}
      className={`relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-caption font-medium text-app-text-secondary uppercase tracking-wider truncate">
            {title}
          </span>
          {loading ? (
            <div className="h-8 w-28 bg-app-surface-secondary animate-pulse rounded-btn mt-1" />
          ) : (
            <span className="text-2xl font-bold text-app-text tabular-nums tracking-tight mt-0.5">
              {value}
            </span>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-panel shrink-0 flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      {(subtitle || change !== undefined) && (
        <div className="mt-3.5 pt-3 border-t border-app-border/40 flex items-center justify-between text-caption text-app-text-muted">
          {change !== undefined && (
            <div className="flex items-center gap-1 font-semibold">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-control text-micro font-bold ${
                isPositive 
                  ? 'bg-app-success-subtle text-app-success' 
                  : isNegative 
                  ? 'bg-app-danger-subtle text-app-danger' 
                  : 'bg-app-surface-secondary text-app-text-muted'
              }`}>
                {isPositive && <TrendingUp size={11} />}
                {isNegative && <TrendingDown size={11} />}
                {!isPositive && !isNegative && <Minus size={11} />}
                {change}
              </span>
              {changePeriod && <span className="text-app-text-muted font-normal">{changePeriod}</span>}
            </div>
          )}
          {subtitle && <span className="truncate ml-auto">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}

export default KpiCard;
