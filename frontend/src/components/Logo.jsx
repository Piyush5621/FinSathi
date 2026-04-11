import React from 'react';

const Logo = ({ collapsed = false }) => {
  return (
    <div className={`flex items-center gap-3 transition-all duration-300 ${collapsed ? 'justify-center w-full' : ''}`}>
      {/* The Purple Icon */}
      <div className={`
        bg-indigo-600 rounded-[14px] flex items-center justify-center 
        shrink-0 shadow-lg shadow-indigo-600/30 
        ${collapsed ? 'w-10 h-10 text-lg' : 'w-9 h-9 text-base'}
      `}>
        <span className="text-white font-black tracking-tighter">FS</span>
      </div>
      
      {/* The Text - Hidden when collapsed */}
      {!collapsed && (
        <span className="text-2xl font-black text-white tracking-tighter">
          FinSathi
        </span>
      )}
    </div>
  );
};

export default Logo;
