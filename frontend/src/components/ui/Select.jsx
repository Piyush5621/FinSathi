import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  required = false,
  error,
  helperText,
  disabled = false,
  className = '',
  id,
  children,
  ...props
}, ref) {
  const selectId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={selectId} className="text-small font-medium text-app-text flex items-center justify-between">
          <span>
            {label} {required && <span className="text-app-danger">*</span>}
          </span>
        </label>
      )}
      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          {...props}
          className={`w-full appearance-none bg-app-surface text-app-text border rounded-input px-3.5 py-2 pr-9 text-body transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:bg-app-surface-secondary disabled:cursor-not-allowed cursor-pointer ${
            error 
              ? 'border-app-danger focus:border-app-danger focus:ring-app-danger/20' 
              : 'border-app-border hover:border-app-border focus:border-app-primary focus:ring-app-primary/20'
          }`}
        >
          {placeholder && <option value="" disabled className="text-app-text-muted">{placeholder}</option>}
          {options.length > 0 
            ? options.map((opt) => (
                <option key={opt.value ?? opt} value={opt.value ?? opt} className="bg-app-surface text-app-text">
                  {opt.label ?? opt}
                </option>
              ))
            : children
          }
        </select>
        <div className="absolute right-3 pointer-events-none text-app-text-muted flex items-center">
          <ChevronDown size={16} />
        </div>
      </div>
      {error ? (
        <p className="text-caption text-app-danger font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-caption text-app-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Select;
