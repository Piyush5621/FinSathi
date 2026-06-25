

export function Badge({ children, variant = 'gray', className = '' }) {
  const variants = {
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100/60",
    warning: "bg-amber-50 text-amber-700 border border-amber-100/60",
    danger: "bg-rose-50 text-rose-700 border border-rose-100/60",
    gray: "bg-slate-50 text-slate-600 border border-slate-100/80",
    blue: "bg-blue-50 text-blue-700 border border-blue-100/60"
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${variants[variant] || variants.gray} ${className}`}>
      {children}
    </span>
  );
}
