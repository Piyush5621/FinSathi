import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load data. Please check your connection and try again.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-card border border-app-danger/20 bg-app-danger-subtle/30 ${className}`}>
      <div className="w-12 h-12 rounded-panel bg-app-danger-subtle text-app-danger flex items-center justify-center mb-4">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-card-heading text-app-text font-semibold mb-1.5">{title}</h3>
      <p className="text-small text-app-text-secondary max-w-md mb-5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          icon={<RefreshCw size={14} />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
