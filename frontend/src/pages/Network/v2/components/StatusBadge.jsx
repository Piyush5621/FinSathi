import React from 'react';
import { STATUS_STYLES, TYPOGRAPHY } from '../utils/networkConstants';

/**
 * Standardized status badge based on design system tokens.
 * 
 * @param {Object} props
 * @param {string} props.status - e.g. 'Pending', 'Imported', 'Verified'
 * @param {string} [props.className] - Additional classes
 */
export default function StatusBadge({ status, className = '' }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  
  return (
    <span 
      className={`${TYPOGRAPHY.badge} ${style} ${className}`}
      role="status"
    >
      {status}
    </span>
  );
}
