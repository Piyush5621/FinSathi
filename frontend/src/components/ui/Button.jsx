import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({ 
  type = 'button', 
  onClick, 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  icon, 
  iconRight,
  disabled = false, 
  loading = false,
  as: Component = 'button',
  href,
  target,
  title,
  ...props
}) {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-btn focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer active:scale-[0.99] select-none";

  const sizeStyles = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5 h-8",
    md: "px-3.5 py-2 text-small gap-2 h-9",
    lg: "px-4 py-2.5 text-body gap-2.5 h-10",
    icon: "p-2 h-9 w-9 shrink-0",
  };

  const variants = {
    primary: "bg-app-primary text-white hover:bg-app-primary-hover shadow-sm focus-visible:ring-app-primary/40 border border-transparent",
    secondary: "bg-app-surface text-app-text border border-app-border hover:bg-app-surface-secondary hover:text-app-text shadow-sm focus-visible:ring-app-border",
    outline: "bg-transparent text-app-text border border-app-border hover:bg-app-surface-secondary focus-visible:ring-app-border",
    ghost: "bg-transparent text-app-text-secondary hover:bg-app-surface-secondary hover:text-app-text focus-visible:ring-app-border border border-transparent",
    danger: "bg-app-danger text-white hover:opacity-90 shadow-sm focus-visible:ring-app-danger/40 border border-transparent",
    dangerOutline: "bg-transparent text-app-danger border border-app-danger/30 hover:bg-app-danger-subtle focus-visible:ring-app-danger/30",
    success: "bg-app-success text-white hover:opacity-90 shadow-sm focus-visible:ring-app-success/40 border border-transparent",
  };

  const combinedClassName = `${baseStyle} ${sizeStyles[size] || sizeStyles.md} ${variants[variant] || variants.primary} ${className}`;

  const content = (
    <>
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0" />
      ) : icon ? (
        <span className="flex items-center shrink-0">{icon}</span>
      ) : null}
      {children && <span className="truncate">{children}</span>}
      {!loading && iconRight && <span className="flex items-center shrink-0">{iconRight}</span>}
    </>
  );

  if (href) {
    return (
      <a 
        href={href} 
        target={target} 
        className={combinedClassName} 
        onClick={onClick}
        title={title}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <Component 
      type={type} 
      onClick={onClick} 
      className={combinedClassName}
      disabled={disabled || loading}
      title={title}
      {...props}
    >
      {content}
    </Component>
  );
}

export default Button;
