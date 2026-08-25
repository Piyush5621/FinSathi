import React from 'react';
import { PackageOpen } from 'lucide-react';
import Button from './Button';

export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No records found',
  description = 'There are no items to display right now.',
  actionLabel,
  onAction,
  actionIcon,
  actionHref,
  className = '',
  children,
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-card border border-dashed border-app-border bg-app-surface/50 ${className}`}>
      <div className="w-12 h-12 rounded-panel bg-app-surface-secondary text-app-text-muted flex items-center justify-center mb-4 shadow-sm">
        {typeof Icon === 'function' ? <Icon size={24} /> : Icon}
      </div>
      <h3 className="text-card-heading text-app-text font-semibold mb-1.5">{title}</h3>
      {description && (
        <p className="text-small text-app-text-secondary max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && (onAction || actionHref) && (
        <Button
          variant="primary"
          onClick={onAction}
          href={actionHref}
          icon={actionIcon}
        >
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}

export default EmptyState;
