import React, { forwardRef } from 'react';

export const Input = forwardRef(function Input({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  required = false, 
  error,
  helperText,
  icon,
  iconRight,
  disabled = false,
  className = '', 
  id,
  ...props 
}, ref) {
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-small font-medium text-app-text flex items-center justify-between">
          <span>
            {label} {required && <span className="text-app-danger">*</span>}
          </span>
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-app-text-muted">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          {...props}
          className={`w-full bg-app-surface text-app-text placeholder:text-app-text-muted border rounded-input px-3.5 py-2 text-body transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:bg-app-surface-secondary disabled:cursor-not-allowed ${
            icon ? 'pl-9' : ''
          } ${iconRight ? 'pr-9' : ''} ${
            error 
              ? 'border-app-danger focus:border-app-danger focus:ring-app-danger/20' 
              : 'border-app-border hover:border-app-border focus:border-app-primary focus:ring-app-primary/20'
          }`}
        />
        {iconRight && (
          <div className="absolute right-3 flex items-center text-app-text-muted">
            {iconRight}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-caption text-app-danger font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-caption text-app-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
