import React, { forwardRef } from 'react';

export const Textarea = forwardRef(function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  error,
  helperText,
  disabled = false,
  className = '',
  id,
  maxLength,
  ...props
}, ref) {
  const textareaId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="text-small font-medium text-app-text flex items-center justify-between">
          <span>
            {label} {required && <span className="text-app-danger">*</span>}
          </span>
          {maxLength && (
            <span className="text-caption text-app-text-muted">
              {value?.length || 0}/{maxLength}
            </span>
          )}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        {...props}
        className={`w-full bg-app-surface text-app-text placeholder:text-app-text-muted border rounded-input px-3.5 py-2.5 text-body transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:bg-app-surface-secondary disabled:cursor-not-allowed resize-y ${
          error 
            ? 'border-app-danger focus:border-app-danger focus:ring-app-danger/20' 
            : 'border-app-border hover:border-app-border focus:border-app-primary focus:ring-app-primary/20'
        }`}
      />
      {error ? (
        <p className="text-caption text-app-danger font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-caption text-app-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Textarea;
