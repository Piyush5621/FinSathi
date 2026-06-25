

export function Card({ children, className = '', noPadding = false }) {
  return (
    <div className={`bg-white border border-slate-100/80 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.03)] ${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-sm font-bold text-slate-900 tracking-tight ${className}`}>
      {children}
    </h3>
  );
}
