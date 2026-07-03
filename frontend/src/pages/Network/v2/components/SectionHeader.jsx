import React from 'react';
import { TYPOGRAPHY, BUTTONS } from '../utils/networkConstants';

/**
 * Standardized header for the network pages.
 * 
 * @param {Object} props
 * @param {string} props.title - Main page title
 * @param {string} props.subtitle - Page description
 * @param {React.ElementType} props.icon - Lucide icon
 * @param {React.ReactNode} [props.action] - Optional action button area
 */
export default function SectionHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/20" aria-hidden="true">
            <Icon size={16} className="text-white" />
          </div>
          <h1 className={TYPOGRAPHY.pageTitle}>{title}</h1>
        </div>
        <p className={TYPOGRAPHY.pageSubtitle}>
          {subtitle}
        </p>
      </div>
      {action && (
        <div className="flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
