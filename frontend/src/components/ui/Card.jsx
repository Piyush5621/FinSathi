import React from 'react';

export function Card({ children, className = '', noPadding = false }) {
  return (
    <div className={`bg-[#FFFFFF] border rounded-xl overflow-hidden shadow-sm border-[#E2E8F0] ${noPadding ? '' : 'p-[24px]'} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-[16px] font-semibold text-[#0F172A] ${className}`}>
      {children}
    </h3>
  );
}
