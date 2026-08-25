import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export function Alert({
  variant = 'info', // 'info' | 'success' | 'warning' | 'danger'
  title,
  children,
  onClose,
  className = '',
  icon,
}) {
  const variantStyles = {
    info: 'bg-app-info-subtle text-app-text border-app-info/30',
    success: 'bg-app-success-subtle text-app-text border-app-success/30',
    warning: 'bg-app-warning-subtle text-app-text border-app-warning/30',
    danger: 'bg-app-danger-subtle text-app-text border-app-danger/30',
  };

  const defaultIcons = {
    info: <Info size={18} className="text-app-info shrink-0" />,
    success: <CheckCircle2 size={18} className="text-app-success shrink-0" />,
    warning: <AlertTriangle size={18} className="text-app-warning shrink-0" />,
    danger: <AlertCircle size={18} className="text-app-danger shrink-0" />,
  };

  return (
    <div className={`p-4 rounded-card border flex items-start gap-3 text-body ${variantStyles[variant] || variantStyles.info} ${className}`}>
      {icon ? <span className="shrink-0">{icon}</span> : defaultIcons[variant]}
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-small font-semibold mb-0.5 tracking-tight text-app-text">{title}</h4>}
        <div className="text-small leading-relaxed text-app-text-secondary">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 -mr-1 -mt-1 text-app-text-muted hover:text-app-text rounded-btn transition-colors shrink-0 cursor-pointer"
          aria-label="Close alert"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export default Alert;
