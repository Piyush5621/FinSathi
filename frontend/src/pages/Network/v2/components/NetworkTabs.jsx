import React, { useRef, useEffect } from 'react';

/**
 * Accessible, horizontally scrollable tab navigation.
 * 
 * @param {Object} props
 * @param {Array} props.tabs - Array of tab objects: { id, label, icon: Icon, count, color }
 * @param {string} props.activeTab - The currently active tab id
 * @param {Function} props.onChange - Callback when a tab is clicked (id) => void
 * @param {string} [props.variant='default'] - 'default' (solid bg) or 'outline' (border styles)
 */
export default function NetworkTabs({ tabs, activeTab, onChange, variant = 'default' }) {
  const containerRef = useRef(null);

  // Auto-scroll active tab into view on mount or change
  useEffect(() => {
    if (containerRef.current) {
      const activeElement = containerRef.current.querySelector('[aria-selected="true"]');
      if (activeElement) {
        // Scroll into view with slight padding
        const container = containerRef.current;
        const scrollLeft = activeElement.offsetLeft - (container.offsetWidth / 2) + (activeElement.offsetWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeTab]);

  const handleKeyDown = (e, index) => {
    let nextIndex = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    }
    
    if (nextIndex !== null) {
      e.preventDefault();
      const tabElements = containerRef.current.querySelectorAll('[role="tab"]');
      if (tabElements[nextIndex]) {
        tabElements[nextIndex].focus();
        // Option: Automatically activate on focus, or wait for Enter/Space. We'll wait for Enter/Space.
      }
    }
  };

  if (variant === 'outline') {
    return (
      <div 
        ref={containerRef}
        role="tablist" 
        aria-label="Network Sections"
        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                isActive
                  ? `bg-${tab.color || 'indigo'}-50 text-${tab.color || 'indigo'}-700 border-${tab.color || 'indigo'}-200 shadow-sm`
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {Icon && <Icon size={14} className={isActive ? `text-${tab.color || 'indigo'}-600` : 'text-slate-400'} aria-hidden="true" />}
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  isActive ? `bg-${tab.color || 'indigo'}-200 text-${tab.color || 'indigo'}-800` : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default solid background variant
  return (
    <div 
      ref={containerRef}
      role="tablist" 
      aria-label="Network Sections"
      className="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar"
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isActive
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {Icon && <Icon size={14} aria-hidden="true" />}
            <span className="hidden sm:inline-block">{tab.label}</span>
            {/* On very small screens, keep label if it's active, otherwise hide */}
            <span className={`sm:hidden ${isActive ? 'inline-block' : 'hidden'}`}>{tab.label}</span>
            
            {tab.count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1 ${
                isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
