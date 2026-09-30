import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export function Table({ children, className = '', containerClassName = '' }) {
  return (
    <div className={`w-full overflow-x-auto rounded-card border border-app-border bg-app-surface shadow-card ${containerClassName}`}>
      <table className={`w-full text-left border-collapse ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children, className = '' }) {
  return (
    <thead className={`bg-app-surface-secondary border-b border-app-border text-app-text-secondary ${className}`}>
      {children}
    </thead>
  );
}

export function Th({ 
  children, 
  className = '', 
  align = 'left',
  sortable = false,
  sortDirection = null, // 'asc' | 'desc' | null
  onSort,
  ...props 
}) {
  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align] || 'text-left';

  return (
    <th 
      onClick={sortable ? onSort : undefined}
      className={`px-4 py-3 text-caption font-semibold uppercase tracking-wider select-none ${alignmentClass} ${
        sortable ? 'cursor-pointer hover:text-app-text transition-colors' : ''
      } ${className}`}
      {...props}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span>{children}</span>
        {sortable && (
          <span className="text-app-text-muted shrink-0">
            {sortDirection === 'asc' && <ChevronUp size={13} className="text-app-primary" />}
            {sortDirection === 'desc' && <ChevronDown size={13} className="text-app-primary" />}
            {!sortDirection && <ChevronsUpDown size={13} />}
          </span>
        )}
      </div>
    </th>
  );
}

export function Tbody({ children, className = '' }) {
  return (
    <tbody className={`divide-y divide-app-border bg-app-surface ${className}`}>
      {children}
    </tbody>
  );
}

export function Tr({ children, className = '', onClick, selected = false, ...props }) {
  return (
    <tr 
      onClick={onClick}
      className={`transition-colors duration-100 ${
        selected ? 'bg-app-primary-subtle/50' : 'hover:bg-app-surface-secondary/60'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = '', align = 'left', ...props }) {
  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align] || 'text-left';

  return (
    <td className={`px-4 py-3.5 text-body text-app-text ${alignmentClass} ${className}`} {...props}>
      {children}
    </td>
  );
}

export default Table;
