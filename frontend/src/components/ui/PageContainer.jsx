import React from 'react';
import Breadcrumbs from './Breadcrumbs';

export function PageContainer({
  title,
  description,
  breadcrumbs,
  actions,
  kpis,
  filters,
  children,
  footer,
  className = '',
  maxWidth = 'max-w-7xl',
  noPadding = false,
}) {
  return (
    <div className={`w-full mx-auto animate-fade-in ${maxWidth} ${noPadding ? '' : 'p-4 sm:p-6 lg:p-8'} space-y-6 ${className}`}>
      {/* 1. Header & Breadcrumb Zone */}
      {(title || breadcrumbs || actions) && (
        <div className="flex flex-col gap-3">
          {breadcrumbs !== false && <Breadcrumbs items={breadcrumbs} />}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              {title && (
                <h1 className="text-page-title font-semibold text-app-text tracking-tight flex items-center gap-2.5">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-small text-app-text-secondary">
                  {description}
                </p>
              )}
            </div>

            {actions && (
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Summary / KPIs Zone */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis}
        </div>
      )}

      {/* 3. Filters / Search Zone */}
      {filters && (
        <div className="w-full">
          {filters}
        </div>
      )}

      {/* 4. Main Content Zone */}
      <div className="w-full">
        {children}
      </div>

      {/* 5. Pagination / Footer Zone */}
      {footer && (
        <div className="w-full pt-2">
          {footer}
        </div>
      )}
    </div>
  );
}

export default PageContainer;
