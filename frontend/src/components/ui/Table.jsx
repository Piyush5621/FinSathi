

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
    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] border-t">
      {children}
    </thead>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th className={`px-[16px] py-[12px] text-[12px] font-semibold text-[#64748B] uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function Tbody({ children, className = '' }) {
  return (
    <tbody className={`divide-y divide-[#E2E8F0] ${className}`}>
      {children}
    </tbody>
  );
}

export function Tr({ children, className = '', onClick }) {
  return (
    <tr 
        onClick={onClick}
        className={`hover:bg-[#F8FAFC] transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-[16px] py-[16px] text-[14px] text-[#334155] ${className}`}>
      {children}
    </td>
  );
}
