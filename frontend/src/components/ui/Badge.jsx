import React from 'react';

export function Badge({ children, variant = 'gray', className = '' }) {
  // Classical Finance Status Rules
  const variants = {
    success: "bg-status-success-bg text-status-success-text",
    warning: "bg-status-warning-bg text-status-warning-text",
    danger: "bg-status-danger-bg text-status-danger-text",
    gray: "bg-gray-100 text-[#64748B]",
  };

  // Fallback to literal hex values matching the config if tailwind mappings are too deep
  const customVariants = {
    success: "bg-[#DCFCE7] text-[#15803D]",
    warning: "bg-[#FEF3C7] text-[#B45309]",
    danger: "bg-[#FEE2E2] text-[#B91C1C]",
    gray: "bg-[#F1F5F9] text-[#64748B]" // slate-100/label
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${customVariants[variant] || customVariants.gray} ${className}`}>
      {children}
    </span>
  );
}
