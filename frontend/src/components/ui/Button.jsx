import React from 'react';

export function Button({ type = 'button', onClick, children, variant = 'primary', className = '', icon, disabled }) {
  const baseStyle = "flex items-center justify-center gap-[8px] font-medium rounded-lg transition-colors px-[16px] py-[10px] text-[14px] disabled:opacity-50 disabled:cursor-not-allowed";
  
  // Strict Classical Finance Guidelines
  const variants = {
    primary: "bg-[#3B82F6] text-white hover:bg-blue-600 focus:ring-2 focus:ring-[#3B82F6]/50",
    secondary: "bg-white border text-[#334155] border-[#CBD5E1] hover:bg-gray-50",
    danger: "bg-[#FEE2E2] text-[#B91C1C] hover:bg-red-200 border border-transparent",
    ghost: "bg-transparent text-[#334155] hover:bg-gray-100"
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`}
      disabled={disabled}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </button>
  );
}
