import React from 'react';
import { Link } from 'react-router-dom';
import { BUTTONS, TYPOGRAPHY } from '../utils/networkConstants';

/**
 * Standardized empty state component.
 * 
 * @param {Object} props
 * @param {React.ElementType} props.icon - Lucide icon component
 * @param {string} props.title - Primary text
 * @param {string} props.description - Secondary text
 * @param {string} [props.actionLabel] - Label for the primary CTA button
 * @param {string} [props.actionTo] - Route to navigate to if using a Link
 * @param {Function} [props.onAction] - Callback if it's a button click instead of Link
 */
export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 bg-slate-50 rounded-2xl mb-4 text-slate-300 ring-1 ring-slate-100">
        <Icon size={32} aria-hidden="true" />
      </div>
      <h3 className={`${TYPOGRAPHY.cardTitle} mb-1`}>{title}</h3>
      <p className={`${TYPOGRAPHY.body} max-w-md mx-auto mb-6`}>{description}</p>
      
      {actionLabel && (
        actionTo ? (
          <Link to={actionTo} className={BUTTONS.primary}>
            {actionLabel}
          </Link>
        ) : (
          <button onClick={onAction} className={BUTTONS.primary}>
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}
