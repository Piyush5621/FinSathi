import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';

export const Checkbox = forwardRef(function Checkbox({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  id,
  ...props
}, ref) {
  const checkboxId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <label 
      htmlFor={checkboxId} 
      className={`inline-flex items-start gap-2.5 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
          className="sr-only peer"
        />
        <div className="w-4 h-4 rounded-control border border-app-border bg-app-surface peer-checked:bg-app-primary peer-checked:border-app-primary peer-focus-visible:ring-2 peer-focus-visible:ring-app-primary/30 transition-all duration-150 flex items-center justify-center">
          {checked && <Check size={11} strokeWidth={3} className="text-white" />}
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-body font-medium text-app-text">{label}</span>}
          {description && <span className="text-caption text-app-text-muted">{description}</span>}
        </div>
      )}
    </label>
  );
});

export default Checkbox;
