import React from 'react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { 
  TrendingUp, TrendingDown, Minus, ArrowRight, 
  Sparkles, AlertCircle, AlertTriangle, Info, CheckCircle2,
  ChevronRight, ExternalLink
} from 'lucide-react';
import Skeleton from './Skeleton';

/**
 * 1. MetricCard — KPI Snapshot Card
 * Displays primary numeric business metrics with comparison trends,
 * secondary progress/context, and semantic coloring.
 */
export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeType = 'increase', // 'increase' | 'decrease' | 'neutral'
  changePeriod = 'vs yesterday',
  icon,
  iconBg = 'bg-app-primary-subtle text-app-primary',
  badge,
  badgeVariant = 'neutral',
  progress,
  onClick,
  className = '',
  loading = false,
  footer,
}) {
  const isPositive = changeType === 'increase';
  const isNegative = changeType === 'decrease';

  return (
    <Card 
      onClick={onClick} 
      hover={Boolean(onClick)}
      className={`relative overflow-hidden flex flex-col justify-between transition-all duration-200 group ${
        onClick ? 'cursor-pointer hover:border-app-primary/40 hover:shadow-elevated' : ''
      } ${className}`}
    >
      <div>
        {/* Card Header Row */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-micro font-bold uppercase tracking-wider text-app-text-secondary truncate">
                {title}
              </span>
              {badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-control uppercase tracking-wider ${
                  badgeVariant === 'success' ? 'bg-app-success-subtle text-app-success border border-app-success/20' :
                  badgeVariant === 'warning' ? 'bg-app-warning-subtle text-app-warning border border-app-warning/20' :
                  badgeVariant === 'danger' ? 'bg-app-danger-subtle text-app-danger border border-app-danger/20' :
                  badgeVariant === 'primary' ? 'bg-app-primary-subtle text-app-primary border border-app-primary/20' :
                  'bg-app-surface-secondary text-app-text-secondary border border-app-border'
                }`}>
                  {badge}
                </span>
              )}
            </div>

            {loading ? (
              <div className="h-8 w-28 bg-app-surface-secondary animate-pulse rounded-btn mt-1.5" />
            ) : (
              <div className="text-2xl lg:text-[26px] font-black text-app-text tabular-nums tracking-tight mt-0.5 truncate">
                {value}
              </div>
            )}
          </div>

          {icon && (
            <div className={`w-10 h-10 rounded-panel shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs ${iconBg}`}>
              {icon}
            </div>
          )}
        </div>

        {/* Progress Bar (if provided) */}
        {typeof progress === 'number' && !loading && (
          <div className="mt-3 w-full bg-app-surface-secondary h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-app-primary h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} 
            />
          </div>
        )}
      </div>

      {/* Comparison Trend / Footer */}
      {(change !== undefined || subtitle || footer) && (
        <div className="mt-3 pt-3 border-t border-app-border/50 flex items-center justify-between text-caption text-app-text-muted gap-2">
          {change !== undefined ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-control text-micro font-bold tabular-nums ${
                isPositive 
                  ? 'bg-app-success-subtle text-app-success border border-app-success/20' 
                  : isNegative 
                  ? 'bg-app-danger-subtle text-app-danger border border-app-danger/20' 
                  : 'bg-app-surface-secondary text-app-text-muted border border-app-border'
              }`}>
                {isPositive && <TrendingUp size={11} />}
                {isNegative && <TrendingDown size={11} />}
                {!isPositive && !isNegative && <Minus size={11} />}
                {change}
              </span>
              {changePeriod && (
                <span className="text-micro text-app-text-muted font-medium truncate">
                  {changePeriod}
                </span>
              )}
            </div>
          ) : (
            <div />
          )}

          {subtitle && (
            <span className="text-micro font-medium text-app-text-secondary truncate text-right">
              {subtitle}
            </span>
          )}

          {footer}
        </div>
      )}
    </Card>
  );
}

