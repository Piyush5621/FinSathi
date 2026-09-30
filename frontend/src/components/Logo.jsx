import React from 'react';
import logoImg from '../assets/logo.png';

const Logo = ({ collapsed = false }) => {
  return (
    <div className={`flex items-center gap-2.5 transition-all duration-200 ${collapsed ? 'justify-center w-full' : ''}`}>
      {/* Official Karobar logo icon */}
      <div className={`
        shrink-0 flex items-center justify-center
        ${collapsed ? 'w-8 h-8' : 'w-7 h-7'}
      `}>
        <img
          src={logoImg}
          alt="Karobar"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Brand Name - Hidden when collapsed */}
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold text-app-text tracking-tight leading-none">
            Karobar
          </span>
          <span className="text-micro font-medium text-app-text-muted uppercase tracking-wider mt-0.5">
            Business OS
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
