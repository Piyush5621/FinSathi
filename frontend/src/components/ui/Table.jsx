

export function Table({ children, className = '' }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse">
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="bg-slate-50/70 border-b border-slate-100">
      {children}
    </thead>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function Tbody({ children, className = '' }) {
  return (
    <tbody className={`divide-y divide-slate-100/80 bg-white ${className}`}>
      {children}
    </tbody>
  );
}

export function Tr({ children, className = '', onClick }) {
  return (
    <tr 
        onClick={onClick}
        className={`hover:bg-slate-50/50 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-4 py-3.5 text-xs text-slate-600 font-medium ${className}`}>
      {children}
    </td>
  );
}
