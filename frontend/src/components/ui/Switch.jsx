import React from 'react';

export function Switch({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  id,
  size = 'md',
  ...props
}) {
  const switchId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  const toggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const isSm = size === 'sm';

  return (
    <div className={`inline-flex items-center justify-between gap-3 ${className}`}>
      {(label || description) && (
        <div className="flex flex-col select-none cursor-pointer" onClick={toggle}>
          {label && <span className="text-body font-medium text-app-text">{label}</span>}
          {description && <span className="text-caption text-app-text-muted">{description}</span>}
        </div>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={toggle}
        {...props}
        className={`relative inline-flex shrink-0 transition-colors duration-200 ease-in-out rounded-full border-2 border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isSm ? 'h-5 w-9' : 'h-6 w-11'
        } ${checked ? 'bg-app-primary' : 'bg-app-border'}`}
      >
        <span
          className={`pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
            isSm ? 'h-4 w-4' : 'h-5 w-5'
          } ${
            checked 
              ? (isSm ? 'translate-x-4' : 'translate-x-5') 
              : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default Switch;
