

export function Button({ 
  type = 'button', 
  onClick, 
  children, 
  variant = 'primary', 
  className = '', 
  icon, 
  disabled, 
  as: Component = 'button',
  href,
  target
}) {
  const baseStyle = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 px-4 py-2.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue/30 active:scale-[0.98]";
  
  const variants = {
    primary: "bg-brand-blue text-white shadow-sm shadow-brand-blue/10 hover:bg-blue-600 hover:shadow-md hover:shadow-brand-blue/20",
    secondary: "bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900",
    outline: "bg-transparent border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900",
    danger: "bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 hover:text-rose-700",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-800",
  };

  const combinedClassName = `${baseStyle} ${variants[variant] || variants.primary} ${className}`;

  if (href) {
    return (
      <a href={href} target={target} className={combinedClassName} onClick={onClick}>
        {icon && <span className="flex items-center shrink-0">{icon}</span>}
        <span>{children}</span>
      </a>
    );
  }

  return (
    <Component 
      type={type} 
      onClick={onClick} 
      className={combinedClassName}
      disabled={disabled}
    >
      {icon && <span className="flex items-center shrink-0">{icon}</span>}
      <span>{children}</span>
    </Component>
  );
}