/**
 * 2. InsightCard — AI & Intelligence Advisor Card
 * Highlights operational insights, automated tips, and immediate call-to-actions.
 */
export function InsightCard({
  title,
  description,
  badge = 'AI Advisor',
  actionText = 'Take Action',
  onAction,
  icon = <Sparkles size={16} />,
  variant = 'indigo', // 'indigo' | 'emerald' | 'amber' | 'rose'
  className = '',
  loading = false,
}) {
  const variantStyles = {
    indigo: {
      bg: 'bg-gradient-to-br from-indigo-50/80 via-app-surface to-indigo-50/30 dark:from-indigo-950/30 dark:via-app-surface dark:to-indigo-950/10',
      border: 'border-indigo-200/80 dark:border-indigo-900/60',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      button: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50/80 via-app-surface to-emerald-50/30 dark:from-emerald-950/30 dark:via-app-surface dark:to-emerald-950/10',
      border: 'border-emerald-200/80 dark:border-emerald-900/60',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      button: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50/80 via-app-surface to-amber-50/30 dark:from-amber-950/30 dark:via-app-surface dark:to-amber-950/10',
      border: 'border-amber-200/80 dark:border-amber-900/60',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      iconColor: 'text-amber-600 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
    },
    rose: {
      bg: 'bg-gradient-to-br from-rose-50/80 via-app-surface to-rose-50/30 dark:from-rose-950/30 dark:via-app-surface dark:to-rose-950/10',
      border: 'border-rose-200/80 dark:border-rose-900/60',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      iconColor: 'text-rose-600 dark:text-rose-400',
      button: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20',
    }
  };

  const style = variantStyles[variant] || variantStyles.indigo;

  if (loading) {
    return (
      <Card className={`p-5 rounded-panel border ${style.border} ${style.bg} ${className}`}>
        <Skeleton height="20px" width="120px" className="mb-3" />
        <Skeleton height="28px" width="80%" className="mb-2" />
        <Skeleton height="16px" width="95%" className="mb-4" />
        <Skeleton height="36px" width="140px" rounded="rounded-btn" />
      </Card>
    );
  }

  return (
    <Card className={`relative overflow-hidden p-5 sm:p-6 rounded-panel border shadow-card transition-all ${style.border} ${style.bg} ${className}`}>
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-white/20 dark:from-white/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full gap-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-control text-micro font-bold uppercase tracking-wider border shadow-xs ${style.badge}`}>
              <span className={style.iconColor}>{icon}</span>
              {badge}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-app-text tracking-tight leading-snug">
            {title}
          </h3>

          <p className="text-small text-app-text-secondary mt-1.5 leading-relaxed font-normal">
            {description}
          </p>
        </div>

        {onAction && actionText && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onAction}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-btn font-bold text-small transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${style.button}`}
            >
              <span>{actionText}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * 3. AnalyticsCard — Chart & Analytics Container
 * Encapsulates interactive charts with time-range selectors, summary statistics,
 * and unified KaroBar visual styling.
 */
export function AnalyticsCard({
  title,
  subtitle,
  icon,
  periods = ['Today', '7 Days', '30 Days', '12 Months'],
  selectedPeriod,
  onPeriodChange,
  metrics = [],
  children,
  headerAction,
  className = '',
  loading = false,
}) {
  return (
    <Card className={`p-5 sm:p-6 rounded-panel border border-app-border bg-app-surface shadow-card flex flex-col ${className}`}>
      {/* Card Header & Period Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app-border/60">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="p-2 bg-app-primary-subtle text-app-primary rounded-panel shrink-0 mt-0.5">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-card-heading font-bold text-app-text tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-caption text-app-text-secondary mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {periods && periods.length > 0 && onPeriodChange && (
            <div className="inline-flex p-0.5 bg-app-surface-secondary border border-app-border rounded-btn text-micro font-semibold shadow-xs">
              {periods.map((period) => {
                const isSelected = selectedPeriod === period;
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => onPeriodChange(period)}
                    className={`px-2.5 py-1 rounded-control transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-app-surface text-app-text font-bold shadow-xs'
                        : 'text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
          )}
          {headerAction}
        </div>
      </div>

      {/* Metric Highlight Chips (if provided) */}
      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-app-border/40">
          {metrics.map((m, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-micro font-medium uppercase tracking-wider text-app-text-muted">
                {m.label}
              </span>
              <span className="text-base font-bold text-app-text tabular-nums mt-0.5">
                {m.value}
              </span>
              {m.change && (
                <span className={`text-micro font-semibold mt-0.5 ${
                  m.isPositive ? 'text-app-success' : m.isNegative ? 'text-app-danger' : 'text-app-text-muted'
                }`}>
                  {m.change}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chart Canvas Area */}
      <div className="pt-4 flex-1 min-h-[220px] flex flex-col justify-center">
        {loading ? (
          <div className="h-[220px] w-full flex items-center justify-center">
            <Skeleton height="100%" width="100%" rounded="rounded-panel" />
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

/**
 * 4. ActionCard — Quick Action Shortcut Card
 * Tactile, elevated quick-action button with icon, label, and hover micro-animations.
 */
export function ActionCard({
  label,
  description,
  icon,
  onClick,
  badge,
  variant = 'default', // 'default' | 'primary' | 'accent'
  className = '',
  disabled = false,
}) {
  const variantStyles = {
    default: 'bg-app-surface hover:bg-app-surface-secondary border-app-border hover:border-app-primary/30 text-app-text',
    primary: 'bg-app-primary text-white border-transparent hover:bg-app-primary-hover shadow-xs',
    accent: 'bg-app-surface-secondary hover:bg-app-surface border-app-border hover:border-app-primary/40 text-app-text',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 rounded-panel border shadow-card text-left transition-all duration-150 flex items-center gap-3.5 group cursor-pointer hover:-translate-y-0.5 hover:shadow-elevated disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${className}`}
    >
      <div className="w-10 h-10 rounded-btn bg-app-primary-subtle text-app-primary flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-xs">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-small text-app-text tracking-tight truncate">
            {label}
          </span>
          {badge && (
            <span className="text-micro font-bold px-1.5 py-0.2 rounded-control bg-app-primary-subtle text-app-primary border border-app-primary/20">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-micro text-app-text-secondary truncate mt-0.5">
            {description}
          </p>
        )}
      </div>

      <ChevronRight size={15} className="text-app-text-muted group-hover:text-app-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

/**
 * 5. AlertCard — Actionable Attention Card
 * Used in "Needs Your Attention" to surface critical issues, stockouts, overdue bills,
 * and high-priority anomalies with direct resolution links.
 */
export function AlertCard({
  title,
  description,
  priority = 'high', // 'critical' | 'high' | 'medium' | 'info'
  actionLabel = 'Resolve →',
  onAction,
  icon,
  timestamp,
  className = '',
}) {
  const priorityStyles = {
    critical: {
      border: 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      iconColor: 'text-rose-600 dark:text-rose-400',
      defaultIcon: <AlertCircle size={16} />,
      label: 'Critical',
    },
    high: {
      border: 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      iconColor: 'text-amber-600 dark:text-amber-400',
      defaultIcon: <AlertTriangle size={16} />,
      label: 'High Priority',
    },
    medium: {
      border: 'border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      defaultIcon: <Info size={16} />,
      label: 'Attention',
    },
    info: {
      border: 'border-slate-200 dark:border-slate-800 bg-app-surface-secondary/40',
      badge: 'bg-app-surface text-app-text-secondary border-app-border',
      iconColor: 'text-app-primary',
      defaultIcon: <Info size={16} />,
      label: 'Info',
    }
  };

  const style = priorityStyles[priority] || priorityStyles.high;

  return (
    <div className={`p-4 rounded-panel border shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:shadow-card ${style.border} ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className={`mt-0.5 shrink-0 ${style.iconColor}`}>
          {icon || style.defaultIcon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-small font-bold text-app-text tracking-tight">
              {title}
            </h4>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-control uppercase tracking-wider border shadow-2xs ${style.badge}`}>
              {style.label}
            </span>
            {timestamp && (
              <span className="text-micro text-app-text-muted">
                • {timestamp}
              </span>
            )}
          </div>
          <p className="text-caption text-app-text-secondary mt-0.5 leading-normal">
            {description}
          </p>
        </div>
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-small font-bold text-app-primary hover:bg-app-primary hover:text-white border border-app-primary/30 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 self-start sm:self-center"
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

/**
 * 6. ActivityCard — Feed / Timeline Activity Item
 * Renders an entry in the live business activity stream with amount and metadata.
 */
export function ActivityCard({
  title,
  subtitle,
  timestamp,
  amount,
  amountType = 'neutral', // 'positive' | 'negative' | 'neutral'
  icon,
  badge,
  onClick,
  className = '',
}) {
  return (
    <div 
      onClick={onClick}
      className={`p-3.5 rounded-panel border border-app-border/80 bg-app-surface hover:bg-app-surface-secondary/60 transition-all flex items-center justify-between gap-3 group ${
        onClick ? 'cursor-pointer hover:border-app-primary/30 hover:shadow-xs' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-btn bg-app-surface-secondary text-app-text-secondary flex items-center justify-center shrink-0 group-hover:bg-app-primary-subtle group-hover:text-app-primary transition-colors shadow-2xs">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-small font-semibold text-app-text tracking-tight truncate group-hover:text-app-primary transition-colors">
            {title}
          </p>
          <div className="flex items-center gap-2 text-micro text-app-text-muted mt-0.5 truncate">
            {subtitle && <span className="truncate">{subtitle}</span>}
            {subtitle && timestamp && <span>•</span>}
            {timestamp && <span className="shrink-0">{timestamp}</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        {amount !== undefined && (
          <span className={`text-small font-bold tabular-nums tracking-tight ${
            amountType === 'positive' ? 'text-app-success' :
            amountType === 'negative' ? 'text-app-danger' :
            'text-app-text'
          }`}>
            {amount}
          </span>
        )}
        {badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-control bg-app-surface-secondary text-app-text-muted mt-0.5 border border-app-border">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 7. SectionCard — Structured Module Section Wrapper
 * Standardizes section layout across modules with header, actions, and consistent body spacing.
 */
export function SectionCard({
  title,
  subtitle,
  icon,
  badge,
  headerAction,
  children,
  footer,
  noPadding = false,
  className = '',
}) {
  return (
    <Card className={`border border-app-border bg-app-surface rounded-panel shadow-card overflow-hidden ${className}`}>
      {/* Section Header */}
      {(title || headerAction) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 border-b border-app-border/60 bg-app-surface">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="p-2 bg-app-surface-secondary text-app-text-secondary rounded-btn shrink-0 mt-0.5">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-card-heading font-bold text-app-text tracking-tight">
                  {title}
                </h3>
                {badge && (
                  <span className="text-micro font-bold px-2 py-0.5 rounded-control bg-app-surface-secondary text-app-text-secondary border border-app-border">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-caption text-app-text-secondary mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {headerAction && (
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      )}

      {/* Section Body */}
      <div className={noPadding ? '' : 'p-5 sm:p-6'}>
        {children}
      </div>

      {/* Section Footer */}
      {footer && (
        <div className="p-4 sm:px-6 bg-app-surface-secondary/40 border-t border-app-border/60 flex items-center justify-between text-caption text-app-text-secondary">
          {footer}
        </div>
      )}
    </Card>
  );
}

export default Card;
