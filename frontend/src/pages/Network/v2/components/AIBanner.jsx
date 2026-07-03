import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * A reusable AI insight banner for the Network module.
 * @param {Object} props
 * @param {string} props.message - The main message to display
 * @param {string} [props.type='default'] - Visual variant (default, warning, success)
 */
export default function AIBanner({ message, type = 'default' }) {
  if (!message) return null;

  const styles = {
    default: 'from-indigo-50 to-violet-50 border-indigo-100 text-indigo-900 icon-text-indigo-500',
    warning: 'from-amber-50 to-orange-50 border-amber-100 text-amber-900 icon-text-amber-500',
    success: 'from-emerald-50 to-teal-50 border-emerald-100 text-emerald-900 icon-text-emerald-500',
  };

  const selectedStyle = styles[type] || styles.default;
  
  // Extract icon color class from string to apply to the icon
  const iconColor = selectedStyle.match(/icon-(text-[a-z]+-\d+)/)[1];
  const bgClasses = selectedStyle.replace(/icon-text-[a-z]+-\d+/, '').trim();

  return (
    <div 
      className={`bg-gradient-to-r border rounded-2xl p-4 flex items-start sm:items-center gap-3 transition-opacity duration-300 ${bgClasses}`}
      role="region"
      aria-live="polite"
      aria-label="AI Insight"
    >
      <Sparkles size={18} className={`${iconColor} shrink-0 mt-0.5 sm:mt-0`} aria-hidden="true" />
      <p className="text-xs font-bold leading-relaxed">{message}</p>
    </div>
  );
}
