import React from 'react';

const STATUS_MAP = {
  // Success
  paid: 'success',
  active: 'success',
  imported: 'success',
  completed: 'success',
  approved: 'success',
  delivered: 'success',
  won: 'success',
  settled: 'success',
  functional: 'success',
  core: 'success',
  popular: 'success',

  // Warning
  pending: 'warning',
  partial: 'warning',
  'low stock': 'warning',
  'awaiting approval': 'warning',
  inward: 'warning',
  beta: 'warning',
  auditable: 'warning',

  // Danger
  failed: 'danger',
  rejected: 'danger',
  overdue: 'danger',
  suspended: 'danger',
  lost: 'danger',
  inactive: 'gray',
  'out of stock': 'danger',

  // Neutral / Gray
  draft: 'gray',
  archived: 'gray',
  general: 'gray',
  roadmap: 'info',
  pro: 'blue',
  premium: 'purple',
};

export function getStatusVariant(status) {
  if (!status) return 'gray';
  const key = String(status).toLowerCase().trim();
  return STATUS_MAP[key] || 'gray';
}

export function Badge({ 
  children, 
  variant, 
  status,
  dot = false, 
  className = '',
  size = 'md',
  ...props 
}) {
  const effectiveVariant = variant || (status ? getStatusVariant(status) : 'gray');

  const variantStyles = {
    success: "bg-app-success-subtle text-app-success border-app-success/20",
    warning: "bg-app-warning-subtle text-app-warning border-app-warning/20",
    danger: "bg-app-danger-subtle text-app-danger border-app-danger/20",
    info: "bg-app-info-subtle text-app-info border-app-info/20",
    blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
    purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
    gray: "bg-app-surface-secondary text-app-text-secondary border-app-border",
  };

  const dotColorStyles = {
    success: "bg-app-success",
    warning: "bg-app-warning",
    danger: "bg-app-danger",
    info: "bg-app-info",
    blue: "bg-blue-600",
    purple: "bg-purple-600",
    gray: "bg-app-text-muted",
  };

  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-micro gap-1",
    md: "px-2 py-0.5 text-caption gap-1.5",
    lg: "px-2.5 py-1 text-small gap-1.5",
  };

  return (
    <span 
      className={`inline-flex items-center font-semibold rounded-control border leading-none shrink-0 ${
        sizeStyles[size] || sizeStyles.md
      } ${
        variantStyles[effectiveVariant] || variantStyles.gray
      } ${className}`}
      {...props}
    >
      {dot && (
        <span 
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColorStyles[effectiveVariant] || dotColorStyles.gray}`} 
          aria-hidden="true" 
        />
      )}
      <span>{children || status}</span>
    </span>
  );
}

export default Badge;
