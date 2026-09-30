import React from 'react';

export function Card({ 
  children, 
  className = '', 
  noPadding = false,
  elevated = false,
  hover = false,
  onClick,
  ...props 
}) {
  return (
    <div 
      onClick={onClick}
      className={`bg-app-surface text-app-text border border-app-border rounded-card transition-all duration-150 ${
        elevated ? 'shadow-elevated bg-app-surface-elevated' : 'shadow-card'
      } ${
        hover ? 'hover:border-app-border hover:shadow-elevated cursor-pointer' : ''
      } ${
        noPadding ? '' : 'p-5'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1 pb-4 border-b border-app-border/60 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', as: Component = 'h3', ...props }) {
  return (
    <Component className={`text-card-heading text-app-text tracking-tight flex items-center gap-2 ${className}`} {...props}>
      {children}
    </Component>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-small text-app-text-secondary ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`pt-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`mt-4 pt-3.5 border-t border-app-border/60 flex items-center justify-between gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
